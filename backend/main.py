import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from routes import admin, lecturer, prediction, dashboard, auth
from ml.model import prediction_model
from routes.auth import create_default_users

# Load environment variables
load_dotenv()

# Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
RELOAD = os.getenv("RELOAD", "False").lower() == "true"

# Allowed frontend URLs
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5500,"
    "http://127.0.0.1:5500,"
    "http://localhost:8000,"
    "https://acpeprsy.vercel.app"
).split(",")

# Remove spaces from origins
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

app = FastAPI(title="Academic Performance Prediction System")

# CORS middleware - must be before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers WITHOUT /api prefix
app.include_router(auth.router)        # /auth/*
app.include_router(admin.router)       # /admin/*
app.include_router(lecturer.router)    # /lecturer/*
app.include_router(prediction.router)  # /prediction/*
app.include_router(dashboard.router)   # /dashboard/*


@app.get("/")
async def root():
    return {
        "message": "Academic Performance Prediction System API is running",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "Academic Performance Prediction System is running",
        "mongodb": os.getenv("MONGODB_DB"),
        "allowed_origins": ALLOWED_ORIGINS,
        "port": PORT
    }


@app.get("/test")
async def test_api():
    return {
        "message": "API is working",
        "status": "ok"
    }


@app.on_event("startup")
async def startup_event():
    print(f"🚀 Starting up - MongoDB: {os.getenv('MONGODB_DB')}")
    print(f"🌍 Allowed origins: {ALLOWED_ORIGINS}")

    try:
        await create_default_users()
        print("✅ Default users created/verified")
    except Exception as e:
        print(f"⚠️ Error creating default users: {e}")

    try:
        if prediction_model.load_model():
            print("✅ Model loaded successfully")
        else:
            print("ℹ️ No trained model found yet. Train from lecturer page or /prediction/train")
    except Exception as e:
        print(f"⚠️ Error loading model: {e}")


if __name__ == "__main__":
    print(f"🌟 Starting server on {HOST}:{PORT}")
    print(f"📝 API Documentation: http://localhost:{PORT}/docs")

    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=RELOAD
    )