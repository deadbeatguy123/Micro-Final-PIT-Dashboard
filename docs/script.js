import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

/*
  Replace this with your Firebase Web App config.

  Firebase Console:
  Project Settings → General → Your apps → Web app → SDK setup and configuration

  Keep databaseURL pointed to your Realtime Database.
*/
const firebaseConfig = {
  apiKey: "AIzaSyA5pdzrqTI5_zmvcbgiK2bmPfpZcbXKrs8",
  authDomain: "micropit-91298.firebaseapp.com",
  databaseURL: "https://micropit-91298-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "micropit-91298",
  storageBucket: "micropit-91298.appspot.com",
  messagingSenderId: "313275626910",
  appId: "1:313275626910:web:ef334ed4d3a7f9fad2928f"
};

/*
  Confirmed mapping:
  devices/unit_A → Table A1

  Add more ESP32 units here later.
*/
const TABLE_CONFIG = [
  { id: "A1", unitId: "unit_A" },
  { id: "A2", unitId: "unit_B" },
  { id: "A3", unitId: "unit_C" },
  { id: "A4", unitId: "unit_D" },
  { id: "B1", unitId: "unit_E" },
  { id: "B2", unitId: "unit_F" },
  { id: "B3", unitId: "unit_G" },
  { id: "B4", unitId: "unit_H" }
];

const FIREBASE_DEVICES_PATH = "devices";
const SEATS_PER_TABLE = 4;
const DEFAULT_MAX_WARNINGS = 3;

let firebaseApp = null;
let database = null;
let firebaseDevices = {};

let dashboardData = {
  tables: [],
  occupancy: { current: 0, max: TABLE_CONFIG.length * SEATS_PER_TABLE },
  warnings: 0,
  sensors: {
    temperature: 0,
    humidity: 0,
    noiseLevel: 0
  }
};

let refreshInterval = 10000;
let autoRefreshTimer = null;

let sidebar = null;
let mobileMenuToggle = null;
let tablesGrid = null;
let searchInput = null;
let refreshIntervalSelect = null;
let warningThresholdSelect = null;
let logsContainer = null;

document.addEventListener("DOMContentLoaded", function () {
  initializeElements();
  setupEventListeners();
  renderEmptyDashboard();
  initializeFirebase();
  startAutoRefresh();
  updateNetworkStatus();
});

function initializeElements() {
  sidebar = document.getElementById("sidebar");
  mobileMenuToggle = document.getElementById("mobileMenuToggle");
  tablesGrid = document.getElementById("tablesGrid");
  searchInput = document.getElementById("searchInput");
  refreshIntervalSelect = document.getElementById("refreshInterval");
  warningThresholdSelect = document.getElementById("warningThreshold");
  logsContainer = document.querySelector(".logs-container");

  if (warningThresholdSelect) {
    warningThresholdSelect.value = String(DEFAULT_MAX_WARNINGS);
  }
}

function setupEventListeners() {
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", toggleMobileMenu);
  }

  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((item) => {
    item.addEventListener("click", function (event) {
      event.preventDefault();

      const page = this.getAttribute("data-page");

      if (page === "alerts") {
        showNotifications();
        return;
      }

      navigateToPage(page);
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
  }

  if (refreshIntervalSelect) {
    refreshIntervalSelect.addEventListener("change", updateRefreshInterval);
  }

  if (warningThresholdSelect) {
    warningThresholdSelect.addEventListener("change", function () {
      rebuildDashboardFromFirebase();
    });
  }

  document.addEventListener("click", function (event) {
    if (
      window.innerWidth <= 768 &&
      sidebar &&
      sidebar.classList.contains("open")
    ) {
      if (
        !sidebar.contains(event.target) &&
        mobileMenuToggle &&
        !mobileMenuToggle.contains(event.target)
      ) {
        closeMobileMenu();
      }
    }
  });

  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopAutoRefresh();
    } else {
      startAutoRefresh();
    }
  });

  window.addEventListener("beforeunload", function () {
    stopAutoRefresh();
  });
}

function initializeFirebase() {
  if (!isFirebaseConfigReady()) {
    console.error("Firebase config is incomplete. Replace the placeholder values in docs/script.js.");
    updateConnectionStatus(false, "Firebase config missing");
    return;
  }

  try {
    firebaseApp = initializeApp(firebaseConfig);
    database = getDatabase(firebaseApp);

    const devicesReference = ref(database, FIREBASE_DEVICES_PATH);

    onValue(
      devicesReference,
      function (snapshot) {
        firebaseDevices = snapshot.val() || {};
        rebuildDashboardFromFirebase();
        updateConnectionStatus(true, "Connected");
      },
      function (error) {
        console.error("Firebase listener error:", error);
        updateConnectionStatus(false, "Firebase error");
      }
    );
  } catch (error) {
    console.error("Firebase initialization error:", error);
    updateConnectionStatus(false, "Firebase init failed");
  }
}

