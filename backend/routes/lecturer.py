from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from typing import List, Optional
from database import (
    assessment_collection,
    student_collection, course_collection,
    assessment_helper
)
from models import Assessment, AssessmentResponse
from routes.auth import get_current_active_user

router = APIRouter(prefix="/lecturer", tags=["lecturer"])

async def get_current_lecturer_or_admin(current_user = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "lecturer"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user

@router.post("/assessments/", response_model=AssessmentResponse)
async def create_assessment(
    assessment: Assessment,
    current_user = Depends(get_current_lecturer_or_admin)
):
    student = await student_collection.find_one({"_id": ObjectId(assessment.student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    course = await course_collection.find_one({"_id": ObjectId(assessment.course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if assessment.semester != course.get("semester"):
        raise HTTPException(status_code=400, detail="Assessment semester must match course semester")
    
    if assessment.semester not in ["1st", "2nd"]:
        raise HTTPException(status_code=400, detail="Semester must be '1st' or '2nd'")
    
    assessment_dict = assessment.dict()
    result = await assessment_collection.insert_one(assessment_dict)
    new_assessment = await assessment_collection.find_one({"_id": result.inserted_id})
    return assessment_helper(new_assessment)

@router.get("/assessments/", response_model=List[AssessmentResponse])
async def get_all_assessments(semester: str = None):
    query = {}
    if semester:
        if semester not in ["1st", "2nd"]:
            raise HTTPException(status_code=400, detail="Semester must be '1st' or '2nd'")
        query["semester"] = semester
    
    assessments = []
    async for assessment in assessment_collection.find(query):
        assessments.append(assessment_helper(assessment))
    return assessments

@router.get("/assessments/student/{student_id}", response_model=List[AssessmentResponse])
async def get_student_assessments(student_id: str, semester: str = None):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    query = {"student_id": student_id}
    if semester:
        if semester not in ["1st", "2nd"]:
            raise HTTPException(status_code=400, detail="Semester must be '1st' or '2nd'")
        query["semester"] = semester
    
    assessments = []
    async for assessment in assessment_collection.find(query):
        assessments.append(assessment_helper(assessment))
    return assessments

@router.put("/assessments/{assessment_id}", response_model=AssessmentResponse)
async def update_assessment(assessment_id: str, assessment: Assessment):
    if not ObjectId.is_valid(assessment_id):
        raise HTTPException(status_code=400, detail="Invalid assessment ID")
    
    if assessment.semester not in ["1st", "2nd"]:
        raise HTTPException(status_code=400, detail="Semester must be '1st' or '2nd'")
    
    course = await course_collection.find_one({"_id": ObjectId(assessment.course_id)})
    if course and assessment.semester != course.get("semester"):
        raise HTTPException(status_code=400, detail="Assessment semester must match course semester")
    
    assessment_dict = assessment.dict()
    result = await assessment_collection.update_one(
        {"_id": ObjectId(assessment_id)}, {"$set": assessment_dict}
    )
    
    if result.modified_count == 1:
        updated_assessment = await assessment_collection.find_one({"_id": ObjectId(assessment_id)})
        return assessment_helper(updated_assessment)
    
    raise HTTPException(status_code=404, detail="Assessment not found")

@router.delete("/assessments/{assessment_id}")
async def delete_assessment(assessment_id: str):
    if not ObjectId.is_valid(assessment_id):
        raise HTTPException(status_code=400, detail="Invalid assessment ID")
    
    result = await assessment_collection.delete_one({"_id": ObjectId(assessment_id)})
    if result.deleted_count == 1:
        return {"message": "Assessment deleted successfully"}
    
    raise HTTPException(status_code=404, detail="Assessment not found")

@router.get("/students/", response_model=List[dict])
async def get_students_for_lecturer(current_user = Depends(get_current_lecturer_or_admin)):
    students = []
    async for student in student_collection.find({}, {"name": 1, "matric_no": 1}):
        students.append({
            "id": str(student["_id"]),
            "name": student["name"],
            "matric_no": student["matric_no"]
        })
    return students

@router.get("/courses/", response_model=List[dict])
async def get_courses_for_lecturer(semester: str = None, current_user = Depends(get_current_lecturer_or_admin)):
    query = {}
    if semester:
        if semester not in ["1st", "2nd"]:
            raise HTTPException(status_code=400, detail="Semester must be '1st' or '2nd'")
        query["semester"] = semester
    
    courses = []
    async for course in course_collection.find(query, {"course_code": 1, "credit_unit": 1, "semester": 1}):
        courses.append({
            "id": str(course["_id"]),
            "course_code": course["course_code"],
            "credit_unit": course["credit_unit"],
            "semester": course.get("semester", "1st")
        })
    return courses