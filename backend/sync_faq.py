import os
import json
import logging
import sys
import shutil

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def sync_faq():
    """Force rebuilds the FAISS index from faq.json and uploads it to S3."""
    logger.info("Starting FAQ sync to AWS...")
    
    # 1. Initialize Embeddings
    logger.info("Initializing Embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
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
        logger.info(f"Cleaning up old local index at {local_path}...")
        shutil.rmtree(local_path)
    os.makedirs(local_path, exist_ok=True)
    
    vector_store.save_local(local_path)
    logger.info(f"FAISS index saved locally at {local_path}")
    
    # 5. Upload to S3
    if not settings.FAISS_S3_BUCKET:
        logger.warning("FAISS_S3_BUCKET not set in .env. Skipping S3 upload.")
        return

    try:
        import boto3
        s3 = boto3.client("s3", region_name=settings.AWS_REGION)
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
