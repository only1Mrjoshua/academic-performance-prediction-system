from fastapi import APIRouter, Depends
from bson import ObjectId
from typing import List, Optional

from database import (
    student_collection,
    course_collection,
    assessment_collection,
    prediction_collection,
)
from models import RiskStatistics, StudentRiskDetail
from ml.model import prediction_model
from ml.cgpa import calculate_student_gpas, calculate_cgpa_for_student
from routes.auth import get_current_active_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def fetch_all_data():
    students = []
    async for doc in student_collection.find():
        students.append({
            "id": str(doc["_id"]),
            "name": doc["name"],
            "matric_no": doc["matric_no"],
            "department": doc["department"],
            "level": doc["level"],
        })

    courses = []
    async for doc in course_collection.find():
        courses.append({
            "id": str(doc["_id"]),
            "course_code": doc["course_code"],
            "credit_unit": doc["credit_unit"],
            "semester": doc.get("semester", "1st"),
        })

    assessments = []
    async for doc in assessment_collection.find():
        assessments.append({
            "id": str(doc["_id"]),
            "student_id": doc["student_id"],
            "course_id": doc["course_id"],
            "semester": doc.get("semester", "1st"),
            "ca_score": doc["ca_score"],
            "exam_score": doc["exam_score"],
        })

    return students, courses, assessments


@router.get("/statistics", response_model=RiskStatistics)
async def get_risk_statistics(current_user=Depends(get_current_active_user)):
    predictions = await prediction_collection.find().to_list(length=None)

    total = len(predictions)
    low_risk = sum(1 for p in predictions if p["risk_status"] == "Low")
    medium_risk = sum(1 for p in predictions if p["risk_status"] == "Medium")
    high_risk = sum(1 for p in predictions if p["risk_status"] == "High")

    return RiskStatistics(
        total_students=total,
        low_risk=low_risk,
        medium_risk=medium_risk,
        high_risk=high_risk,
        low_risk_percentage=(low_risk / total * 100) if total > 0 else 0,
        medium_risk_percentage=(medium_risk / total * 100) if total > 0 else 0,
        high_risk_percentage=(high_risk / total * 100) if total > 0 else 0,
    )


@router.get("/students", response_model=List[StudentRiskDetail])
async def get_all_students_with_risk(
    search: Optional[str] = None,
    level: Optional[int] = None,
    department: Optional[str] = None,
):
    students, courses, assessments = await fetch_all_data()
    result = []

    for student in students:
        if search:
            if search.lower() not in student["name"].lower() and search.lower() not in student["matric_no"].lower():
                continue

        if level and student["level"] != level:
            continue

        if department and department.lower() not in student["department"].lower():
            continue

        prediction = await prediction_collection.find_one(
            {"student_id": student["id"]},
            sort=[("created_at", -1)],
        )

        if not prediction:
            continue

        # Calculate GPAs using the correct formula
        gpa_data = calculate_student_gpas(student["id"], assessments, courses)

        result.append(
            StudentRiskDetail(
                student_id=student["id"],
                student_name=student["name"],
                matric_no=student["matric_no"],
                level=student["level"],
                department=student["department"],
                predicted_score=prediction["predicted_score"],
                risk_status=prediction["risk_status"],
                attendance_percentage=None,
                assessment_average=None,
                cumulative_gpa=gpa_data["cgpa"],
                first_semester_gpa=gpa_data["first_semester_gpa"],
                second_semester_gpa=gpa_data["second_semester_gpa"],
            )
        )

    return result


@router.get("/high-risk", response_model=List[StudentRiskDetail])
async def get_high_risk_students():
    students, courses, assessments = await fetch_all_data()
    result = []

    predictions = await prediction_collection.find({"risk_status": "High"}).to_list(length=None)

    for prediction in predictions:
        student = next((s for s in students if s["id"] == prediction["student_id"]), None)
        if not student:
            continue

        gpa_data = calculate_student_gpas(student["id"], assessments, courses)

        result.append(
            StudentRiskDetail(
                student_id=student["id"],
                student_name=student["name"],
                matric_no=student["matric_no"],
                level=student["level"],
                department=student["department"],
                predicted_score=prediction["predicted_score"],
                risk_status=prediction["risk_status"],
                attendance_percentage=None,
                assessment_average=None,
                cumulative_gpa=gpa_data["cgpa"],
                first_semester_gpa=gpa_data["first_semester_gpa"],
                second_semester_gpa=gpa_data["second_semester_gpa"],
            )
        )

    return result


@router.get("/model-metrics")
async def get_model_metrics():
    if prediction_model.metrics:
        return prediction_model.metrics
    return {"message": "Model metrics not available. Train the model first."}