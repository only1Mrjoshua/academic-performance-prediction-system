from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB configuration from .env
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "academic_performance")
MONGODB_MAX_POOL_SIZE = int(os.getenv("MONGODB_MAX_POOL_SIZE", 10))
MONGODB_MIN_POOL_SIZE = int(os.getenv("MONGODB_MIN_POOL_SIZE", 1))

# Handle MongoDB connection string format
if "mongodb+srv://" in MONGODB_URL:
    client = AsyncIOMotorClient(MONGODB_URL, 
                                maxPoolSize=MONGODB_MAX_POOL_SIZE,
                                minPoolSize=MONGODB_MIN_POOL_SIZE)
else:
    client = AsyncIOMotorClient(MONGODB_URL,
                                maxPoolSize=MONGODB_MAX_POOL_SIZE,
                                minPoolSize=MONGODB_MIN_POOL_SIZE)

database = client[MONGODB_DB]

# Collections
student_collection = database.get_collection("students")
course_collection = database.get_collection("courses")
enrollment_collection = database.get_collection("enrollments")
assessment_collection = database.get_collection("assessments")
prediction_collection = database.get_collection("predictions")

# Helper functions
def student_helper(student) -> dict:
    return {
        "id": str(student["_id"]),
        "name": student["name"],
        "matric_no": student["matric_no"],
        "department": student["department"],
        "level": student["level"]
    }

def course_helper(course) -> dict:
    return {
        "id": str(course["_id"]),
        "course_code": course["course_code"],
        "credit_unit": course["credit_unit"],
        "semester": course.get("semester", "1st")
    }

def assessment_helper(assessment) -> dict:
    return {
        "id": str(assessment["_id"]),
        "student_id": assessment["student_id"],
        "course_id": assessment["course_id"],
        "semester": assessment.get("semester", "1st"),
        "ca_score": assessment["ca_score"],
        "exam_score": assessment["exam_score"]
    }

def prediction_helper(prediction) -> dict:
    return {
        "id": str(prediction["_id"]),
        "student_id": prediction["student_id"],
        "predicted_score": prediction["predicted_score"],
        "risk_status": prediction["risk_status"],
        "created_at": prediction["created_at"]
    }