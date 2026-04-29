import os
import json
import logging
import shutil
from crewai.tools import tool
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.core.config import settings

logger = logging.getLogger(__name__)

_vector_store = None
_embeddings = None

# ── S3 helpers ──────────────────────────────────────────────────────────────

def _s3_client():
    """Return a boto3 S3 client using env credentials (local dev) or IAM role (AWS)."""
    try:
        import boto3
        return boto3.client("s3", region_name=settings.AWS_REGION)
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
            logger.info("Initializing HuggingFaceEmbeddings...")
            _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        embeddings = _embeddings
        local_path = settings.INDEX_SAVE_PATH

        # 1️⃣  Try local cache first (already downloaded this session)
        if os.path.exists(local_path):
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

        # 3️⃣  Build from faq.json and upload to S3
        if not os.path.exists(settings.FAQ_DATA_PATH):
            logger.error(f"FAQ data file not found at {settings.FAQ_DATA_PATH}")
            return None

        logger.info("Building FAISS index from FAQ data...")
        with open(settings.FAQ_DATA_PATH, "r") as f:
            faq_data = json.load(f)

        texts = [
            f"Question: {item['question']}\nAnswer: {item['answer']}"
            for item in faq_data
        ]
        _vector_store = FAISS.from_texts(texts, embeddings)
        _vector_store.save_local(local_path)
        logger.info(f"FAISS index saved locally at {local_path}")

        # Upload to S3 so future restarts skip the build step
        _upload_index_to_s3()

    except Exception as e:
        logger.error(f"Error initialising FAQ vector store: {e}")
        return None

    return _vector_store


# ── Tool ─────────────────────────────────────────────────────────────────────

def get_company_faq_fn(question: str):
    """Retrieve general company information, shipping policies, and return policies using RAG."""
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


@tool("get_company_faq")
def get_company_faq(question: str):
    """Retrieve general company information, shipping policies, and return policies using RAG."""
    return get_company_faq_fn(question)