function isFirebaseConfigReady() {
  const requiredValues = [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.databaseURL,
    firebaseConfig.projectId,
    firebaseConfig.appId
  ];

  return requiredValues.every(function (value) {
    return (
      typeof value === "string" &&
      value.trim() !== "" &&
      !value.includes("PASTE_YOUR")
    );
  });
}

function rebuildDashboardFromFirebase() {
  dashboardData = mapFirebaseDevicesToDashboard(firebaseDevices);

  renderTables(searchInput ? searchInput.value : "");
  renderLogs();
  updateStats();
  updateSensorDisplay();
}

function renderEmptyDashboard() {
  dashboardData = mapFirebaseDevicesToDashboard({});
  renderTables();
  renderLogs();
  updateStats();
  updateSensorDisplay();
}

function mapFirebaseDevicesToDashboard(devices) {
  const tables = TABLE_CONFIG.map(function (tableConfig) {
    const device = devices[tableConfig.unitId] || {};
    const audio = device.audio || {};

    const students = getCurrentStudentsFromDevice(device);
    const studentCount = students.length;

    const maxWarnings = getMaxWarnings(device);
    const warnings = getWarningCount(device, maxWarnings);
    const status = getStatus(device, audio, warnings, maxWarnings);

    return {
      id: tableConfig.id,
      unitId: tableConfig.unitId,
      device: device,
      audio: audio,
      status: status,
      warnings: warnings,
      maxWarnings: maxWarnings,
      studentCount: studentCount,
      students: students,
      available: studentCount === 0,
      noiseLevel: toNumber(audio.received_db, 0),
      updatedAt: audio.updated_at || device.updated_at || null
    };
  });

  const currentOccupancy = tables.reduce(function (sum, table) {
    return sum + table.studentCount;
  }, 0);

  const activeWarnings = tables.reduce(function (sum, table) {
    return sum + table.warnings;
  }, 0);

  const highestNoise = tables.reduce(function (max, table) {
    return Math.max(max, table.noiseLevel || 0);
  }, 0);

  return {
    tables: tables,
    occupancy: {
      current: currentOccupancy,
      max: tables.length * SEATS_PER_TABLE
    },
    warnings: activeWarnings,
    sensors: {
      temperature: 0,
      humidity: 0,
      noiseLevel: highestNoise
    }
  };
}

function getCurrentStudentsFromDevice(device) {
  /*
    Current project rule:
    qr_codes = students currently seated.

    Your uploaded Firebase JSON already uses:
    devices/unit_A/qr_codes
    devices/unit_A/audio
  */
  const source = device.current_students || device.qr_codes || {};
  const entries = getObjectEntries(source);

  return entries.map(function ([key, value]) {
    return normalizeStudentRecord(key, value);
  });
}

function normalizeStudentRecord(key, value) {
  const record = isPlainObject(value) ? value : { payload: String(value) };

  const payload = String(
    record.payload ||
    record.name ||
    record.student_name ||
    record.student_id ||
    key ||
    "Registered student"
  );

  const scannedAt =
    record.scanned_at ||
    record.created_at ||
    record.timestamp ||
    null;

  const hashLike = /^[a-f0-9]{32,}$/i.test(payload.trim());
  const idMatch = payload.match(/\b\d{6,12}\b/);

  let studentId = record.student_id || record.id || "";
  let name = record.name || record.student_name || "";
  let program = record.program || record.course || "";

  if (!studentId && idMatch) {
    studentId = idMatch[0];
  }

  if (!name && idMatch) {
    const beforeId = payload.slice(0, idMatch.index).trim();
    const afterId = payload.slice(idMatch.index + idMatch[0].length).trim();

    name = beforeId || "Registered Student";
    program = afterId || "";
  }

  if (!name && hashLike) {
    name = "Registered Student";
    studentId = `#${payload.slice(0, 8)}`;
  }

  if (!name) {
    name = payload || "Registered Student";
  }

  if (!studentId && !hashLike) {
    studentId = key;
  }

  return {
    key: key,
    payload: payload,
    name: name,
    studentId: studentId,
    program: program,
    scannedAt: scannedAt,
    initials: getInitials(name)
  };
}

