let assessments = [];
let students = [];
let courses = [];

console.log("Lecturer page - Using API URL:", API_BASE);

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatOneDecimal(value, fallback = "0.0") {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num.toFixed(1);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getStudentName(studentId) {
  const student = students.find((s) => s.id === studentId);
  return student ? student.name : "Unknown Student";
}

function getStudentMatric(studentId) {
  const student = students.find((s) => s.id === studentId);
  return student ? student.matric_no : "";
}

function getCourseCode(courseId) {
  const course = courses.find((c) => c.id === courseId);
  return course ? course.course_code : "Unknown Course";
}

// Function to calculate grade based on total score
function getGrade(totalScore) {
  if (totalScore >= 70) return "A";
  if (totalScore >= 60) return "B";
  if (totalScore >= 50) return "C";
  if (totalScore >= 45) return "D";
  return "F";
}

// Function to get grade badge class
function getGradeBadgeClass(grade) {
  switch(grade) {
    case "A": return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "B": return "bg-blue-50 text-blue-700 border border-blue-100";
    case "C": return "bg-amber-50 text-amber-700 border border-amber-100";
    case "D": return "bg-orange-50 text-orange-700 border border-orange-100";
    case "F": return "bg-red-50 text-red-700 border border-red-100";
    default: return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function actionButtonSvg(type) {
  if (type === "edit") {
    return `
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>
      </svg>
    `;
  }

  return `
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18"/>
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 6V4h8v2"/>
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/>
      <path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6M14 11v6"/>
    </svg>
  `;
}

function emptyStateSvg() {
  return `
    <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487a1.875 1.875 0 1 1 2.652 2.652L7.5 19.154 3 20.25l1.096-4.5 12.766-12.263Z"/>
    </svg>
  `;
}

function emptyStateRow(colspan, title, subtitle) {
  return `
    <tr>
      <td colspan="${colspan}" class="py-16 text-center">
        <div class="flex flex-col items-center justify-center gap-4 text-slate-400">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            ${emptyStateSvg()}
          </div>
          <div class="space-y-1">
            <p class="text-slate-600 font-semibold">${title}</p>
            <p class="text-sm text-slate-400">${subtitle}</p>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function loadingRow(colspan, label) {
  return `
    <tr>
      <td colspan="${colspan}" class="py-14 text-center">
        <div class="spinner"></div>
        <p class="mt-4 text-sm text-slate-500">${label}</p>
      </td>
    </tr>
  `;
}

function semesterBadgeClass(semester) {
  if (semester === "1st") {
    return "bg-blue-50 text-blue-700 border border-blue-100";
  }
  return "bg-purple-50 text-purple-700 border border-purple-100";
}

function updateSummaryCounts() {
  setText("assessmentCount", String(assessments.length));
  setText("studentCount", String(students.length));
  setText("courseCount", String(courses.length));
}

async function showConfirm(message) {
  return window.confirm(message);
}

async function loadCoursesBySemester(semester, selectElementId) {
  if (!semester) {
    const select = document.getElementById(selectElementId);
    if (select) {
      select.innerHTML = '<option value="">Select Course</option>';
      select.disabled = true;
    }
    return;
  }
  
  try {
    const coursesData = await apiCall(`/lecturer/courses/?semester=${semester}`).catch(() => []);
    const select = document.getElementById(selectElementId);
    if (select) {
      const currentValue = select.value;
      select.innerHTML = '<option value="">Select Course</option>';
      select.disabled = false;
      
      coursesData.forEach((course) => {
        select.innerHTML += `
          <option value="${escapeHtml(course.id)}">
            ${escapeHtml(course.course_code)} (${course.credit_unit} Unit${course.credit_unit > 1 ? 's' : ''})
          </option>
        `;
      });
      
      if (currentValue && coursesData.some(c => c.id === currentValue)) {
        select.value = currentValue;
      }
    }
  } catch (error) {
    console.error("Failed to load courses by semester:", error);
  }
}

function onAssessmentSemesterChange() {
  const semester = document.getElementById("assessmentSemester").value;
  loadCoursesBySemester(semester, "assessmentCourse");
}

function filterAssessmentsBySemester() {
  const semesterFilter = document.getElementById("assessmentSemesterFilter")?.value || "";
  displayAssessments(semesterFilter);
}

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Lecturer page loaded");
  await loadInitialData();
  
  const assessmentSemesterSelect = document.getElementById("assessmentSemester");
  if (assessmentSemesterSelect) {
    assessmentSemesterSelect.addEventListener("change", onAssessmentSemesterChange);
  }
});

async function loadInitialData() {
  try {
    showAssessmentLoading();

    const [studentsData, coursesData, assessmentData] = await Promise.all([
      apiCall("/lecturer/students/").catch(async () => {
        return apiCall("/admin/students/").catch(() => []);
      }),
      apiCall("/lecturer/courses/").catch(async () => {
        return apiCall("/admin/courses/").catch(() => []);
      }),
      apiCall("/lecturer/assessments/").catch(() => []),
    ]);

    students = Array.isArray(studentsData) ? studentsData : [];
    courses = Array.isArray(coursesData) ? coursesData : [];
    assessments = Array.isArray(assessmentData) ? assessmentData : [];

    populateStudentSelects();
    updateSummaryCounts();
    displayAssessments();
  } catch (error) {
    console.error("Failed to initialize lecturer page:", error);
    showToast("Failed to load lecturer data", "error");
  }
}

function showAssessmentLoading() {
  const tbody = document.getElementById("assessmentsBody");
  if (tbody) tbody.innerHTML = loadingRow(8, "Loading assessments...");
}

function populateStudentSelects() {
  const select = document.getElementById("assessmentStudent");
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = `<option value="">Select Student</option>`;

  students.forEach((student) => {
    select.innerHTML += `
      <option value="${escapeHtml(student.id)}">
        ${escapeHtml(student.name)} (${escapeHtml(student.matric_no || "")})
      </option>
    `;
  });

  if (currentValue) select.value = currentValue;
}

function displayAssessments(semesterFilter = "") {
  const tbody = document.getElementById("assessmentsBody");
  if (!tbody) return;

  let filteredAssessments = assessments;
  if (semesterFilter) {
    filteredAssessments = assessments.filter(a => a.semester === semesterFilter);
  }

  if (!filteredAssessments.length) {
    tbody.innerHTML = emptyStateRow(
      8,
      "No assessments found",
      'Click "Add Assessment" to create the first record.',
    );
    return;
  }

  let html = "";

  filteredAssessments.forEach((item) => {
    const studentName = getStudentName(item.student_id);
    const studentMatric = getStudentMatric(item.student_id);
    const courseCode = getCourseCode(item.course_id);
    const total = Number(item.ca_score || 0) + Number(item.exam_score || 0);
    const grade = getGrade(total);
    const gradeClass = getGradeBadgeClass(grade);

    html += `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-5 py-4">
          <div class="font-semibold text-slate-900">${escapeHtml(studentName)}</div>
          <div class="text-xs text-slate-400 mt-1">${escapeHtml(studentMatric)}</div>
        </td>
        <td class="px-5 py-4">
          <span class="inline-flex items-center rounded-xl bg-blue-50 px-3 py-1.5 font-mono text-sm font-semibold text-primary border border-blue-100">
            ${escapeHtml(courseCode)}
          </span>
        </td>
        <td class="px-5 py-4">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${semesterBadgeClass(item.semester)}">
            ${escapeHtml(item.semester || "1st")} Semester
          </span>
        </td>
        <td class="px-5 py-4 text-slate-700">${formatOneDecimal(item.ca_score || 0)}/30</td>
        <td class="px-5 py-4 text-slate-700">${formatOneDecimal(item.exam_score || 0)}/70</td>
        <td class="px-5 py-4 font-semibold text-primary">${formatOneDecimal(total)}/100</td>
        <td class="px-5 py-4">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${gradeClass}">
            ${escapeHtml(grade)}
          </span>
        </td>
        <td class="px-5 py-4">
          <div class="flex items-center gap-2">
            <button
              onclick="editAssessment('${escapeHtml(item.id)}')"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-blue-50 hover:text-primary hover:border-blue-100 transition-all"
              title="Edit assessment"
            >
              ${actionButtonSvg("edit")}
            </button>
            <button
              onclick="deleteAssessment('${escapeHtml(item.id)}')"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
              title="Delete assessment"
            >
              ${actionButtonSvg("delete")}
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function editAssessment(id) {
  const item = assessments.find((a) => a.id === id);
  if (!item) {
    showToast("Assessment record not found", "error");
    return;
  }

  document.getElementById("assessmentId").value = item.id;
  document.getElementById("assessmentStudent").value = item.student_id || "";
  document.getElementById("assessmentSemester").value = item.semester || "1st";
  document.getElementById("caScore").value = item.ca_score ?? "";
  document.getElementById("examScore").value = item.exam_score ?? "";
  document.getElementById("assessmentModalTitle").textContent = "Edit Assessment";
  
  loadCoursesBySemester(item.semester || "1st", "assessmentCourse").then(() => {
    document.getElementById("assessmentCourse").value = item.course_id || "";
  });
  
  openModal("assessmentModal");
}

async function saveAssessment(event) {
  event.preventDefault();

  if (!validateForm("assessmentForm")) return;

  const payload = {
    student_id: document.getElementById("assessmentStudent").value,
    course_id: document.getElementById("assessmentCourse").value,
    semester: document.getElementById("assessmentSemester").value,
    ca_score: parseFloat(document.getElementById("caScore").value),
    exam_score: parseFloat(document.getElementById("examScore").value),
  };

  const assessmentId = document.getElementById("assessmentId").value;

  try {
    if (assessmentId) {
      const updated = await apiCall(`/lecturer/assessments/${assessmentId}`, "PUT", payload);
      const index = assessments.findIndex((a) => a.id === assessmentId);
      if (index !== -1) {
        assessments[index] = updated || { ...assessments[index], ...payload, id: assessmentId };
      }
      showToast("Assessment updated successfully", "success");
    } else {
      const created = await apiCall("/lecturer/assessments/", "POST", payload);
      assessments.push(created);
      showToast("Assessment added successfully", "success");
    }

    updateSummaryCounts();
    resetAssessmentForm();
    closeModal("assessmentModal");
    const semesterFilter = document.getElementById("assessmentSemesterFilter")?.value || "";
    displayAssessments(semesterFilter);
  } catch (error) {
    console.error("Failed to save assessment:", error);
    showToast(`Failed to save assessment: ${error.message || "Unknown error"}`, "error");
  }
}

async function deleteAssessment(id) {
  const confirmed = await showConfirm("Are you sure you want to delete this assessment record?");
  if (!confirmed) return;

  try {
    await apiCall(`/lecturer/assessments/${id}`, "DELETE");
    assessments = assessments.filter((a) => a.id !== id);
    updateSummaryCounts();
    const semesterFilter = document.getElementById("assessmentSemesterFilter")?.value || "";
    displayAssessments(semesterFilter);
    showToast("Assessment deleted successfully", "success");
  } catch (error) {
    console.error("Failed to delete assessment:", error);
    showToast("Failed to delete assessment", "error");
  }
}

function resetAssessmentForm() {
  const form = document.getElementById("assessmentForm");
  if (form) form.reset();
  document.getElementById("assessmentId").value = "";
  document.getElementById("assessmentModalTitle").textContent = "Add Assessment";
  const courseSelect = document.getElementById("assessmentCourse");
  if (courseSelect) {
    courseSelect.innerHTML = '<option value="">Select Course</option>';
    courseSelect.disabled = true;
  }
}

async function trainModel() {
  const button = document.getElementById("trainModelBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "Training...";
  }

  try {
    const result = await apiCall("/prediction/train", "POST");
    showToast(result?.message || "Model training completed successfully", "success");
  } catch (error) {
    console.error("Failed to train model:", error);
    showToast("Failed to train model", "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Train Model";
    }
  }
}

async function generateAllPredictions() {
  const button = document.getElementById("generatePredictionsBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "Generating...";
  }

  try {
    const result = await apiCall("/prediction/generate-all", "POST");
    showToast(`Generated predictions for ${result.predictions?.length || 0} students`, "success");
  } catch (error) {
    console.error("Failed to generate predictions:", error);
    showToast("Failed to generate predictions", "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Generate All Predictions";
    }
  }
}

window.editAssessment = editAssessment;
window.saveAssessment = saveAssessment;
window.deleteAssessment = deleteAssessment;
window.trainModel = trainModel;
window.generateAllPredictions = generateAllPredictions;
window.filterAssessmentsBySemester = filterAssessmentsBySemester;