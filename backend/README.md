# Luxe AI Support Backend

This directory contains the AI processing engine for the Luxe customer support assistant. It uses a multi-agent architecture to handle complex customer intents accurately and reliably.

## Tech Stack
- **Framework**: FastAPI (served via Uvicorn)
- **Agent Framework**: CrewAI
- **LLM Provider**: Ollama (Local)
- **Database Access**: SQLAlchemy (Connecting to the frontend's SQLite `dev.db`)
- **Vector Search (RAG)**: Langchain, FAISS, HuggingFace Embeddings

## Multi-Agent Architecture
To prevent hallucinations and improve efficiency, the AI operates as a team of specialized agents:
1. **Support Team Manager** (`llama3.1:8b`): Analyzes the customer's intent and delegates the task to the appropriate specialist.
2. **Sales & Product Specialist** (`gemma4:e4b`): Has access to `search_products` and `place_order` tools.
3. **Order Management Specialist** (`gemma4:e4b`): Has access to `get_order_details` and `cancel_order` tools.
4. **Company Policy Specialist** (`gemma4:e4b`): Has access to the `get_company_faq` tool, which uses RAG to query the `FAQ/faq.json` file.

*Note: The worker agents use the `gemma4:e4b` model to ensure the system remains stable and responsive on standard hardware, avoiding resource exhaustion issues.*

## Setup & Running

### Prerequisites
- Python 3.12+
- [Ollama](https://ollama.com/) installed and running locally.

### Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   ```bash
   source venv_v3/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Pull the required local LLMs via Ollama:
   ```bash
   ollama pull llama3.1:8b
   ollama pull gemma4:e4b
   ```

### Running the Server
Start the FastAPI backend server:
```bash
python main.py
```
The server will run on `http://localhost:3001`. The frontend communicates with the `/chat` endpoint to initiate the CrewAI process.

## Tools (`tools.py`)
The agents execute real actions via Python functions that connect directly to the SQLite database. 
- **place_order**: Validates stock, calculates totals, creates `Order` and `OrderItem` records, and decrements product stock.
- **cancel_order**: Updates the status of an order to 'CANCELLED', provided it is still 'PENDING'.
