from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime

from database import (
    student_collection,
    course_collection,
    assessment_collection,
    prediction_collection,
    prediction_helper,
)
from models import Prediction
from ml.model import prediction_model

router = APIRouter(prefix="/prediction", tags=["prediction"])


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


@router.post("/train")
async def train_model():
    try:
        students, courses, assessments = await fetch_all_data()

        metrics = prediction_model.train_model(
            students=students,
            assessments=assessments,
            courses=courses,
        )

        return {
            "message": "Logistic Regression model trained successfully",
            "metrics": metrics,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics")
async def get_model_metrics():
    if prediction_model.metrics:
        return prediction_model.metrics
    return {"message": "Model not trained yet"}


@router.post("/generate/{student_id}")
async def generate_prediction(student_id: str):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID")

    student_doc = await student_collection.find_one({"_id": ObjectId(student_id)})
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")

    students, courses, assessments = await fetch_all_data()

    student = next((s for s in students if s["id"] == student_id), None)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    metrics = prediction_model.calculate_student_metrics(
        student=student,
        assessments=assessments,
        courses=courses,
    )

    if not metrics:
        raise HTTPException(
            status_code=400,
            detail="Insufficient data for prediction. Need assessment records.",
        )

    prediction_result = prediction_model.predict_from_metrics(metrics)

    prediction = Prediction(
        student_id=student_id,
        predicted_score=prediction_result["predicted_score"],
        risk_status=prediction_result["risk_status"],
    )

    await prediction_collection.delete_many({"student_id": student_id})

    prediction_dict = prediction.dict()
    prediction_dict["created_at"] = datetime.now()
    result = await prediction_collection.insert_one(prediction_dict)

    new_prediction = await prediction_collection.find_one({"_id": result.inserted_id})
    return prediction_helper(new_prediction)


@router.post("/generate-all")
async def generate_all_predictions():
    predictions = []
    students, courses, assessments = await fetch_all_data()

    for student in students:
        student_id = student["id"]

        metrics = prediction_model.calculate_student_metrics(
            student=student,
            assessments=assessments,
            courses=courses,
        )

        if not metrics:
            continue

        try:
            prediction_result = prediction_model.predict_from_metrics(metrics)

            prediction = Prediction(
                student_id=student_id,
                predicted_score=prediction_result["predicted_score"],
                risk_status=prediction_result["risk_status"],
            )

            await prediction_collection.delete_many({"student_id": student_id})

            prediction_dict = prediction.dict()
            prediction_dict["created_at"] = datetime.now()
            result = await prediction_collection.insert_one(prediction_dict)

            new_prediction = await prediction_collection.find_one({"_id": result.inserted_id})
            predictions.append(prediction_helper(new_prediction))

        except Exception as e:
            print(f"Prediction failed for {student_id}: {e}")

    return {
        "message": f"Generated predictions for {len(predictions)} students",
        "predictions": predictions,
    }


@router.get("/student/{student_id}")
async def get_student_prediction(student_id: str):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID")

    prediction = await prediction_collection.find_one(
        {"student_id": student_id},
        sort=[("created_at", -1)],
    )

    if prediction:
        return prediction_helper(prediction)

    raise HTTPException(status_code=404, detail="No prediction found for this student")


@router.get("/all")
async def get_all_predictions():
    predictions = []
    async for prediction in prediction_collection.find().sort("created_at", -1):
        predictions.append(prediction_helper(prediction))
    return predictions