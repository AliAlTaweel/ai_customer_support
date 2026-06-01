import os
import json
import logging
from langchain_community.vectorstores import FAISS
from langchain_core.embeddings import Embeddings
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)

_vector_store = None
_embeddings = None

class GeminiEmbeddings(Embeddings):
    def __init__(self, model_name: str = "models/gemini-embedding-2"):
        self.model_name = model_name
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        embeddings = []
        for text in texts:
            response = genai.embed_content(
                model=self.model_name,
                content=text,
                task_type="retrieval_document"
            )
            embeddings.append(response["embedding"])
        return embeddings

    def embed_query(self, text: str) -> list[float]:
        response = genai.embed_content(
            model=self.model_name,
            content=text,
            task_type="retrieval_query"
        )
        return response["embedding"]

# ── S3 helpers ──────────────────────────────────────────────────────────────

def _s3_client():
    """Return a boto3 S3 client using env credentials (local dev) or IAM role (AWS)."""
    try:
        import boto3
        from botocore.config import Config

        kwargs = {"region_name": settings.AWS_REGION}
        if getattr(settings, "AWS_S3_ENDPOINT_URL", None):
            kwargs["endpoint_url"] = settings.AWS_S3_ENDPOINT_URL
            kwargs["config"] = Config(s3={'addressing_style': 'path'})
        return boto3.client("s3", **kwargs)
    except Exception as e:
        logger.warning(f"Could not create S3 client: {e}")
        return None


def _download_index_from_s3() -> bool:
    """Download the FAISS index folder from S3. Returns True on success."""
    if not settings.FAISS_S3_BUCKET:
        return False

    s3 = _s3_client()
    if s3 is None:
        return False

    try:
        prefix = settings.FAISS_S3_KEY  # e.g. "faq_index/"
        local_path = settings.INDEX_SAVE_PATH

        # List objects under the prefix
        response = s3.list_objects_v2(Bucket=settings.FAISS_S3_BUCKET, Prefix=prefix)
        objects = response.get("Contents", [])
        if not objects:
            logger.info("No FAISS index found in S3 — will build from scratch.")
            return False

        os.makedirs(local_path, exist_ok=True)
        for obj in objects:
            key = obj["Key"]
            filename = os.path.basename(key)
            if not filename:
                continue
            dest = os.path.join(local_path, filename)
            s3.download_file(settings.FAISS_S3_BUCKET, key, dest)
            logger.info(f"Downloaded s3://{settings.FAISS_S3_BUCKET}/{key} → {dest}")

        logger.info("✅ FAISS index downloaded from S3 successfully.")
        return True

    except Exception as e:
        logger.error(f"Failed to download FAISS index from S3: {e}")
        return False


def _upload_index_to_s3():
    """Upload the local FAISS index folder to S3."""
    if not settings.FAISS_S3_BUCKET:
        return

    s3 = _s3_client()
    if s3 is None:
        return

    try:
        local_path = settings.INDEX_SAVE_PATH
        prefix = settings.FAISS_S3_KEY  # e.g. "faq_index/"

        for filename in os.listdir(local_path):
            local_file = os.path.join(local_path, filename)
            s3_key = f"{prefix}{filename}"
            s3.upload_file(local_file, settings.FAISS_S3_BUCKET, s3_key)
            logger.info(f"Uploaded {local_file} → s3://{settings.FAISS_S3_BUCKET}/{s3_key}")

        logger.info("✅ FAISS index uploaded to S3 successfully.")

    except Exception as e:
        logger.error(f"Failed to upload FAISS index to S3: {e}")


# ── Vector store initialisation ──────────────────────────────────────────────

