FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if any are needed (e.g., for SQLite)
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port the app runs on (usually 8000 for uvicorn, but can be overridden)
EXPOSE 8000

# Command to run the application (production settings without reload)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
