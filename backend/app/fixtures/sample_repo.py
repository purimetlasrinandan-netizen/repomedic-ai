"""
Built-in reproducible sample repository fixture for testing and offline demo.
Contains realistic open-source files and a deliberate bug for testing the Bug Detective.
"""

SAMPLE_REPO_ID = "repomedic__medic-auth"
SAMPLE_REPO_OWNER = "repomedic"
SAMPLE_REPO_NAME = "medic-auth"
SAMPLE_REPO_URL = "https://github.com/repomedic/medic-auth"

SAMPLE_FILES = {
    "README.md": """# Medic Auth Service

A lightweight, secure authentication and JWT session token management microservice.

## Features
- User registration and password hashing with bcrypt
- JWT access and refresh token issuance
- Scope-based permission middleware
- SQLite session revocation store

## Getting Started

### Installation
```bash
pip install -r requirements.txt
pytest tests/
uvicorn src.main:app --reload
```

## Architecture
- `src/main.py`: FastAPI application entrypoint and route mounting
- `src/auth.py`: Token generation, validation, and deliberate KeyError bug in expired payload extraction
- `src/config.py`: Service configuration and secret key definitions
- `src/models.py`: Pydantic models for user credentials and token responses
- `tests/test_auth.py`: Unit test suite verifying login and token validation
""",
    "requirements.txt": """fastapi>=0.100.0
uvicorn>=0.22.0
pydantic>=2.0.0
pyjwt>=2.8.0
passlib[bcrypt]>=1.7.4
pytest>=7.4.0
""",
    "src/main.py": """from fastapi import FastAPI, Depends, HTTPException, status
from src.auth import AuthService, get_current_user
from src.models import LoginRequest, TokenResponse

app = FastAPI(title="Medic Auth Service", version="1.0.0")
auth_service = AuthService()

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "medic-auth"}

@app.post("/api/v1/login", response_model=TokenResponse)
def login(creds: LoginRequest):
    token = auth_service.authenticate_user(creds.username, creds.password)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    return TokenResponse(access_token=token, token_type="bearer")

@app.get("/api/v1/profile")
def get_user_profile(user: dict = Depends(get_current_user)):
    return {"username": user["username"], "roles": user.get("roles", ["user"])}
""",
    "src/auth.py": """import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

SECRET_KEY = "repomedic-demo-insecure-key-for-testing"
ALGORITHM = "HS256"

class AuthService:
    def __init__(self, secret: str = SECRET_KEY):
        self.secret = secret

    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire.timestamp()})
        return jwt.encode(to_encode, self.secret, algorithm=ALGORITHM)

    def verify_token(self, token: str) -> Dict[str, Any]:
        \"\"\"
        Decodes token and validates expiration payload.
        NOTE: Contains a deliberate KeyError bug when 'user_id' is missing from claims!
        \"\"\"
        payload = jwt.decode(token, self.secret, algorithms=[ALGORITHM])
        # Deliberate Bug: direct key access without get() or verification causes KeyError
        user_id = payload["user_id"]
        return {"user_id": user_id, "username": payload.get("sub", "")}

    def authenticate_user(self, username: str, password: str) -> Optional[str]:
        if username == "admin" and password == "doctor123":
            return self.create_access_token({"sub": username, "user_id": 101, "roles": ["admin"]})
        return None

def get_current_user(token_header: str) -> Dict[str, Any]:
    service = AuthService()
    return service.verify_token(token_header)
""",
    "src/models.py": """from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserProfile(BaseModel):
    user_id: int
    username: str
    roles: list[str] = ["user"]
""",
    "src/config.py": """from pydantic import BaseModel

class AppSettings(BaseModel):
    APP_NAME: str = "Medic Auth Service"
    DEBUG: bool = False
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
""",
    "tests/test_auth.py": """import pytest
from src.auth import AuthService

def test_token_creation():
    service = AuthService()
    token = service.create_access_token({"sub": "tester", "user_id": 42})
    assert token is not None

def test_verify_token_success():
    service = AuthService()
    token = service.create_access_token({"sub": "alice", "user_id": 7})
    data = service.verify_token(token)
    assert data["user_id"] == 7
    assert data["username"] == "alice"

def test_verify_token_missing_user_id_triggers_bug():
    \"\"\"Demonstrates the deliberate KeyError bug in verify_token()\"\"\"
    service = AuthService()
    # Create token without 'user_id' claim
    token = service.create_access_token({"sub": "legacy_client"})
    with pytest.raises(KeyError):
        service.verify_token(token)
""",
}

DELIBERATE_BUG_EXAMPLE = {
    "error_message": "KeyError: 'user_id'",
    "stack_trace": """Traceback (most recent call last):
  File "src/main.py", line 26, in get_user_profile
    user: dict = Depends(get_current_user)
  File "src/auth.py", line 45, in get_current_user
    return service.verify_token(token_header)
  File "src/auth.py", line 32, in verify_token
    user_id = payload["user_id"]
KeyError: 'user_id'""",
    "reproduction_steps": "1. Send a request to GET /api/v1/profile with a token generated by a legacy client missing the 'user_id' claim.\n2. Service crashes with 500 Internal Server Error due to unhandled KeyError.",
    "suspected_file": "src/auth.py",
}
