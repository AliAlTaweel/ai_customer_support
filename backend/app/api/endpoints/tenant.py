from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from app.core.auth import get_current_user, UserContext
from app.core.config import settings
from app.tools.base import engine
from app.tools.faq_tools import GeminiEmbeddings
from sqlalchemy import text
import uuid
import logging
import io
import csv

logger = logging.getLogger(__name__)
router = APIRouter()

def get_or_create_tenant(connection, clerk_org_id: str, name: str) -> str:
    """Ensure the tenant exists in the database and return its UUID."""
    result = connection.execute(
        text('SELECT id FROM "Tenant" WHERE "clerkOrgId" = :clerk_org_id'),
        {"clerk_org_id": clerk_org_id}
    )
    row = result.fetchone()
    if row:
        return row[0]
    
    tenant_id = str(uuid.uuid4())
    connection.execute(
        text('INSERT INTO "Tenant" (id, "clerkOrgId", name, "createdAt", "updatedAt") VALUES (:id, :clerk_org_id, :name, NOW(), NOW())'),
        {"id": tenant_id, "clerk_org_id": clerk_org_id, "name": name}
    )
    return tenant_id

def chunk_text(text_content: str, max_chunk_len: int = 1000) -> list[str]:
    """Simple text chunker by paragraphs or max characters."""
    paragraphs = text_content.split("\n\n")
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(current_chunk) + len(para) + 2 > max_chunk_len:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            if current_chunk:
                current_chunk += "\n\n" + para
            else:
                current_chunk = para
                
    if current_chunk:
        chunks.append(current_chunk.strip())
        
    # If any chunk is still larger than max_chunk_len, split it by lines or characters
    final_chunks = []
    for chunk in chunks:
        if len(chunk) > max_chunk_len:
            # Fallback character-based split
            for i in range(0, len(chunk), max_chunk_len):
                final_chunks.append(chunk[i:i+max_chunk_len])
        else:
            final_chunks.append(chunk)
            
    return final_chunks

@router.post("/faq/upload", status_code=status.HTTP_201_CREATED)
async def upload_faq(
    file: UploadFile = File(...),
    current_user: UserContext = Depends(get_current_user)
):
    """
    Upload an FAQ file (Markdown, CSV, Text, or PDF) for the tenant.
    Parses content, generates text embeddings using Gemini, and saves them to pgvector.
    """
    if not current_user.is_authenticated or not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication within an organization is required to upload FAQs."
        )

    content = await file.read()
    filename = file.filename.lower()
    text_content = ""
    
    try:
        if filename.endswith(".csv"):
            csv_reader = csv.reader(io.StringIO(content.decode("utf-8")))
            rows = []
            for row in csv_reader:
                if len(row) >= 2:
                    rows.append(f"Question: {row[0]}\nAnswer: {row[1]}")
                elif len(row) == 1:
                    rows.append(row[0])
            text_content = "\n\n".join(rows)
            
        elif filename.endswith(".pdf"):
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                pages = [page.extract_text() for page in pdf.pages if page.extract_text()]
                text_content = "\n\n".join(pages)
                
        else: # Default as text/markdown
            text_content = content.decode("utf-8")
            
    except Exception as e:
        logger.error(f"Error parsing file {filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse uploaded file: {str(e)}"
        )
        
    if not text_content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file contains no text."
        )
        
    # Generate chunks
    chunks = chunk_text(text_content)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid text chunks could be extracted from the file."
        )
        
    try:
        # Generate embeddings
        embeddings_service = GeminiEmbeddings()
        embedded_chunks = embeddings_service.embed_documents(chunks)
        
        # Save to database
        with engine.begin() as connection:
            # 1. Get or create Tenant row
            org_name = current_user.full_name or f"Org {current_user.org_id[:8]}"
            tenant_id = get_or_create_tenant(connection, current_user.org_id, org_name)
            
            # 2. Insert embeddings
            for chunk, vec in zip(chunks, embedded_chunks):
                chunk_id = str(uuid.uuid4())
                # Format embedding as pgvector string representation: '[x1, x2, ...]'
                vec_str = f"[{','.join(map(str, vec))}]"
                
                connection.execute(
                    text('INSERT INTO "FAQEmbedding" (id, "tenantId", text, embedding, "createdAt", "updatedAt") VALUES (:id, :tenant_id, :text, CAST(:embedding AS vector), NOW(), NOW())'),
                    {
                        "id": chunk_id,
                        "tenant_id": tenant_id,
                        "text": chunk,
                        "embedding": vec_str
                    }
                )
                
        return {
            "status": "success",
            "message": f"Successfully processed and stored {len(chunks)} FAQ chunks."
        }
        
    except Exception as e:
        logger.error(f"Error generating or saving embeddings for tenant {current_user.org_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process and store FAQ: {str(e)}"
        )

@router.get("/faq")
async def get_faq_list(current_user: UserContext = Depends(get_current_user)):
    """Retrieve all stored FAQ chunks for the tenant."""
    if not current_user.is_authenticated or not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required."
        )
        
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text('SELECT f.id, f.text, f."createdAt" FROM "FAQEmbedding" f JOIN "Tenant" t ON f."tenantId" = t.id WHERE t."clerkOrgId" = :clerk_org_id'),
                {"clerk_org_id": current_user.org_id}
            )
            faqs = [dict(row._mapping) for row in result]
            return {"faqs": faqs}
    except Exception as e:
        logger.error(f"Error fetching FAQs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/faq", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faq(current_user: UserContext = Depends(get_current_user)):
    """Delete all FAQ data for the tenant."""
    if not current_user.is_authenticated or not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required."
        )
        
    try:
        with engine.begin() as connection:
            # Find tenant
            result = connection.execute(
                text('SELECT id FROM "Tenant" WHERE "clerkOrgId" = :clerk_org_id'),
                {"clerk_org_id": current_user.org_id}
            )
            row = result.fetchone()
            if row:
                tenant_id = row[0]
                connection.execute(
                    text('DELETE FROM "FAQEmbedding" WHERE "tenantId" = :tenant_id'),
                    {"tenant_id": tenant_id}
                )
        return None
    except Exception as e:
        logger.error(f"Error deleting FAQs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
