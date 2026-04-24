from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

# MongoDB document models
class Student(BaseModel):
    id: Optional[str] = None
    name: str
    matric_no: str
    department: str
    level: int

class Course(BaseModel):
    id: Optional[str] = None
    course_code: str
    credit_unit: int
    semester: str  # e.g., "1st", "2nd"

class Enrollment(BaseModel):
    student_id: str
    course_id: str
    semester: str

class Assessment(BaseModel):
    student_id: str
    course_id: str
    semester: str
    ca_score: float = Field(ge=0, le=30)  # Continuous Assessment (30 marks)
    exam_score: float = Field(ge=0, le=70)  # Exam (70 marks)

class RiskStatus(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

class Prediction(BaseModel):
    student_id: str
    predicted_score: float
    risk_status: RiskStatus
    created_at: datetime = datetime.now()

# Response models
class StudentResponse(Student):
    id: str

class CourseResponse(Course):
    id: str

class AssessmentResponse(Assessment):
    id: str

class PredictionResponse(Prediction):
    id: str

# Dashboard models
class RiskStatistics(BaseModel):
    total_students: int
    low_risk: int
    medium_risk: int
    high_risk: int
    low_risk_percentage: float
    medium_risk_percentage: float
    high_risk_percentage: float

class StudentRiskDetail(BaseModel):
    student_id: str
    student_name: str
    matric_no: str
    level: int
    department: str
    predicted_score: float
    risk_status: RiskStatus
    assessment_average: Optional[float] = None
    cumulative_gpa: Optional[float] = None
    first_semester_gpa: Optional[float] = None
    second_semester_gpa: Optional[float] = None

# ML Model Evaluation
class ModelMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: list