import os
import json
import logging
import sys
import shutil

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from langchain_community.vectorstores import FAISS
from app.tools.faq_tools import GeminiEmbeddings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def sync_faq():
    """Force rebuilds the FAISS index from faq.json and uploads it to S3."""
    logger.info("Starting FAQ sync to AWS...")
    
    # 1. Initialize Embeddings
    logger.info("Initializing Embeddings...")
    embeddings = GeminiEmbeddings()
    
    # 2. Load FAQ Data
    faq_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../FAQ/faq.json"))
    if not os.path.exists(faq_path):
        logger.error(f"FAQ data file not found at {faq_path}")
        return

    logger.info(f"Loading FAQ data from {faq_path}...")
    with open(faq_path, "r") as f:
        faq_data = json.load(f)

    texts = [
        f"Question: {item['question']}\nAnswer: {item['answer']}"
        for item in faq_data
    ]
    
    # 3. Build Vector Store
    logger.info("Building FAISS index (this may take a minute)...")
    vector_store = FAISS.from_texts(texts, embeddings)
    
    # 4. Save Locally
    local_path = settings.INDEX_SAVE_PATH
    if os.path.exists(local_path):
        logger.info(f"Cleaning up old local index files at {local_path}...")
        for filename in os.listdir(local_path):
            file_path = os.path.join(local_path, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                logger.warning(f"Failed to delete {file_path}: {e}")
    os.makedirs(local_path, exist_ok=True)
    
    vector_store.save_local(local_path)
    logger.info(f"FAISS index saved locally at {local_path}")
    
    # 5. Upload to S3
    if not settings.FAISS_S3_BUCKET:
        logger.warning("FAISS_S3_BUCKET not set in .env. Skipping S3 upload.")
        return

    try:
        import boto3
        from botocore.config import Config

        kwargs = {"region_name": settings.AWS_REGION}
        if getattr(settings, "AWS_S3_ENDPOINT_URL", None):
            kwargs["endpoint_url"] = settings.AWS_S3_ENDPOINT_URL
            kwargs["config"] = Config(s3={'addressing_style': 'path'})
        s3 = boto3.client("s3", **kwargs)
        prefix = settings.FAISS_S3_KEY
        
        logger.info(f"Uploading to S3 bucket: {settings.FAISS_S3_BUCKET}...")
        for filename in os.listdir(local_path):
            local_file = os.path.join(local_path, filename)
            s3_key = f"{prefix}{filename}"
            s3.upload_file(local_file, settings.FAISS_S3_BUCKET, s3_key)
            logger.info(f"Uploaded {filename} to s3://{settings.FAISS_S3_BUCKET}/{s3_key}")
            
        logger.info("✅ FAQ sync to AWS completed successfully!")
    except Exception as e:
        logger.error(f"Failed to upload to S3: {e}")

if __name__ == "__main__":
    sync_faq()