function getMaxWarnings(device) {
  const selectedMaxWarnings = warningThresholdSelect
    ? toNumber(warningThresholdSelect.value, DEFAULT_MAX_WARNINGS)
    : DEFAULT_MAX_WARNINGS;

  const maxWarnings =
    device.max_warnings ??
    device.maxWarnings ??
    selectedMaxWarnings;

  return clamp(Math.round(toNumber(maxWarnings, DEFAULT_MAX_WARNINGS)), 1, 9);
}

function getWarningCount(device, maxWarnings) {
  const audio = device.audio || {};

  /*
    Supported Firebase fields:
    devices/unit_A/warning_count
    devices/unit_A/warnings
    devices/unit_A/audio/level

    Your current JSON has audio.level, so this works immediately.
  */
  const rawWarnings =
    device.warning_count ??
    device.warningCount ??
    device.warnings ??
    audio.warning_count ??
    audio.warningCount ??
    audio.warnings ??
    audio.level ??
    0;

  return clamp(Math.round(toNumber(rawWarnings, 0)), 0, maxWarnings);
}

function getStatus(device, audio, warnings, maxWarnings) {
  const manualStatus = String(
    device.status_override ||
    device.status ||
    audio.status ||
    ""
  ).toLowerCase();

  if (warnings >= maxWarnings) {
    return "critical";
  }

  if (["quiet", "moderate", "noisy", "critical"].includes(manualStatus)) {
    return manualStatus;
  }

  const receivedDb = toNumber(audio.received_db, 0);
  const noisyThreshold = toNumber(audio.noisy_threshold, 83);
  const loudThreshold = toNumber(audio.loud_threshold, 90);

  if (receivedDb >= loudThreshold) {
    return "noisy";
  }

  if (receivedDb >= noisyThreshold) {
    return "moderate";
  }

  return "quiet";
}

function toggleMobileMenu() {
  if (sidebar) {
    sidebar.classList.toggle("open");
  }
}

function closeMobileMenu() {
  if (sidebar) {
    sidebar.classList.remove("open");
  }
}

function navigateToPage(page) {
  document.querySelectorAll(".page").forEach(function (pageElement) {
    pageElement.classList.add("hidden");
  });

  const pageElement = document.getElementById(page + "Page");

  if (pageElement) {
    pageElement.classList.remove("hidden");
  }

  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach(function (item) {
    item.classList.remove("active");

    if (item.getAttribute("data-page") === page) {
      item.classList.add("active");
    }
  });

  if (window.innerWidth <= 768) {
    closeMobileMenu();
  }
}

function renderTables(searchTerm = "") {
  if (!tablesGrid) {
    return;
  }

  const normalizedSearch = String(searchTerm).trim().toLowerCase();

  const filteredTables = normalizedSearch
    ? dashboardData.tables.filter(function (table) {
        const tableMatches =
          table.id.toLowerCase().includes(normalizedSearch) ||
          table.unitId.toLowerCase().includes(normalizedSearch) ||
          table.status.toLowerCase().includes(normalizedSearch);

        const studentMatches = table.students.some(function (student) {
          return [
            student.name,
            student.studentId,
            student.program,
            student.payload
          ].some(function (value) {
            return String(value || "").toLowerCase().includes(normalizedSearch);
          });
        });

        return tableMatches || studentMatches;
      })
    : dashboardData.tables;

  tablesGrid.innerHTML = filteredTables.map(function (table) {
    return createTableCard(table);
  }).join("");
}

