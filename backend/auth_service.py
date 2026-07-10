import os
import jwt
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv

# 1. Load local environment configuration
load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET", "RAG_SECURE_SALT_TOKEN_2026")
ALGORITHM = "HS256"

# 2. Initialize the FastAPI Bearer security credential grabber
security_bearer = HTTPBearer()

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """🔑 Hashes the plain-text password using SHA-256 and a global strict secret key salt."""
        # Using a unified SECRET_KEY as salt to safeguard against rainbow table attacks
        salted = password + SECRET_KEY
        return hashlib.sha256(salted.encode('utf-8')).hexdigest()

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """🧐 Verifies if the incoming raw password matches the persisted hash shard."""
        return AuthService.hash_password(plain_password) == hashed_password

    @staticmethod
    def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
        """🎟️ Token Minting Core: Packages payload metrics into an immutable signed JWT token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=60)
            
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def verify_token(token: str) -> dict:
        """👮 Security Interceptor: Validates token signatures and check expiration boundaries."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise HTTPException(status_code=401, detail="Invalid token payload: missing identity.")
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Access token has expired. Please re-login.")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Authentication failed. Tampered token.")

# 🌟 Unified dependency interceptor function
def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> str:
    token = credentials.credentials
    payload = AuthService.verify_token(token)
    return payload.get("sub")