def get_vector_store():
    global _vector_store, _embeddings
    if _vector_store is not None:
        return _vector_store

    try:
        if _embeddings is None:
            logger.info("Initializing custom GeminiEmbeddings...")
            _embeddings = GeminiEmbeddings()
        
        embeddings = _embeddings
        local_path = settings.INDEX_SAVE_PATH

        # 1️⃣  Try local cache first (already downloaded this session)
        if os.path.exists(local_path) and os.path.exists(os.path.join(local_path, "index.faiss")):
            logger.info(f"Loading FAISS index from local cache: {local_path}")
            _vector_store = FAISS.load_local(
                local_path, embeddings, allow_dangerous_deserialization=True
            )
            return _vector_store

        # 2️⃣  Try downloading from S3
        if _download_index_from_s3():
            _vector_store = FAISS.load_local(
                local_path, embeddings, allow_dangerous_deserialization=True
            )
            return _vector_store

        # 3️⃣  Build from Database and upload to S3
        logger.info("Building FAISS index from FAQ table in database...")
        from sqlalchemy import text
        from app.tools.base import engine as db_engine
        
        with db_engine.connect() as conn:
            result = conn.execute(text('SELECT question, answer FROM "FAQ"'))
            faq_rows = result.fetchall()
        
        if not faq_rows:
            logger.warning("FAQ table is empty! Falling back to faq.json if available...")
            if os.path.exists(settings.FAQ_DATA_PATH):
                with open(settings.FAQ_DATA_PATH, "r") as f:
                    faq_data = json.load(f)
                texts = [f"Question: {item['question']}\nAnswer: {item['answer']}" for item in faq_data]
            else:
                logger.error("No FAQ data found in DB or JSON.")
                return None
        else:
            texts = [
                f"Question: {row[0]}\nAnswer: {row[1]}"
                for row in faq_rows
            ]
        
        _vector_store = FAISS.from_texts(texts, embeddings)
        _vector_store.save_local(local_path)
        logger.info(f"FAISS index saved locally at {local_path}")

        # Upload to S3
        _upload_index_to_s3()

    except Exception as e:
        logger.error(f"Error initialising FAQ vector store: {e}")
        return None

    return _vector_store


# ── Tool ─────────────────────────────────────────────────────────────────────

def get_company_faq(question: str) -> str:
    """
    Retrieve general company information, shipping policies, and return policies using RAG.
    
    Args:
        question: The user's specific policy or FAQ question.
    """
    from app.core.auth import CURRENT_ORG_ID
    from app.tools.base import engine as db_engine
    from sqlalchemy import text
    
    org_id = CURRENT_ORG_ID.get()
    
    if org_id:
        logger.info(f"Performing multi-tenant RAG search for org_id: {org_id}")
        try:
            with db_engine.connect() as conn:
                # 1. Resolve Clerk Org ID to Database Tenant UUID
                result = conn.execute(
                    text('SELECT id FROM "Tenant" WHERE "clerkOrgId" = :clerk_org_id'),
                    {"clerk_org_id": org_id}
                )
                row = result.fetchone()
                if row:
                    tenant_id = row[0]
                    
                    # 2. Generate search query embedding
                    embeddings_service = GeminiEmbeddings()
                    query_vector = embeddings_service.embed_query(question)
                    vec_str = f"[{','.join(map(str, query_vector))}]"
                    
                    # 3. Perform cosine similarity vector search
                    res = conn.execute(
                        text('SELECT text, embedding <=> CAST(:query_vector AS vector) AS distance FROM "FAQEmbedding" WHERE "tenantId" = :tenant_id ORDER BY distance ASC LIMIT 2'),
                        {"tenant_id": tenant_id, "query_vector": vec_str}
                    )
                    rows = res.fetchall()
                    
                    if rows:
                        formatted_results = [
                            f"--- KNOWLEDGE SOURCE {i} ---\n{r[0]}"
                            for i, r in enumerate(rows, 1)
                        ]
                        logger.info(f"Found {len(rows)} matching tenant-specific FAQs.")
                        return "\n\n".join(formatted_results)
                    else:
                        logger.info("No tenant-specific FAQ embeddings found in database. Falling back to default FAQs.")
                else:
                    logger.info("Tenant not found in database. Falling back to default FAQs.")
        except Exception as e:
            logger.error(f"Error doing pgvector search: {e}. Falling back to default FAQs.")
            
    # Fallback to local FAISS index
    logger.info("Performing fallback static FAISS index search.")
    vs = get_vector_store()
    if vs is None:
        return "I'm sorry, I'm having trouble accessing the company policy database right now."

    try:
        results = vs.similarity_search(question, k=2)
        if not results:
            return "I couldn't find any specific information regarding your question in our company policy."

        formatted_results = [
            f"--- KNOWLEDGE SOURCE {i} ---\n{r.page_content}"
            for i, r in enumerate(results, 1)
        ]
        return "\n\n".join(formatted_results)

    except Exception as e:
        logger.error(f"Error searching FAQ: {e}")
        return "Error searching company policies."