function createTableCard(table) {
  if (table.available) {
    return `
      <div class="table-card available">
        <div class="table-header">
          <span class="table-name">Table ${escapeHtml(table.id)}</span>

          <div class="table-status">
            <span class="status-indicator quiet"></span>
            <span class="status-text quiet">Quiet</span>
          </div>
        </div>

        <div class="available-content">
          <span class="material-symbols-outlined available-icon">event_seat</span>
          <span class="available-text">Available</span>
        </div>
      </div>
    `;
  }

  const isCritical = table.status === "critical";
  const statusClass = sanitizeStatus(table.status);
  const firstStudent = table.students[0] || null;

  const studentLine = firstStudent
    ? getStudentSubtext(firstStudent, table.studentCount)
    : "QR registered";

  return `
    <div class="table-card ${isCritical ? "critical" : ""}">
      <div class="table-header ${isCritical ? "critical-header" : ""}">
        <span class="table-name">Table ${escapeHtml(table.id)}</span>

        <div class="table-status">
          <span class="status-indicator ${statusClass}"></span>
          <span class="status-text ${statusClass}">
            ${isCritical ? "Critical" : capitalize(statusClass)}
          </span>
          ${isCritical ? '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1; font-size: 16px;">warning</span>' : ""}
        </div>
      </div>

      <div class="${isCritical ? "critical-content" : "table-content"}">
        <div class="warnings-section">
          <span class="warnings-label ${isCritical ? "critical-warnings-label" : ""}">Warnings</span>

          <div class="warnings-bar">
            ${generateWarningBars(table.warnings, table.maxWarnings)}
            <span class="warnings-count">${table.warnings}/${table.maxWarnings}</span>
          </div>
        </div>

        <div class="students-section">
          <span class="students-label">Seated Students</span>

          <div class="student-item">
            <div class="student-info">
              <div class="student-avatar avatar-primary">ST</div>

              <div class="student-details">
                <p class="student-name ${isCritical ? "critical-student-name" : ""}">
                  ${table.studentCount} student${table.studentCount !== 1 ? "s" : ""}
                </p>

                <p class="student-id ${isCritical ? "critical-student-id" : ""}">
                  ${escapeHtml(studentLine)}
                </p>
              </div>
            </div>

            <div class="student-actions">
              <span class="material-symbols-outlined">more_vert</span>
            </div>
          </div>
        </div>

        ${isCritical ? `<button class="intervention-btn" onclick="dispatchIntervention('${escapeHtml(table.id)}')">Dispatch Intervention</button>` : ""}
      </div>
    </div>
  `;
}

function generateWarningBars(warnings, maxWarnings) {
  let bars = "";

  for (let i = 0; i < maxWarnings; i += 1) {
    bars += `<div class="warning-bar-segment ${i < warnings ? "active" : ""}"></div>`;
  }

  return bars;
}

function renderLogs() {
  if (!logsContainer) {
    return;
  }

  const logs = [];

  dashboardData.tables.forEach(function (table) {
    table.students.forEach(function (student) {
      logs.push({
        time: normalizeTimestamp(student.scannedAt),
        action: `${student.name} seated at Table ${table.id}`
      });
    });

    if (table.warnings > 0) {
      logs.push({
        time: normalizeTimestamp(table.updatedAt),
        action: `Warning level ${table.warnings}/${table.maxWarnings} recorded for Table ${table.id}`
      });
    }
  });

  logs.sort(function (a, b) {
    return b.time - a.time;
  });

  if (logs.length === 0) {
    logsContainer.innerHTML = `
      <div class="log-entry">
        <span class="log-time">--:--</span>
        <span class="log-action">No Firebase QR scans yet.</span>
      </div>
    `;
    return;
  }

  logsContainer.innerHTML = logs.slice(0, 20).map(function (log) {
    return `
      <div class="log-entry">
        <span class="log-time">${escapeHtml(formatTime(log.time))}</span>
        <span class="log-action">${escapeHtml(log.action)}</span>
      </div>
    `;
  }).join("");
}

function updateStats() {
  const occupancyElement = document.getElementById("occupancy");
  const warningsElement = document.getElementById("warnings");

  if (occupancyElement) {
    occupancyElement.textContent =
      `${dashboardData.occupancy.current} / ${dashboardData.occupancy.max}`;
  }

  if (warningsElement) {
    warningsElement.textContent =
      `${String(dashboardData.warnings).padStart(2, "0")} Active`;
  }
}

function updateSensorDisplay() {
  const sensorDataElement = document.getElementById("sensorData");

  if (sensorDataElement && dashboardData.sensors) {
    const noiseLevel = toNumber(dashboardData.sensors.noiseLevel, 0);
    sensorDataElement.textContent = `Noise: ${noiseLevel.toFixed(2)}dB`;
  }
}

function updateConnectionStatus(connected, customText = "") {
  const statusElement = document.getElementById("connectionStatus");

  if (statusElement) {
    statusElement.textContent = customText || (connected ? "Connected" : "Offline");
    statusElement.style.color = connected ? "#10b981" : "#ba1a1a";
  }
}

function handleSearch(event) {
  const searchTerm = event.target.value;
  renderTables(searchTerm);
}

function updateRefreshInterval() {
  const interval = parseInt(refreshIntervalSelect.value, 10) * 1000;
  refreshInterval = interval;
  restartAutoRefresh();
}

