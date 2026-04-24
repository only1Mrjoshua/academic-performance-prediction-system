from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from bson import ObjectId
from database import student_collection  # Reuse existing collections

load_dotenv()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

router = APIRouter(prefix="/auth", tags=["authentication"])  

# Models
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class User(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    disabled: Optional[bool] = False

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    role: str = "lecturer"  # Default role

# In-memory user store (in production, use MongoDB)
# For now, we'll create a users collection in MongoDB
from database import database
user_collection = database.get_collection("users")

# Create default users on startup
async def create_default_users():
    # Check if admin exists
    admin_exists = await user_collection.find_one({"username": os.getenv("ADMIN_USERNAME", "admin")})
    if not admin_exists:
        admin_user = {
            "username": os.getenv("ADMIN_USERNAME", "admin"),
            "email": os.getenv("ADMIN_EMAIL", "admin@university.edu"),
            "full_name": "System Administrator",
            "role": "admin",
            "disabled": False,
            "hashed_password": pwd_context.hash(os.getenv("ADMIN_PASSWORD", "Admin@123"))
        }
        await user_collection.insert_one(admin_user)
        print("✅ Default admin user created")
    
    # Check if lecturer exists
    lecturer_exists = await user_collection.find_one({"username": os.getenv("LECTURER_USERNAME", "lecturer")})
    if not lecturer_exists:
        lecturer_user = {
            "username": os.getenv("LECTURER_USERNAME", "lecturer"),
            "email": os.getenv("LECTURER_EMAIL", "lecturer@university.edu"),
            "full_name": "Sample Lecturer",
            "role": "lecturer",
            "disabled": False,
            "hashed_password": pwd_context.hash(os.getenv("LECTURER_PASSWORD", "Lecturer@123"))
        }
        await user_collection.insert_one(lecturer_user)
        print("✅ Default lecturer user created")

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_user(username: str):
    user_dict = await user_collection.find_one({"username": username})
    if user_dict:
        return UserInDB(**user_dict)
    return None

async def authenticate_user(username: str, password: str):
    user = await get_user(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=payload.get("role"))
    except JWTError:
        raise credentials_exception
    user = await get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Role-based access control
def require_role(required_role: str):
    async def role_checker(current_user: UserInDB = Depends(get_current_active_user)):
        if current_user.role != required_role and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )
        return current_user
    return role_checker

# Routes
@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, 
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }

@router.post("/register", response_model=dict)
async def register(user: UserCreate):
    # Check if user exists
    existing_user = await user_collection.find_one({
        "$or": [
            {"username": user.username},
            {"email": user.email}
        ]
    })
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="Username or email already registered"
        )
    
    # Create new user
    user_dict = user.dict()
    user_dict["hashed_password"] = get_password_hash(user.password)
    user_dict["disabled"] = False
    del user_dict["password"]
    
    result = await user_collection.insert_one(user_dict)
    return {"message": "User created successfully", "id": str(result.inserted_id)}

@router.get("/me", response_model=User)
async def read_users_me(current_user: UserInDB = Depends(get_current_active_user)):
    return User(
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        disabled=current_user.disabled
    )

@router.post("/logout")
async def logout():
    # JWT tokens are stateless, so we just return a success message
    # Client should discard the token
    return {"message": "Successfully logged out"}

@router.get("/verify")
async def verify_token(current_user: UserInDB = Depends(get_current_active_user)):
    return {"valid": True, "role": current_user.role, "username": current_user.username}