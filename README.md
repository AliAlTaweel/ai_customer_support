# Luxe E-Commerce & AI Customer Support Assistant

This project is a complete, modern e-commerce platform integrated with an advanced, multi-agent AI customer support system. It aims to provide a seamless shopping experience backed by intelligent, responsive, and action-oriented AI support.

## Project Architecture

The project is split into two main directories, separating the user-facing web application from the heavy AI processing backend:

### 1. Frontend (`/frontend`)
The frontend is a modern web application built with **Next.js**, **React**, and **TypeScript**. 
- **User Interface**: Features a premium "Luxe" aesthetic for browsing products, managing a cart, and completing checkout.
- **Database**: Uses **Prisma** ORM with a SQLite database (`dev.db`) to manage Products, Orders, and Order Items.
- **AI Integration**: Hosts the chat interface where users interact with the Support Assistant, communicating with the backend via REST API.

### 2. Backend (`/backend`)
The backend is a high-performance Python server powered by **FastAPI** and **CrewAI**.
- **Multi-Agent System**: Utilizes a hierarchical CrewAI architecture with specialized agents (Manager, Sales, Orders, Policy) to handle complex customer queries without hallucination.
- **Local LLMs**: Powered by local AI models via **Ollama**, ensuring privacy and zero API costs. It uses `llama3.1:8b` for management tasks and `gemma4:e4b` for specialized worker tasks.
- **Tool Integration**: Agents have direct access to read and write to the frontend's SQLite database (via SQLAlchemy) to search products, place orders, check statuses, and cancel orders.
- **Knowledge Base (RAG)**: Uses FAISS and HuggingFace embeddings to search the `/FAQ/faq.json` file for accurate company policy answers.

## Getting Started

To run this project locally, you will need to start both the frontend and backend servers.

1. **Start the Database & Frontend**: 
   Navigate to the `frontend` directory, ensure dependencies are installed, and run the Next.js dev server.
2. **Start the AI Backend**: 
   Navigate to the `backend` directory, activate the Python virtual environment (`venv_v3`), ensure Ollama is running with the required models, and run `python main.py`.

*Please see the respective `README.md` files in the `/frontend` and `/backend` directories for specific setup instructions.*
