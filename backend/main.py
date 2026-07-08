import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingestion import DocumentIngestor
from vector_store import VectorStoreManager
from llm_service import LLMService

app = FastAPI(title="AI Knowledge Assistant API")

# Allow cross-domain requests (CORS), facilitating subsequent access by the front-end React (default port 5173) to the back-end (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # The development stage allows all sources, while the production environment requires restrictions.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the slice tool
ingestor = DocumentIngestor(chunk_size=600, chunk_overlap=120)
v_store = VectorStoreManager()  # By default, the "chroma_db" folder will be created in the current directory.
ai_engine = LLMService()

# Create a temporary directory for uploading files
UPLOAD_DIR = "./uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ChatRequest(BaseModel):
    query: str
    current_file: str = None

@app.get("/")
def read_root():
    """Test the interface to verify whether the server is alive"""
    return {"status": "online", "message": "Welcome to AI Knowledge Assistant Backend!"}


@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Document upload and slicing core interface
    """
    # 1. Strictly verify the file format and only allow PDF.
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF format files are supported for upload!")
    
    try:
        # 2. Safely save the binary stream transmitted from the front end to the local hard drive
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        # 3. Invoke our ingestion module to start working
        raw_text = ingestor.extract_text_from_pdf(file_path)
        chunks = ingestor.split_to_chunks(raw_text)
        
        #  Directly insert the cut fragments into the local vector database
        v_store.add_chunks(chunks, source_name=file.filename)

        # 4. Return the processing result to the front end.
        return {
            "filename": file.filename,
            "status": "success",
            "total_characters": len(raw_text),
            "total_chunks": len(chunks),
            "message": f"Successfully injected {len(chunks)} slices safely into the local vector knowledge base!",
            "preview_chunks": chunks[:3]  # First, show the first three slices to the front end to see the effect.
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

@app.post("/api/chat")
async def chat_with_knowledge_base(request: ChatRequest):
    """
    🔥AI Intelligent Question Answering Based on Local Vector Database Retrieval (RAG)
    """
    user_query = request.query
    target_file = request.current_file
    
    try:
        # Step 1: Retrieval - First, take the user's question and retrieve the three most relevant text fragments from the local vector database.
        search_results = v_store.search_similar(user_query, top_k=3, source_filter=target_file)
        
        # Extract a list of pure text fragments
        retrieved_contexts = [item['text'] for item in search_results]
        
        # Step 2: Generation - Present the question along with the retrieved background information to the large model to generate the answer.
        ai_response = ai_engine.generate_answer(query=user_query, contexts=retrieved_contexts)
        
        # Step 3: Return to the front end
        return {
            "query": user_query,
            "answer": ai_response,
            # Return the source of the search results to the front end as well 
            # (a highlight of Traceability), 
            # so that users can know which sentences the AI referred to when generating its response.
            "sources": [
                {"id": item['id'], "text": item['text'][:100] + "...", "score": item['distance']} 
                for item in search_results
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat service has encountered an error.: {str(e)}")