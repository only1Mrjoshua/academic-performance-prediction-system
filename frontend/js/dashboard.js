let allStudents = [];
let filteredStudents = [];
let statistics = null;
let metrics = null;
let currentPage = 1;
const rowsPerPage = 10;

console.log("Dashboard page - Using API URL:", API_BASE);

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNumber(value, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  return Number(value).toLocaleString();
}

// NEW: Truncate to 2 decimal places without rounding
function truncateToTwoDecimals(value) {
  if (value === null || value === undefined || value === "") return "0.00";
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  // Truncate (floor) to 2 decimal places
  const truncated = Math.floor(num * 100) / 100;
  return truncated.toFixed(2);
}

// Keep old function for other uses that need 1 decimal
function formatOneDecimal(value, fallback = "0.0") {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num.toFixed(1);
}

function formatPercent(value, fallback = "0.0%") {
  if (value === null || value === undefined || value === "") return fallback;
  return `${Number(value).toFixed(1)}%`;
}

function metricPercent(value) {
  if (value === null || value === undefined || value === "") return "0.0%";
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function riskBadgeClass(riskStatus) {
  const risk = String(riskStatus || "").toLowerCase();
  if (risk === "high") return "bg-red-50 text-red-700 border border-red-100";
  if (risk === "medium") return "bg-amber-50 text-amber-700 border border-amber-100";
  return "bg-emerald-50 text-emerald-700 border border-emerald-100";
}

function statCard({
  label,
  value,
  subtext,
  valueClass = "text-slate-950",
  iconBg = "bg-blue-50 text-primary",
  iconSvg = "",
}) {
  return `
    <div class="stat-shell rounded-[28px] border border-slate-200/80 p-6 shadow-soft">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] font-bold text-slate-400">${label}</p>
          <p class="mt-3 text-4xl font-black tracking-tight ${valueClass}">${value}</p>
          <p class="mt-2 text-sm text-text-muted">${subtext}</p>
        </div>
        <div class="w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center">
          ${iconSvg}
        </div>
      </div>
    </div>
  `;
}

function metricCard(label, value) {
  return `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p class="text-xs uppercase tracking-[0.16em] text-slate-400 font-bold">${label}</p>
      <p class="mt-3 text-3xl font-black tracking-tight text-primary">${value}</p>
    </div>
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

function emptyStateRow(colspan, title, subtitle) {
  return `
    <tr>
      <td colspan="${colspan}" class="py-16 text-center">
        <div class="flex flex-col items-center justify-center gap-4 text-slate-400">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="11" cy="11" r="7"></circle>
              <path stroke-linecap="round" stroke-linejoin="round" d="m20 20-3.5-3.5"></path>
            </svg>
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

function updateWarningVisibility() {
  const warningElement = document.getElementById("predictionWarning");
  if (!warningElement) return;

  const hasZeroScores = allStudents.some(
    (student) => Number(student.predicted_score || 0) === 0,
  );

  warningElement.style.display = hasZeroScores ? "block" : "none";
  warningElement.classList.toggle("hidden", !hasZeroScores);
}

document.addEventListener("DOMContentLoaded", function () {
  loadAllData();
});

async function loadAllData() {
  showLoading();

  try {
    const [stats, modelMetrics, studentsData] = await Promise.all([
      apiCall("/dashboard/statistics").catch((err) => {
        console.error("Failed to load statistics:", err);
        return null;
      }),
      apiCall("/dashboard/model-metrics").catch((err) => {
        console.error("Failed to load metrics:", err);
        return null;
      }),
      apiCall("/dashboard/students").catch((err) => {
        console.error("Failed to load students:", err);
        return [];
      }),
    ]);

    statistics = stats;
    metrics = modelMetrics;
    allStudents = Array.isArray(studentsData) ? studentsData : [];
    filteredStudents = [...allStudents];

    updateWarningVisibility();
    displayStatistics();
    displayMetrics();
    displayStudents();
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showToast("Failed to load dashboard data", "error");
  }
}

function showLoading() {
  const tbody = document.getElementById("studentsBody");
  if (tbody) {
    tbody.innerHTML = loadingRow(8, "Loading student analytics...");
  }
}

function displayStatistics() {
  const statsGrid = document.getElementById("statistics");
  if (!statsGrid) return;

  if (!statistics) {
    statsGrid.innerHTML = `
      <div class="col-span-full rounded-[28px] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-soft">
        No statistics available
      </div>
    `;
    return;
  }

  statsGrid.innerHTML = `
    ${statCard({
      label: "Total Students",
      value: formatNumber(statistics.total_students, "0"),
      subtext: "Students currently tracked across the institution",
      valueClass: "text-slate-950",
      iconBg: "bg-blue-50 text-primary",
      iconSvg: `
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372A3.375 3.375 0 0 0 21 16.125a3.375 3.375 0 0 0-2.25-3.176M15 19.128v-.003c0-1.113-.285-2.16-.786-3.072M15 4.872A9.353 9.353 0 0 0 12 4.5c-1.049 0-2.06.173-3 .49m6 14.138A9.353 9.353 0 0 1 12 19.5c-1.049 0-2.06-.173-3-.49m0 0A9.355 9.355 0 0 1 6.75 18.375a3.375 3.375 0 0 1-2.25-3.176 3.375 3.375 0 0 1 2.25-3.176m2.25 7.0a9.355 9.355 0 0 1-.786-3.072m0-7.902A9.355 9.355 0 0 0 9 5.625a3.375 3.375 0 0 0-2.25 3.176 3.375 3.375 0 0 0 2.25 3.176m0-7.0A9.353 9.353 0 0 1 12 4.5"/>
        </svg>
      `,
    })}
    ${statCard({
      label: "High Risk",
      value: formatNumber(statistics.high_risk, "0"),
      subtext: `${formatPercent(statistics.high_risk_percentage, "0.0%")} of total students`,
      valueClass: "text-red-600",
      iconBg: "bg-red-50 text-red-500",
      iconSvg: `
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008Zm8.25-.75c0 1.243-.998 2.25-2.25 2.25H5.999a2.25 2.25 0 0 1-1.948-3.375l6.001-10.5a2.25 2.25 0 0 1 3.896 0l6.002 10.5c.194.338.3.722.3 1.125Z"/>
        </svg>
      `,
    })}
    ${statCard({
      label: "Medium Risk",
      value: formatNumber(statistics.medium_risk, "0"),
      subtext: `${formatPercent(statistics.medium_risk_percentage, "0.0%")} of total students`,
      valueClass: "text-amber-500",
      iconBg: "bg-amber-50 text-amber-500",
      iconSvg: `
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2.25M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z"/>
        </svg>
      `,
    })}
    ${statCard({
      label: "Low Risk",
      value: formatNumber(statistics.low_risk, "0"),
      subtext: `${formatPercent(statistics.low_risk_percentage, "0.0%")} of total students`,
      valueClass: "text-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-600",
      iconSvg: `
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
        </svg>
      `,
    })}
  `;
}

function displayMetrics() {
  const metricsGrid = document.getElementById("metrics");
  if (!metricsGrid) return;

  if (!metrics || metrics.message) {
    metricsGrid.innerHTML = `
      <div class="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
        No model metrics available
      </div>
    `;
    return;
  }

  metricsGrid.innerHTML = `
    ${metricCard("Accuracy", metricPercent(metrics.accuracy))}
    ${metricCard("Precision", metricPercent(metrics.precision))}
    ${metricCard("Recall", metricPercent(metrics.recall))}
    ${metricCard("F1 Score", metricPercent(metrics.f1_score))}
  `;
}

function displayStudents() {
  const tbody = document.getElementById("studentsBody");
  if (!tbody) return;

  if (!allStudents.length) {
    tbody.innerHTML = emptyStateRow(
      8,
      "No student data available",
      "Student analytics will appear here once records are available.",
    );
    updatePagination();
    return;
  }

  applyFilters();

  if (!filteredStudents.length) {
    tbody.innerHTML = emptyStateRow(
      8,
      "No matching students found",
      "Try changing your search or filter criteria.",
    );
    updatePagination();
    return;
  }

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedStudents = filteredStudents.slice(start, end);

  let html = "";

  paginatedStudents.forEach((student) => {
    // Use truncateToTwoDecimals instead of formatOneDecimal
    const cgpa = truncateToTwoDecimals(student.cumulative_gpa);
    const firstSemGpa = truncateToTwoDecimals(student.first_semester_gpa);
    const secondSemGpa = truncateToTwoDecimals(student.second_semester_gpa);

    html += `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-5 py-4 text-slate-700">
          <span class="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700 border border-slate-200">
            ${escapeHtml(student.matric_no || "N/A")}
          </span>
        </td>
        <td class="px-5 py-4 font-semibold text-slate-900">${escapeHtml(student.student_name || "N/A")}</td>
        <td class="px-5 py-4 text-slate-700">${escapeHtml(student.level || "N/A")}</td>
        <td class="px-5 py-4 text-slate-700">${escapeHtml(student.department || "N/A")}</td>
        <td class="px-5 py-4 text-slate-700 font-semibold">${cgpa}</td>
        <td class="px-5 py-4 text-slate-700">${firstSemGpa}</td>
        <td class="px-5 py-4 text-slate-700">${secondSemGpa}</td>
        <td class="px-5 py-4">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${riskBadgeClass(student.risk_status)}">
            ${escapeHtml(student.risk_status || "Unknown")}
          </span>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  updatePagination();
}

function applyFilters() {
  const searchTerm =
    document.getElementById("searchInput")?.value.toLowerCase().trim() || "";
  const levelFilter = document.getElementById("levelFilter")?.value || "";
  const riskFilter = document.getElementById("riskFilter")?.value || "";

  filteredStudents = allStudents.filter((student) => {
    const matchesSearch =
      searchTerm === "" ||
      String(student.student_name || "").toLowerCase().includes(searchTerm) ||
      String(student.matric_no || "").toLowerCase().includes(searchTerm);

    const matchesLevel =
      levelFilter === "" || String(student.level || "") === String(levelFilter);

    const matchesRisk =
      riskFilter === "" || String(student.risk_status || "") === String(riskFilter);

    return matchesSearch && matchesLevel && matchesRisk;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / rowsPerPage));
  if (currentPage > totalPages) currentPage = 1;
}

function filterStudents() {
  currentPage = 1;
  displayStudents();
}

function updatePagination() {
  const paginationDiv = document.getElementById("pagination");
  if (!paginationDiv) return;

  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);

  if (totalPages <= 1) {
    paginationDiv.innerHTML = "";
    return;
  }

  let html = `<div class="flex flex-wrap items-center justify-center gap-2">`;

  html += `
    <button
      onclick="changePage(${currentPage - 1})"
      ${currentPage === 1 ? "disabled" : ""}
      class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      Previous
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `
        <button class="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-100">
          ${i}
        </button>
      `;
    } else {
      html += `
        <button
          onclick="changePage(${i})"
          class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
        >
          ${i}
        </button>
      `;
    }
  }

  html += `
    <button
      onclick="changePage(${currentPage + 1})"
      ${currentPage === totalPages ? "disabled" : ""}
      class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      Next
    </button>
  `;

  html += `</div>`;
  paginationDiv.innerHTML = html;
}

function changePage(page) {
  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  displayStudents();
}

async function generatePredictions() {
  const generateButton = document.querySelector(
    '#predictionWarning button[onclick="generatePredictions()"]',
  );

  if (generateButton) {
    generateButton.disabled = true;
    generateButton.textContent = "Generating...";
  }

  try {
    const result = await apiCall("/prediction/generate-all", "POST");
    showToast(
      `Generated predictions for ${result.predictions?.length || 0} students`,
      "success",
    );
    await loadAllData();
  } catch (error) {
    console.error("Failed to generate predictions:", error);
    showToast("Failed to generate predictions", "error");
  } finally {
    if (generateButton) {
      generateButton.disabled = false;
      generateButton.textContent = "Generate Predictions";
    }
  }
}

async function refreshDashboard() {
  const refreshBtn = document.getElementById("refreshBtn");

  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Refreshing...";
  }

  try {
    await loadAllData();
    showToast("Dashboard refreshed", "success");
  } catch (error) {
    console.error("Refresh failed:", error);
    showToast("Failed to refresh dashboard", "error");
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = "Refresh Dashboard";
    }
  }
}

function forceReload() {
  loadAllData();
}

function exportToCSV() {
  if (!filteredStudents.length) {
    showToast("No data to export", "warning");
    return;
  }

  const headers = [
    "Matric No",
    "Name",
    "Level",
    "Department",
    "CGPA",
    "1st Semester GPA",
    "2nd Semester GPA",
    "Risk Status",
  ];

  const rows = filteredStudents.map((student) => [
    student.matric_no || "N/A",
    student.student_name || "N/A",
    student.level || "N/A",
    student.department || "N/A",
    truncateToTwoDecimals(student.cumulative_gpa),
    truncateToTwoDecimals(student.first_semester_gpa),
    truncateToTwoDecimals(student.second_semester_gpa),
    student.risk_status || "Unknown",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `student_risk_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  showToast("CSV exported successfully", "success");
}

window.refreshDashboard = refreshDashboard;
window.filterStudents = filterStudents;
window.exportToCSV = exportToCSV;
window.changePage = changePage;
window.generatePredictions = generatePredictions;
window.forceReload = forceReload;