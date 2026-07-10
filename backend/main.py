import os
import jwt
import hashlib
import sqlite3
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


from auth_service import AuthService, get_current_user


from ingestion import DocumentIngestor
from vector_store import VectorStoreManager
from llm_service import LLMService

DB_PATH = "users.db"

def init_db():
    """
    Database Bootstrap: Automatically creates the physical database file 
    and hooks up the tables during server startup.
    """
    # 1. Establish a database connection along the path
    connection = sqlite3.connect(DB_PATH)
    
    # 2. Establish a database connection along the path and create a cursor (Cursor), which is like an "invisible mouse" that can execute SQL instructions within the database.
    cursor = connection.cursor()
    
    # 3. Use the native SQL instructions to forcibly create the table (if the table already exists, do nothing, ensuring safety and preventing potential explosions)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL, 
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # 4. Submit the transaction to make the just-executed table creation command truly take effect
    connection.commit()
    
    # 5.Close the connection and release the file lock
    connection.close()
    print("💾 [SQLite Initializer] Relational storage ledger synchronized successfully.")

# This function is triggered and executed immediately upon startup.
init_db()

class UserAuthSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=20, description="Username constraint")
    password: str = Field(..., min_length=6, description="Plain text password")

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
    current_file: str | None = None

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
async def chat_with_rag(
    request_data: ChatRequest, 
    current_user: str = Depends(get_current_user)
):
    print(f"[Security Check Pass Log] The current user who is initiating the question is: {current_user}")
    
    user_query = request_data.query
    target_file = request_data.current_file
    
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

@app.get("/api/files")
async def get_uploaded_files():
    """
    Enables the front-end to obtain a list of all unique PDF file names in the current vector database.
    """
    try:
        # Fetch all the metadata (Metadata) from the Collection of ChromaDB
        existing_data = v_store.collection.get(include=["metadatas"])
        
        # Extract all unique file names
        if existing_data and existing_data.get("metadatas"):
            files = set(meta["source"] for meta in existing_data["metadatas"] if meta and "source" in meta)
            return {"files": list(files)}
        return {"files": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to obtain the file list: {str(e)}")

@app.delete("/api/files/{filename}")
async def delete_document(filename: str):
    """
    One-click physical erasure of hard disk files and simultaneous cleaning of vector fragments in ChromaDB
    """
    try:
        # 1. Linked Vector Database Module: Clean all the high-dimensional vector fragments in the database.
        v_store.delete_file_chunks(filename)
        
        # 2. Remove the original PDF files saved in the local server's UPLOAD_DIR completely by using the associative physical hard drive.
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f" [Hard Disk Erasure] Successfully permanently deleted the original file [{filename}] from the physical hard drive!")
        else:
            print(f"⚠️ Warning: The file 【{filename}】 was not found on the physical hard drive. It might have been manually deleted, but the vector library has ensured it is completely cleaned.")
            
        return {
            "status": "success",
            "message": f"The document [{filename}] has been completely and securely uninstalled from both the local hard drive and the vector knowledge base!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File unloading failed: {str(e)}")


@app.post("/api/auth/register")
async def register(user_data: UserAuthSchema):
    """
    🎟️ User Registration Gate: Collects plain credentials, hashes password, and persists records.
    """
    username = user_data.username
    password = user_data.password

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    try:
        # Perform precise SQL queries
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username already exists. Choose another one.")

        # Call the unified toolbox to calculate the anti-counterfeiting code.
        hashed_password = AuthService.hash_password(password)

        # The standard SQL insertion instruction
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)", 
            (username, hashed_password)
        )
        
        # commit manually
        connection.commit()
        print(f"👤 [SQLite Shard Log] Preserved new identity row into disk: {username}")
        
        return {
            "status": "success",
            "message": f"User '{username}' registered inside physical ledger successfully! Proceed to sign in."
        }

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database transaction failure: {str(e)}")
    finally:
        connection.close()

@app.post("/api/auth/login")
async def login(user_data: UserAuthSchema):
    """
    🎫 User Authentication Token Gate: Validates hash hashes and yields stateless JWT bearer token.
    """
    username = user_data.username
    password = user_data.password

   # 1. Establish database connection pipeline
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    try:
        # 2. Execute SQL query to fetch the password hash matching this username
        cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
        record = cursor.fetchone()  # Fetchone grabs a tuple row, or None if empty

        # 3. Validation Phase A: If no record returned, username does not exist
        if not record:
            raise HTTPException(status_code=400, detail="Invalid username or password.")

        # Extract the string value from the single-element tuple row
        stored_password_hash = record[0]

        # 4. Validation Phase B: Compare raw incoming text against verified hash
        is_valid = AuthService.verify_password(password, stored_password_hash)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid username or password.")

        # 5. Issue stateless JWT access token on successful identity validation
        access_token = AuthService.create_access_token(data={"sub": username})

        return {
            "status": "success",
            "token": access_token,
            "token_type": "bearer",
            "username": username
        }
    finally:
        # 6. Securely release connection thread handles under all circumstances
        connection.close()

@app.get("/health")
async def health_check():
    return {"status": "ok"}