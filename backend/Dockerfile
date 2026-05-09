FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Download small spacy model
RUN python -m spacy download en_core_web_sm

# Copy application code
COPY . .

# Create directory for local data/logs
RUN mkdir -p /app/data /app/logs && chmod -R 777 /app/data /app/logs

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=3001 \
    PYTHONPATH=/app

# Expose the application port
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Create a non-root user and switch to it
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Run the application with gunicorn for production
CMD ["gunicorn", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:3001", "--timeout", "120"]
