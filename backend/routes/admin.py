from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from typing import List, Optional
from database import (
    student_collection, course_collection,
    student_helper, course_helper
)
from models import Student, Course, StudentResponse, CourseResponse
from routes.auth import require_role

router = APIRouter(prefix="/admin", tags=["admin"])

# Protect all admin routes
admin_only = require_role("admin")

# Student CRUD operations
@router.post("/students/", response_model=StudentResponse)
async def create_student(
    student: Student, 
    current_user = Depends(admin_only)
):
    student_dict = student.dict()
    result = await student_collection.insert_one(student_dict)
    new_student = await student_collection.find_one({"_id": result.inserted_id})
    return student_helper(new_student)

@router.get("/students/", response_model=List[StudentResponse])
async def get_all_students(
    current_user = Depends(require_role("admin"))
):
    students = []
    async for student in student_collection.find():
        students.append(student_helper(student))
    return students

@router.get("/students/{student_id}", response_model=StudentResponse)
async def get_student(student_id: str):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    student = await student_collection.find_one({"_id": ObjectId(student_id)})
    if student:
        return student_helper(student)
    raise HTTPException(status_code=404, detail="Student not found")

@router.put("/students/{student_id}", response_model=StudentResponse)
async def update_student(student_id: str, student: Student):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    student_dict = student.dict()
    result = await student_collection.update_one(
        {"_id": ObjectId(student_id)}, {"$set": student_dict}
    )
    
    if result.modified_count == 1:
        updated_student = await student_collection.find_one({"_id": ObjectId(student_id)})
        return student_helper(updated_student)
    
    raise HTTPException(status_code=404, detail="Student not found")

@router.delete("/students/{student_id}")
async def delete_student(student_id: str):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    result = await student_collection.delete_one({"_id": ObjectId(student_id)})
    if result.deleted_count == 1:
        return {"message": "Student deleted successfully"}
    
    raise HTTPException(status_code=404, detail="Student not found")

# Course CRUD operations with semester support
@router.post("/courses/", response_model=CourseResponse)
async def create_course(course: Course):
    # Check if course already exists for the same semester
    existing_course = await course_collection.find_one({
        "course_code": course.course_code,
        "semester": course.semester
    })
    if existing_course:
        raise HTTPException(status_code=400, detail="Course code already exists for this semester")
    
    if course.semester not in ["1st", "2nd"]:
        raise HTTPException(status_code=400, detail="Semester must be '1st' or '2nd'")
    
    course_dict = course.dict()
    result = await course_collection.insert_one(course_dict)
    new_course = await course_collection.find_one({"_id": result.inserted_id})
    return course_helper(new_course)

@router.get("/courses/", response_model=List[CourseResponse])
async def get_all_courses(semester: Optional[str] = None):
    query = {}
    if semester:
        if semester not in ["1st", "2nd"]:
            raise HTTPException(status_code=400, detail="Semester must be '1st' or '2nd'")
        query["semester"] = semester
    
    courses = []
    async for course in course_collection.find(query):
        courses.append(course_helper(course))
    return courses

@router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str):
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID")
    
    course = await course_collection.find_one({"_id": ObjectId(course_id)})
    if course:
        return course_helper(course)
    raise HTTPException(status_code=404, detail="Course not found")

@router.put("/courses/{course_id}", response_model=CourseResponse)
async def update_course(course_id: str, course: Course):
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID")
    
    if course.semester not in ["1st", "2nd"]:
        raise HTTPException(status_code=400, detail="Semester must be '1st' or '2nd'")
    
    course_dict = course.dict()
    result = await course_collection.update_one(
        {"_id": ObjectId(course_id)}, {"$set": course_dict}
    )
    
    if result.modified_count == 1:
        updated_course = await course_collection.find_one({"_id": ObjectId(course_id)})
        return course_helper(updated_course)
    
    raise HTTPException(status_code=404, detail="Course not found")

@router.delete("/courses/{course_id}")
async def delete_course(course_id: str):
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID")
    
    result = await course_collection.delete_one({"_id": ObjectId(course_id)})
    if result.deleted_count == 1:
        return {"message": "Course deleted successfully"}
    
    raise HTTPException(status_code=404, detail="Course not found")