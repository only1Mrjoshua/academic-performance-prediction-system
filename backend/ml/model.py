import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import joblib
import os
from ml.cgpa import calculate_total_score, score_to_grade_point

class PredictionModel:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.metrics = None
        self.load_model()  # Try to load existing model on init
        
    def load_model(self):
        """Load saved model if it exists"""
        if os.path.exists("model.joblib"):
            try:
                saved_model = joblib.load("model.joblib")
                if saved_model.get("type") == "sklearn":
                    self.model = saved_model["model"]
                    self.scaler = saved_model["scaler"]
                    print("✅ Model loaded successfully")
                elif saved_model.get("type") == "rule_based":
                    self.model = "rule_based"
                    self.thresholds = saved_model["thresholds"]
                    print("✅ Rule-based model loaded successfully")
            except Exception as e:
                print(f"⚠️ Error loading model: {e}")
        else:
            print("ℹ️ No existing model found. Train a new model.")
        
    def calculate_student_metrics(self, student, assessments, courses):
        """Calculate features for a student"""
        student_assessments = [a for a in assessments if a["student_id"] == student["id"]]
        
        if not student_assessments:
            return None
        
        # Calculate average scores
        total_scores = []
        grade_points = []
        
        course_map = {c["id"]: c for c in courses}
        
        for assessment in student_assessments:
            course = course_map.get(assessment["course_id"])
            if course:
                total_score = calculate_total_score(
                    assessment.get("ca_score", 0),
                    assessment.get("exam_score", 0)
                )
                total_scores.append(total_score)
                grade_points.append(score_to_grade_point(total_score))
        
        if not total_scores:
            return None
        
        avg_score = np.mean(total_scores)
        avg_gpa = np.mean(grade_points) if grade_points else 0
        
        return {
            "avg_score": avg_score,
            "avg_gpa": avg_gpa,
            "num_courses": len(student_assessments)
        }
    
    def prepare_features(self, students, assessments, courses):
        """Prepare feature matrix for all students"""
        features = []
        labels = []
        
        for student in students:
            metrics = self.calculate_student_metrics(student, assessments, courses)
            if metrics:
                features.append([
                    metrics["avg_score"],
                    metrics["avg_gpa"],
                    metrics["num_courses"]
                ])
                # Generate label based on avg_score
                if metrics["avg_score"] >= 70:
                    labels.append(0)  # Low risk
                elif metrics["avg_score"] >= 50:
                    labels.append(1)  # Medium risk
                else:
                    labels.append(2)  # High risk
        
        return np.array(features), np.array(labels)
    
    def train_model(self, students, assessments, courses):
        """Train the logistic regression model"""
        X, y = self.prepare_features(students, assessments, courses)
        
        if len(X) == 0:
            raise ValueError("No data available for training")
        
        # Check if we have multiple classes
        unique_classes = np.unique(y)
        print(f"Unique classes in training data: {unique_classes}")
        
        if len(unique_classes) < 2:
            # Not enough classes for proper training
            # Store a simple rule-based model instead
            self.model = "rule_based"
            self.scaler = None
            
            # Calculate thresholds based on data
            self.thresholds = {
                "low": 70,
                "medium": 50
            }
            
            self.metrics = {
                "accuracy": 1.0,
                "precision": 1.0,
                "recall": 1.0,
                "f1_score": 1.0,
                "confusion_matrix": [[len(y)]],
                "message": "Rule-based model created (only one class available in training data)"
            }
            
            # Save as rule-based model
            joblib.dump({"type": "rule_based", "thresholds": self.thresholds}, "model.joblib")
            
            return self.metrics
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model with class_weight to handle imbalance
        self.model = LogisticRegression(random_state=42, max_iter=1000, class_weight='balanced')
        self.model.fit(X_scaled, y)
        
        # Calculate metrics
        y_pred = self.model.predict(X_scaled)
        
        self.metrics = {
            "accuracy": accuracy_score(y, y_pred),
            "precision": precision_score(y, y_pred, average='weighted', zero_division=0),
            "recall": recall_score(y, y_pred, average='weighted', zero_division=0),
            "f1_score": f1_score(y, y_pred, average='weighted', zero_division=0),
            "confusion_matrix": confusion_matrix(y, y_pred).tolist(),
            "message": "Model trained successfully"
        }
        
        # Save model
        joblib.dump({"type": "sklearn", "model": self.model, "scaler": self.scaler}, "model.joblib")
        
        return self.metrics
    
    def predict_from_metrics(self, metrics):
        """Predict risk status from student metrics"""
        # Check if we have a saved model
        if self.model is None:
            # Try to load model
            self.load_model()
        
        if self.model == "rule_based":
            # Use rule-based prediction
            if metrics["avg_score"] >= self.thresholds["low"]:
                return {"predicted_score": metrics["avg_score"], "risk_status": "Low"}
            elif metrics["avg_score"] >= self.thresholds["medium"]:
                return {"predicted_score": metrics["avg_score"], "risk_status": "Medium"}
            else:
                return {"predicted_score": metrics["avg_score"], "risk_status": "High"}
        
        elif self.model is not None and hasattr(self.model, 'predict'):
            # Use sklearn model
            features = np.array([[metrics["avg_score"], metrics["avg_gpa"], metrics["num_courses"]]])
            if self.scaler:
                features_scaled = self.scaler.transform(features)
                prediction = self.model.predict(features_scaled)[0]
            else:
                prediction = self.model.predict(features)[0]
            
            risk_map = {0: "Low", 1: "Medium", 2: "High"}
            return {
                "predicted_score": metrics["avg_score"],
                "risk_status": risk_map[prediction]
            }
        
        # Default fallback prediction
        if metrics["avg_score"] >= 70:
            return {"predicted_score": metrics["avg_score"], "risk_status": "Low"}
        elif metrics["avg_score"] >= 50:
            return {"predicted_score": metrics["avg_score"], "risk_status": "Medium"}
        else:
            return {"predicted_score": metrics["avg_score"], "risk_status": "High"}

# Singleton instance
prediction_model = PredictionModel()