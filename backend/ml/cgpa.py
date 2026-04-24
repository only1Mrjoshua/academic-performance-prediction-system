def score_to_grade_point(score: float) -> float:
    """Convert numerical score to grade point based on school's grading system"""
    if score >= 70:
        return 5.0  # A
    elif score >= 60:
        return 4.0  # B
    elif score >= 50:
        return 3.0  # C
    elif score >= 45:
        return 2.0  # D
    else:
        return 0.0  # F


def calculate_total_score(ca_score: float, exam_score: float) -> float:
    """Calculate total score from CA and Exam (CA max 30, Exam max 70)"""
    return float(ca_score or 0) + float(exam_score or 0)


def calculate_gpa_for_semester(student_assessments: list, courses: list, semester: str) -> float:
    """
    Calculate GPA for a specific semester
    GPA = (sum of credit_unit * grade_point) / (sum of credit_unit)
    """
    semester_assessments = [a for a in student_assessments if a.get("semester") == semester]
    
    if not semester_assessments:
        return 0.0
    
    course_map = {str(course["id"]): course for course in courses}
    
    total_quality_points = 0.0
    total_credit_units = 0.0
    
    for record in semester_assessments:
        course_id = str(record.get("course_id"))
        course = course_map.get(course_id)
        if not course:
            continue
        
        credit_unit = float(course.get("credit_unit", 0))
        total_score = calculate_total_score(
            record.get("ca_score", 0),
            record.get("exam_score", 0),
        )
        grade_point = score_to_grade_point(total_score)
        
        total_quality_points += grade_point * credit_unit
        total_credit_units += credit_unit
    
    if total_credit_units == 0:
        return 0.0
    
    return round(total_quality_points / total_credit_units, 2)


def calculate_cgpa_for_student(student_id: str, assessments: list, courses: list) -> float:
    """
    Calculate CGPA for a student across all semesters
    CGPA = (sum of ALL quality points) / (sum of ALL credit units)
    """
    student_assessments = [a for a in assessments if str(a.get("student_id")) == str(student_id)]

    if not student_assessments:
        return 0.0
    
    course_map = {str(course["id"]): course for course in courses}
    
    total_quality_points = 0.0
    total_credit_units = 0.0
    
    for record in student_assessments:
        course_id = str(record.get("course_id"))
        course = course_map.get(course_id)
        if not course:
            continue
        
        credit_unit = float(course.get("credit_unit", 0))
        total_score = calculate_total_score(
            record.get("ca_score", 0),
            record.get("exam_score", 0),
        )
        grade_point = score_to_grade_point(total_score)
        
        total_quality_points += grade_point * credit_unit
        total_credit_units += credit_unit
    
    if total_credit_units == 0:
        return 0.0
    
    return round(total_quality_points / total_credit_units, 2)


def calculate_student_gpas(student_id: str, assessments: list, courses: list) -> dict:
    """
    Calculate all GPAs for a student
    Returns dict with first_semester_gpa, second_semester_gpa, and cgpa
    """
    student_assessments = [a for a in assessments if str(a.get("student_id")) == str(student_id)]

    if not student_assessments:
        return {
            "first_semester_gpa": 0.0,
            "second_semester_gpa": 0.0,
            "cgpa": 0.0
        }
    
    # Calculate GPA for each semester
    first_semester_gpa = calculate_gpa_for_semester(student_assessments, courses, "1st")
    second_semester_gpa = calculate_gpa_for_semester(student_assessments, courses, "2nd")
    
    # Calculate CGPA using the correct formula (total quality points / total credit units)
    cgpa = calculate_cgpa_for_student(student_id, assessments, courses)
    
    return {
        "first_semester_gpa": first_semester_gpa,
        "second_semester_gpa": second_semester_gpa,
        "cgpa": cgpa
    }