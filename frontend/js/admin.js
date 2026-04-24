let students = [];
let courses = [];

console.log("Admin page - Using API URL:", API_BASE);

(function injectAdminEnhancements() {
  if (document.getElementById("admin-premium-ui-styles")) return;

  const style = document.createElement("style");
  style.id = "admin-premium-ui-styles";
  style.textContent = `
    @keyframes adminSpin {
      to { transform: rotate(360deg); }
    }

    .admin-spinner {
      display: inline-block;
      width: 30px;
      height: 30px;
      border: 3px solid rgba(19, 91, 236, 0.12);
      border-top-color: #135bec;
      border-radius: 9999px;
      animation: adminSpin 0.8s linear infinite;
    }
  `;
  document.head.appendChild(style);
})();

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function levelBadgeClass(level) {
  const value = String(level);
  if (value === "100") return "bg-emerald-50 text-emerald-700 border border-emerald-100";
  if (value === "200") return "bg-blue-50 text-blue-700 border border-blue-100";
  if (value === "300") return "bg-violet-50 text-violet-700 border border-violet-100";
  if (value === "400") return "bg-amber-50 text-amber-700 border border-amber-100";
  if (value === "500") return "bg-red-50 text-red-700 border border-red-100";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function semesterBadgeClass(semester) {
  if (semester === "1st") {
    return "bg-blue-50 text-blue-700 border border-blue-100";
  }
  return "bg-purple-50 text-purple-700 border border-purple-100";
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

function emptyStateSvg(kind = "generic") {
  if (kind === "students") {
    return `
      <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372A3.375 3.375 0 0 0 21 16.125a3.375 3.375 0 0 0-2.25-3.176M15 19.128v-.003c0-1.113-.285-2.16-.786-3.072M15 4.872A9.353 9.353 0 0 0 12 4.5c-1.049 0-2.06.173-3 .49m6 14.138A9.353 9.353 0 0 1 12 19.5c-1.049 0-2.06-.173-3-.49m0 0A9.355 9.355 0 0 1 6.75 18.375a3.375 3.375 0 0 1-2.25-3.176 3.375 3.375 0 0 1 2.25-3.176m2.25 7.0a9.355 9.355 0 0 1-.786-3.072m0-7.902A9.355 9.355 0 0 0 9 5.625a3.375 3.375 0 0 0-2.25 3.176 3.375 3.375 0 0 0 2.25 3.176m0-7.0A9.353 9.353 0 0 1 12 4.5"/>
      </svg>
    `;
  }

  if (kind === "courses") {
    return `
      <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5 5.754 5 4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18c1.746 0 3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>
    `;
  }

  return `
    <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <circle cx="11" cy="11" r="7"></circle>
      <path stroke-linecap="round" stroke-linejoin="round" d="m20 20-3.5-3.5"></path>
    </svg>
  `;
}

function makeLoadingRow(colspan, label) {
  return `
    <tr>
      <td colspan="${colspan}" class="py-16 text-center">
        <div class="flex flex-col items-center justify-center gap-4">
          <div class="admin-spinner"></div>
          <div class="space-y-1">
            <p class="text-slate-700 font-semibold">${label}</p>
            <p class="text-sm text-slate-400">Please wait a moment</p>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function makeEmptyRow(colspan, title, subtitle, kind = "generic") {
  return `
    <tr>
      <td colspan="${colspan}" class="py-16 text-center">
        <div class="flex flex-col items-center justify-center gap-4 text-slate-400">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            ${emptyStateSvg(kind)}
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

async function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className =
      "fixed inset-0 z-[220] bg-slate-950/40 backdrop-blur-md flex items-center justify-center px-4";

    const modal = document.createElement("div");
    modal.className =
      "w-full max-w-[460px] rounded-[28px] border border-slate-200 bg-white p-6 md:p-7 shadow-2xl";

    modal.innerHTML = `
      <div class="flex items-start gap-4 mb-6">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-xs uppercase tracking-[0.18em] font-bold text-slate-400">Confirm action</p>
          <h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Proceed?</h3>
          <p class="mt-3 text-sm leading-7 text-slate-600">${escapeHtml(message)}</p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <button id="confirm-yes" class="inline-flex flex-1 items-center justify-center rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-100 hover:bg-primary-dark transition-all">
          Yes, proceed
        </button>
        <button id="confirm-no" class="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">
          Cancel
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    function cleanup(result) {
      document.body.style.overflow = "";
      overlay.remove();
      resolve(result);
    }

    modal.querySelector("#confirm-yes").addEventListener("click", () => cleanup(true));
    modal.querySelector("#confirm-no").addEventListener("click", () => cleanup(false));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  loadAllData();
});

async function loadAllData() {
  try {
    showLoading("students");
    showLoading("courses");

    const [studentsData, coursesData] = await Promise.all([
      apiCall("/admin/students/").catch((err) => {
        console.error("Failed to load students:", err);
        return [];
      }),
      apiCall("/admin/courses/").catch((err) => {
        console.error("Failed to load courses:", err);
        return [];
      }),
    ]);

    students = Array.isArray(studentsData) ? studentsData : [];
    courses = Array.isArray(coursesData) ? coursesData : [];

    updateAdminSummary();
    displayStudents();
    displayCourses();
  } catch (error) {
    console.error("Error loading admin data:", error);
    showToast("Failed to load admin data. Please refresh the page.", "error");
  }
}

function updateAdminSummary() {
  const studentCount = document.getElementById("adminStudentCount");
  const courseCount = document.getElementById("adminCourseCount");
  const departmentCount = document.getElementById("adminDepartmentCount");

  if (studentCount) studentCount.textContent = students.length.toLocaleString();
  if (courseCount) courseCount.textContent = courses.length.toLocaleString();

  const departments = new Set(
    students
      .map((student) => String(student.department || "").trim())
      .filter(Boolean),
  );

  if (departmentCount) {
    departmentCount.textContent = departments.size.toLocaleString();
  }
}

function showLoading(type) {
  if (type === "students") {
    const tbody = document.getElementById("studentsBody");
    if (tbody) tbody.innerHTML = makeLoadingRow(5, "Loading students...");
  }

  if (type === "courses") {
    const tbody = document.getElementById("coursesBody");
    if (tbody) tbody.innerHTML = makeLoadingRow(4, "Loading courses...");
  }
}

function displayStudents() {
  const tbody = document.getElementById("studentsBody");
  if (!tbody) return;

  if (!students.length) {
    tbody.innerHTML = makeEmptyRow(
      5,
      "No students found",
      'Click "Add Student" to create your first student record.',
      "students",
    );
    return;
  }

  let html = "";

  students.forEach((student) => {
    html += `
      <tr data-student-id="${escapeHtml(student.id)}" class="hover:bg-slate-50 transition-colors">
        <td class="px-5 py-4 font-semibold text-slate-900">${escapeHtml(student.name)}</td>
        <td class="px-5 py-4">
          <span class="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700 border border-slate-200">
            ${escapeHtml(student.matric_no)}
          </span>
        </td>
        <td class="px-5 py-4 text-slate-600">${escapeHtml(student.department)}</td>
        <td class="px-5 py-4">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${levelBadgeClass(student.level)}">
            ${escapeHtml(student.level)}
          </span>
        </td>
        <td class="px-5 py-4">
          <div class="flex items-center gap-2">
            <button
              onclick="editStudent('${escapeHtml(student.id)}')"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-blue-50 hover:text-primary hover:border-blue-100 transition-all"
              title="Edit student"
              aria-label="Edit student"
            >
              ${actionButtonSvg("edit")}
            </button>

            <button
              onclick="deleteStudent('${escapeHtml(student.id)}')"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
              title="Delete student"
              aria-label="Delete student"
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

function displayCourses() {
  const tbody = document.getElementById("coursesBody");
  if (!tbody) return;

  if (!courses.length) {
    tbody.innerHTML = makeEmptyRow(
      4,
      "No courses found",
      'Click "Add Course" to create your first course record.',
      "courses",
    );
    return;
  }

  let html = "";

  courses.forEach((course) => {
    html += `
      <tr data-course-id="${escapeHtml(course.id)}" class="hover:bg-slate-50 transition-colors">
        <td class="px-5 py-4">
          <span class="inline-flex items-center rounded-xl bg-blue-50 px-3 py-1.5 font-mono text-sm font-semibold text-primary border border-blue-100">
            ${escapeHtml(course.course_code)}
          </span>
        </td>
        <td class="px-5 py-4">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            ${escapeHtml(course.credit_unit)} ${Number(course.credit_unit) === 1 ? "Unit" : "Units"}
          </span>
        </td>
        <td class="px-5 py-4">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${semesterBadgeClass(course.semester)}">
            ${escapeHtml(course.semester || "1st")} Semester
          </span>
        </td>
        <td class="px-5 py-4">
          <div class="flex items-center gap-2">
            <button
              onclick="editCourse('${escapeHtml(course.id)}')"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-blue-50 hover:text-primary hover:border-blue-100 transition-all"
              title="Edit course"
              aria-label="Edit course"
            >
              ${actionButtonSvg("edit")}
            </button>

            <button
              onclick="deleteCourse('${escapeHtml(course.id)}')"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
              title="Delete course"
              aria-label="Delete course"
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

function resetStudentForm() {
  const form = document.getElementById("studentForm");
  if (form) form.reset();
  document.getElementById("studentId").value = "";
  document.getElementById("studentModalTitle").textContent = "Add Student";
}

function resetCourseForm() {
  const form = document.getElementById("courseForm");
  if (form) form.reset();
  document.getElementById("courseId").value = "";
  document.getElementById("courseModalTitle").textContent = "Add Course";
}

async function loadStudents() {
  try {
    students = await apiCall("/admin/students/");
    updateAdminSummary();
    displayStudents();
  } catch (error) {
    console.error("Failed to load students:", error);
    showToast("Failed to load students", "error");
  }
}

async function loadCourses() {
  try {
    courses = await apiCall("/admin/courses/");
    updateAdminSummary();
    displayCourses();
  } catch (error) {
    console.error("Failed to load courses:", error);
    showToast("Failed to load courses", "error");
  }
}

function editStudent(id) {
  const student = students.find((s) => s.id === id);

  if (student) {
    document.getElementById("studentId").value = student.id;
    document.getElementById("studentName").value = student.name;
    document.getElementById("studentMatric").value = student.matric_no;
    document.getElementById("studentDepartment").value = student.department;
    document.getElementById("studentLevel").value = student.level;
    document.getElementById("studentModalTitle").textContent = "Edit Student";
    openModal("studentModal");
    return;
  }

  apiCall(`/admin/students/${id}`)
    .then((result) => {
      document.getElementById("studentId").value = result.id;
      document.getElementById("studentName").value = result.name;
      document.getElementById("studentMatric").value = result.matric_no;
      document.getElementById("studentDepartment").value = result.department;
      document.getElementById("studentLevel").value = result.level;
      document.getElementById("studentModalTitle").textContent = "Edit Student";
      openModal("studentModal");
    })
    .catch((error) => {
      console.error("Failed to load student for edit:", error);
      showToast("Failed to load student details", "error");
    });
}

async function deleteStudent(id) {
  const confirmed = await showConfirm(
    "Are you sure you want to delete this student? This action cannot be undone.",
  );

  if (!confirmed) return;

  try {
    await apiCall(`/admin/students/${id}`, "DELETE");
    students = students.filter((s) => s.id !== id);
    updateAdminSummary();
    displayStudents();
    showToast("Student deleted successfully", "success");
  } catch (error) {
    console.error("Failed to delete student:", error);
    showToast("Failed to delete student", "error");
  }
}

async function saveStudent(event) {
  event.preventDefault();

  if (!validateForm("studentForm")) return;

  const studentData = {
    name: document.getElementById("studentName").value.trim(),
    matric_no: document.getElementById("studentMatric").value.trim(),
    department: document.getElementById("studentDepartment").value.trim(),
    level: parseInt(document.getElementById("studentLevel").value, 10),
  };

  if (!studentData.name || !studentData.matric_no || !studentData.department || !studentData.level) {
    showToast("Please fill in all fields", "error");
    return;
  }

  const studentId = document.getElementById("studentId").value;

  try {
    if (studentId) {
      const updated = await apiCall(`/admin/students/${studentId}`, "PUT", studentData);
      const index = students.findIndex((s) => s.id === studentId);
      if (index !== -1) {
        students[index] = updated || { ...students[index], ...studentData, id: studentId };
      }
      showToast("Student updated successfully", "success");
    } else {
      const response = await apiCall("/admin/students/", "POST", studentData);
      students.push(response);
      showToast("Student added successfully", "success");
    }

    updateAdminSummary();
    displayStudents();
    resetStudentForm();
    closeModal("studentModal");
  } catch (error) {
    console.error("Failed to save student:", error);
    showToast(`Failed to save student: ${error.message || "Unknown error"}`, "error");
  }
}

function editCourse(id) {
  const course = courses.find((c) => c.id === id);

  if (course) {
    document.getElementById("courseId").value = course.id;
    document.getElementById("courseCode").value = course.course_code;
    document.getElementById("creditUnit").value = course.credit_unit;
    document.getElementById("courseSemester").value = course.semester || "1st";
    document.getElementById("courseModalTitle").textContent = "Edit Course";
    openModal("courseModal");
    return;
  }

  apiCall(`/admin/courses/${id}`)
    .then((result) => {
      document.getElementById("courseId").value = result.id;
      document.getElementById("courseCode").value = result.course_code;
      document.getElementById("creditUnit").value = result.credit_unit;
      document.getElementById("courseSemester").value = result.semester || "1st";
      document.getElementById("courseModalTitle").textContent = "Edit Course";
      openModal("courseModal");
    })
    .catch((error) => {
      console.error("Failed to load course for edit:", error);
      showToast("Failed to load course details", "error");
    });
}

async function deleteCourse(id) {
  const confirmed = await showConfirm(
    "Are you sure you want to delete this course? This action cannot be undone.",
  );

  if (!confirmed) return;

  try {
    await apiCall(`/admin/courses/${id}`, "DELETE");
    courses = courses.filter((c) => c.id !== id);
    updateAdminSummary();
    displayCourses();
    showToast("Course deleted successfully", "success");
  } catch (error) {
    console.error("Failed to delete course:", error);
    showToast("Failed to delete course", "error");
  }
}

async function saveCourse(event) {
  event.preventDefault();

  if (!validateForm("courseForm")) return;

  const courseData = {
    course_code: document.getElementById("courseCode").value.trim().toUpperCase(),
    credit_unit: parseInt(document.getElementById("creditUnit").value, 10),
    semester: document.getElementById("courseSemester").value,
  };

  if (!courseData.course_code || !courseData.credit_unit || !courseData.semester) {
    showToast("Please fill in all fields", "error");
    return;
  }

  const courseId = document.getElementById("courseId").value;

  try {
    if (courseId) {
      const updated = await apiCall(`/admin/courses/${courseId}`, "PUT", courseData);
      const index = courses.findIndex((c) => c.id === courseId);
      if (index !== -1) {
        courses[index] = updated || { ...courses[index], ...courseData, id: courseId };
      }
      showToast("Course updated successfully", "success");
    } else {
      const response = await apiCall("/admin/courses/", "POST", courseData);
      courses.push(response);
      showToast("Course added successfully", "success");
    }

    updateAdminSummary();
    displayCourses();
    resetCourseForm();
    closeModal("courseModal");
  } catch (error) {
    console.error("Failed to save course:", error);
    showToast(`Failed to save course: ${error.message || "Unknown error"}`, "error");
  }
}

function searchStudents() {
  const searchText = document.getElementById("studentSearch")?.value.toLowerCase().trim() || "";
  const tbody = document.getElementById("studentsBody");
  if (!tbody) return;

  const existing = document.getElementById("noSearchResults");
  if (existing) existing.remove();

  const rows = Array.from(tbody.querySelectorAll("tr"));
  let visibleCount = 0;

  rows.forEach((row) => {
    if (row.id === "noSearchResults") return;
    const cells = row.cells;
    if (!cells || cells.length < 2) return;

    const name = cells[0].textContent.toLowerCase();
    const matric = cells[1].textContent.toLowerCase();
    const match = name.includes(searchText) || matric.includes(searchText);

    row.style.display = match ? "" : "none";
    if (match) visibleCount++;
  });

  if (visibleCount === 0 && students.length > 0 && searchText !== "") {
    const noResultsRow = document.createElement("tr");
    noResultsRow.id = "noSearchResults";
    noResultsRow.innerHTML = `
      <td colspan="5" class="py-16 text-center">
        <div class="flex flex-col items-center justify-center gap-4 text-slate-400">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            ${emptyStateSvg("generic")}
          </div>
          <div class="space-y-1">
            <p class="text-slate-600 font-semibold">No matching students found</p>
            <p class="text-sm text-slate-400">Try a different search for "${escapeHtml(searchText)}"</p>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(noResultsRow);
  }
}

function searchCourses() {
  const searchText = document.getElementById("courseSearch")?.value.toLowerCase().trim() || "";
  const tbody = document.getElementById("coursesBody");
  if (!tbody) return;

  const existing = document.getElementById("noCourseSearchResults");
  if (existing) existing.remove();

  const rows = Array.from(tbody.querySelectorAll("tr"));
  let visibleCount = 0;

  rows.forEach((row) => {
    if (row.id === "coursesLoadingRow" || row.id === "noCourseSearchResults") return;
    const cells = row.cells;
    if (!cells || cells.length < 2) return;

    const code = cells[0].textContent.toLowerCase();
    const match = code.includes(searchText);

    row.style.display = match ? "" : "none";
    if (match) visibleCount++;
  });

  if (visibleCount === 0 && courses.length > 0 && searchText !== "") {
    const noResultsRow = document.createElement("tr");
    noResultsRow.id = "noCourseSearchResults";
    noResultsRow.innerHTML = `
      <td colspan="4" class="py-16 text-center">
        <div class="flex flex-col items-center justify-center gap-4 text-slate-400">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            ${emptyStateSvg("generic")}
          </div>
          <div class="space-y-1">
            <p class="text-slate-600 font-semibold">No matching courses found</p>
            <p class="text-sm text-slate-400">Try a different search term</p>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(noResultsRow);
  }
}

function forceReload() {
  showToast("Reloading data...", "info");
  loadAllData();
}

window.loadStudents = loadStudents;
window.loadCourses = loadCourses;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.saveStudent = saveStudent;
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.saveCourse = saveCourse;
window.searchStudents = searchStudents;
window.searchCourses = searchCourses;
window.forceReload = forceReload;
window.resetStudentForm = resetStudentForm;
window.resetCourseForm = resetCourseForm;