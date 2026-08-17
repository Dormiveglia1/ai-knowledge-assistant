# AI Knowledge Assistant

A full-stack, RAG-powered knowledge-base assistant for uploading PDF documents and answering questions using retrieved, traceable source context.

**Live Demo:** [https://ai-knowledge-assistant-web.onrender.com](https://ai-knowledge-assistant-web.onrender.com)

## Highlights

- PDF ingestion, bilingual text chunking, and ChromaDB vector search
- Document-scoped or global retrieval with source snippets and similarity scores
- React workspace with authentication, document management, and chat history
- FastAPI backend supporting local Ollama and cloud OpenAI-compatible models

## RAG Workspace

The workspace below shows a document-scoped question-answering session and the source snippets used to ground the response.

![RAG Workspace — answer with traceable source snippets](assets/screenshots/rag-workspace.png)

## Tech Stack

| Technology | Usage in this project |
| --- | --- |
| React 19 + Vite | Single-page RAG workspace, authentication UI, document selection, and chat interaction |
| Axios | HTTP client for authentication, PDF upload, document management, and chat APIs |
| FastAPI + Pydantic | Python REST API, request validation, file handling, and service health checks |
| PyPDF | Text extraction from multi-page PDF documents |
| ChromaDB | Persistent vector store, semantic similarity retrieval, and document-source filtering |
| OpenAI SDK | OpenAI-compatible client for GPT-4o-mini generation and `text-embedding-3-small` embeddings |
| Ollama | Local Llama 3 inference option for offline/local development |
| SQLite + JWT | Local user storage, password hashing, login, and bearer-token authentication |
| Docker Compose + Nginx | Containerized local deployment and production static frontend hosting |
| Render | Hosted static React frontend and FastAPI API deployment |

## Project Structure

```text
ai-knowledge-assistant/
├── frontend/                    # React/Vite client application
│   ├── src/
│   │   ├── components/           # Workspace, chat input, and chat console components
│   │   └── App.jsx               # Application state and API interaction
│   └── .env.example              # Frontend API URL configuration example
├── backend/                     # FastAPI RAG service
│   ├── main.py                   # API routes, upload flow, chat flow, and authentication
│   ├── ingestion.py              # PDF extraction and bilingual chunking
│   ├── vector_store.py           # ChromaDB indexing and semantic search
│   ├── llm_service.py            # Local Ollama / cloud LLM switching
│   ├── auth_service.py           # Password hashing and JWT utilities
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Backend local configuration example
├── assets/screenshots/           # README images
├── docker-compose.yml            # Local container orchestration
└── render.yaml                   # Render deployment blueprint
```

## Run Locally

### Prerequisites

- Node.js 20+
- Python 3.11+
- [Ollama](https://ollama.com/) for local LLM inference

### 1. Start Ollama

```powershell
ollama serve
```

In a separate terminal, download the model once:

```powershell
ollama pull llama3:8b
```

### 2. Configure and start the backend

Create `backend/.env` from `backend/.env.example` and keep `AI_MODE=LOCAL`:

```env
AI_MODE=LOCAL
OLLAMA_BASE_URL=http://localhost:11434/v1
JWT_SECRET=replace-with-a-local-secret
CORS_ORIGINS=http://localhost:5173
```

Then run:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Start the frontend

In a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Local uploads, vector data, and user accounts are saved under `backend/uploaded_files`, `backend/chroma_db`, and `backend/users.db`.

## Deploy Online with Render

The repository includes `render.yaml`, which creates two public services:

1. `ai-knowledge-assistant-api`: a free FastAPI web service.
2. `ai-knowledge-assistant-web`: a static React site.

### Deployment steps

1. Push the repository to GitHub.
2. In Render, select **New → Blueprint** and choose this repository.
3. Keep the Blueprint path as `render.yaml` and create the Blueprint.
4. In the API service's **Environment** page, add `CLOUD_API_KEY` as a secret with an API key that has available OpenAI billing/credits.
5. Set `AI_MODE=CLOUD`, then deploy the API service and wait for the health check to succeed.
6. Deploy the static frontend. Render injects the API URL into `VITE_API_BASE_URL` at build time.

The Render free API instance can spin down during inactivity and has ephemeral storage. Uploaded PDFs, ChromaDB indexes, and SQLite account data can be cleared after restarts or redeployments. Use a persistent disk or managed storage for production data retention.