function startAutoRefresh() {
  stopAutoRefresh();

  autoRefreshTimer = setInterval(function () {
    /*
      Firebase updates are already real-time through onValue().
      This interval only re-renders the current cached data.
    */
    rebuildDashboardFromFirebase();
  }, refreshInterval);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

function restartAutoRefresh() {
  startAutoRefresh();
}

function refreshData() {
  rebuildDashboardFromFirebase();
}

function generateReport() {
  const rows = [
    [
      "Table",
      "Unit",
      "Status",
      "Warnings",
      "Max Warnings",
      "Students",
      "Noise dB",
      "Last Updated"
    ]
  ];

  dashboardData.tables.forEach(function (table) {
    rows.push([
      `Table ${table.id}`,
      table.unitId,
      table.status,
      String(table.warnings),
      String(table.maxWarnings),
      String(table.studentCount),
      String(table.noiseLevel),
      table.updatedAt ? formatDateTime(normalizeTimestamp(table.updatedAt)) : ""
    ]);
  });

  const csv = rows.map(function (row) {
    return row.map(function (cell) {
      return `"${String(cell).replaceAll('"', '""')}"`;
    }).join(",");
  }).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `scholartrack-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function showNotifications() {
  const criticalTables = dashboardData.tables.filter(function (table) {
    return table.status === "critical";
  });

  const noisyTables = dashboardData.tables.filter(function (table) {
    return table.status === "noisy";
  });

  if (criticalTables.length === 0 && noisyTables.length === 0) {
    alert("No active noisy or critical table notifications.");
    return;
  }

  const messages = [];

  criticalTables.forEach(function (table) {
    messages.push(`Critical: Table ${table.id} needs intervention.`);
  });

  noisyTables.forEach(function (table) {
    messages.push(`Noisy: Table ${table.id} exceeded the loud threshold.`);
  });

  alert(messages.join("\n"));
}

function showAccount() {
  alert("ScholarTrack website dashboard connected to Firebase Realtime Database.");
}

async function dispatchIntervention(tableId) {
  const table = dashboardData.tables.find(function (item) {
    return item.id === tableId;
  });

  if (!table) {
    alert(`Table ${tableId} was not found.`);
    return;
  }

  const confirmed = confirm(
    `Dispatch intervention for Table ${tableId}? This will save an intervention request in Firebase.`
  );

  if (!confirmed) {
    return;
  }

  if (!database) {
    alert("Firebase is not connected yet.");
    return;
  }

  try {
    const interventionReference = push(ref(database, "interventions"));

    await set(interventionReference, {
      table_id: table.id,
      unit_id: table.unitId,
      student_count: table.studentCount,
      warning_count: table.warnings,
      max_warnings: table.maxWarnings,
      noise_level: table.noiseLevel,
      status: "dispatched",
      created_at: serverTimestamp()
    });

    await update(ref(database, `${FIREBASE_DEVICES_PATH}/${table.unitId}`), {
      intervention_requested: true,
      intervention_requested_at: serverTimestamp()
    });

    alert(`Intervention dispatched for Table ${tableId}.`);
  } catch (error) {
    console.error("Dispatch intervention failed:", error);
    alert("Failed to save intervention request. Check Firebase rules.");
  }
}

function updateNetworkStatus() {
  const isOnline = navigator.onLine;

  if (!isOnline) {
    updateConnectionStatus(false, "Browser offline");
  }
}

function getStudentSubtext(student, studentCount) {
  const parts = [];

  if (student.studentId) {
    parts.push(`ID: ${student.studentId}`);
  }

  if (student.program) {
    parts.push(student.program);
  }

  if (studentCount > 1) {
    parts.push(`${studentCount} QR entries`);
  }

  if (parts.length === 0) {
    return "QR registered";
  }

  return parts.join(" · ");
}

function getInitials(name) {
  const cleanName = String(name || "ST").trim();

  if (!cleanName || cleanName.toLowerCase() === "registered student") {
    return "ST";
  }

  const words = cleanName.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function getObjectEntries(value) {
  if (Array.isArray(value)) {
    return value
      .map(function (item, index) {
        return [String(index), item];
      })
      .filter(function ([, item]) {
        return item !== null && item !== undefined;
      });
  }

  if (isPlainObject(value)) {
    return Object.entries(value);
  }

  return [];
}

function isPlainObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function capitalize(value) {
  const stringValue = String(value || "");
  return stringValue.charAt(0).toUpperCase() + stringValue.slice(1);
}

function sanitizeStatus(status) {
  const cleanStatus = String(status || "quiet").toLowerCase();

  if (["quiet", "moderate", "noisy", "critical"].includes(cleanStatus)) {
    return cleanStatus;
  }

  return "quiet";
}

function normalizeTimestamp(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return Date.now();
  }

  if (number < 10000000000) {
    return number * 1000;
  }

  return number;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
  Inline onclick handlers in index.html need these functions on window
  because this file is now type="module".
*/
window.generateReport = generateReport;
window.showNotifications = showNotifications;
window.showAccount = showAccount;
window.dispatchIntervention = dispatchIntervention;