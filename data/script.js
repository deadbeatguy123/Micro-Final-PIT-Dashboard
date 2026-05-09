// ESP-32 Dashboard JavaScript
let dashboardData = {
    tables: [],
    occupancy: { current: 0, max: 200 },
    warnings: 0,
    sensors: { temperature: 0, humidity: 0, noiseLevel: 0 }
};

let refreshInterval = 10000; // 10 seconds
let autoRefreshTimer = null;

// DOM Elements
let sidebar, mobileMenuToggle, tablesGrid, searchInput, refreshIntervalSelect;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    fetchInitialData();
    startAutoRefresh();
});

function initializeElements() {
    sidebar = document.getElementById('sidebar');
    mobileMenuToggle = document.getElementById('mobileMenuToggle');
    tablesGrid = document.getElementById('tablesGrid');
    searchInput = document.getElementById('searchInput');
    refreshIntervalSelect = document.getElementById('refreshInterval');
}

function setupEventListeners() {
    // Mobile menu toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }

    // Navigation
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Settings
    if (refreshIntervalSelect) {
        refreshIntervalSelect.addEventListener('change', updateRefreshInterval);
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                closeMobileMenu();
            }
        }
    });
}

function fetchInitialData() {
    fetch('/api/dashboard')
        .then(response => response.json())
        .then(data => {
            dashboardData = data;
            renderTables();
            updateStats();
            updateConnectionStatus(true);
        })
        .catch(error => {
            console.error('Error fetching dashboard data:', error);
            updateConnectionStatus(false);
            // Use fallback data for demo
            useFallbackData();
        });

    // Fetch sensor data
    fetchSensorData();
}

function fetchSensorData() {
    fetch('/api/sensors')
        .then(response => response.json())
        .then(data => {
            dashboardData.sensors = data;
            updateSensorDisplay();
        })
        .catch(error => {
            console.error('Error fetching sensor data:', error);
        });
}

function useFallbackData() {
    dashboardData = {
        tables: [
            { id: 'A1', status: 'noisy', warnings: 2, maxWarnings: 3, studentCount: 2 },
            { id: 'A2', status: 'quiet', warnings: 0, maxWarnings: 3, studentCount: 0, available: true },
            { id: 'A3', status: 'moderate', warnings: 0, maxWarnings: 3, studentCount: 1 },
            { id: 'A4', status: 'critical', warnings: 3, maxWarnings: 3, studentCount: 1 },
            { id: 'B1', status: 'quiet', warnings: 0, maxWarnings: 3, studentCount: 1 },
            { id: 'B2', status: 'moderate', warnings: 1, maxWarnings: 3, studentCount: 1 },
            { id: 'B3', status: 'quiet', warnings: 0, maxWarnings: 3, studentCount: 0, available: true },
            { id: 'B4', status: 'quiet', warnings: 0, maxWarnings: 3, studentCount: 1 }
        ],
        occupancy: { current: 142, max: 200 },
        warnings: 8,
        sensors: { temperature: 22.5, humidity: 45.0, noiseLevel: 65 }
    };
    
    renderTables();
    updateStats();
    updateSensorDisplay();
}

function toggleMobileMenu() {
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

function closeMobileMenu() {
    if (sidebar) {
        sidebar.classList.remove('open');
    }
}

function navigateToPage(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    
    // Show selected page
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) {
        pageElement.classList.remove('hidden');
    }

    // Update navigation active states
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });

    // Close mobile menu
    if (window.innerWidth <= 768) {
        closeMobileMenu();
    }
}

function renderTables(searchTerm = '') {
    if (!tablesGrid) return;

    const filteredTables = searchTerm 
        ? dashboardData.tables.filter(table => 
            table.id.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : dashboardData.tables;

    tablesGrid.innerHTML = filteredTables.map(table => createTableCard(table)).join('');
}

function createTableCard(table) {
    if (table.available) {
        return `
            <div class="table-card available">
                <div class="table-header">
                    <span class="table-name">Table ${table.id}</span>
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

    const isCritical = table.status === 'critical';
    const statusClass = table.status === 'noisy' ? 'noisy' : table.status;
    
    return `
        <div class="table-card ${isCritical ? 'critical' : ''}">
            <div class="table-header ${isCritical ? 'critical-header' : ''}">
                <span class="table-name ${isCritical ? '' : ''}">Table ${table.id}</span>
                <div class="table-status">
                    <span class="status-indicator ${statusClass}"></span>
                    <span class="status-text ${statusClass}">${isCritical ? 'Critical' : table.status.charAt(0).toUpperCase() + table.status.slice(1)}</span>
                    ${isCritical ? '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1; font-size: 16px;">warning</span>' : ''}
                </div>
            </div>
            <div class="${isCritical ? 'critical-content' : 'table-content'}">
                <div class="warnings-section">
                    <span class="warnings-label ${isCritical ? 'critical-warnings-label' : ''}">Warnings</span>
                    <div class="warnings-bar">
                        ${generateWarningBars(table.warnings, table.maxWarnings)}
                        <span class="warnings-count">${table.warnings}/${table.maxWarnings}</span>
                    </div>
                </div>
                <div class="students-section">
                    <span class="students-label">Seated Students</span>
                    <div class="student-item">
                        <div class="student-info">
                            <div class="student-avatar avatar-primary">${table.studentCount > 0 ? 'ST' : ''}</div>
                            <div class="student-details">
                                <p class="student-name ${isCritical ? 'critical-student-name' : ''}">${table.studentCount} student${table.studentCount !== 1 ? 's' : ''}</p>
                                <p class="student-id ${isCritical ? 'critical-student-id' : ''}">ID: #${Math.floor(Math.random() * 90000) + 10000}</p>
                            </div>
                        </div>
                        <div class="student-actions">
                            <span class="material-symbols-outlined">more_vert</span>
                        </div>
                    </div>
                </div>
                ${isCritical ? '<button class="intervention-btn" onclick="dispatchIntervention(\'' + table.id + '\')">Dispatch Intervention</button>' : ''}
            </div>
        </div>
    `;
}

function generateWarningBars(warnings, maxWarnings) {
    let bars = '';
    for (let i = 0; i < maxWarnings; i++) {
        bars += `<div class="warning-bar-segment ${i < warnings ? 'active' : ''}"></div>`;
    }
    return bars;
}

function updateStats() {
    const occupancyElement = document.getElementById('occupancy');
    const warningsElement = document.getElementById('warnings');
    
    if (occupancyElement) {
        occupancyElement.textContent = `${dashboardData.occupancy.current} / ${dashboardData.occupancy.max}`;
    }
    
    if (warningsElement) {
        warningsElement.textContent = `${String(dashboardData.warnings).padStart(2, '0')} Active`;
    }
}

function updateSensorDisplay() {
    const sensorDataElement = document.getElementById('sensorData');
    if (sensorDataElement && dashboardData.sensors) {
        sensorDataElement.textContent = `Temp: ${dashboardData.sensors.temperature.toFixed(1)}°C | Humidity: ${dashboardData.sensors.humidity.toFixed(1)}% | Noise: ${dashboardData.sensors.noiseLevel}dB`;
    }
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.textContent = connected ? 'Connected' : 'Offline';
        statusElement.style.color = connected ? '#10b981' : '#ba1a1a';
    }
}

function handleSearch(e) {
    const searchTerm = e.target.value;
    renderTables(searchTerm);
}

function updateRefreshInterval() {
    const interval = parseInt(refreshIntervalSelect.value) * 1000;
    refreshInterval = interval;
    restartAutoRefresh();
}

function startAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
    
    autoRefreshTimer = setInterval(() => {
        refreshData();
    }, refreshInterval);
}

function restartAutoRefresh() {
    startAutoRefresh();
}

function refreshData() {
    fetch('/api/dashboard')
        .then(response => response.json())
        .then(data => {
            dashboardData = data;
            renderTables(searchInput ? searchInput.value : '');
            updateStats();
            updateConnectionStatus(true);
        })
        .catch(error => {
            console.error('Error refreshing data:', error);
            updateConnectionStatus(false);
        });

    fetchSensorData();
}

// Action Functions
function generateReport() {
    sendCommandToESP32('generate_report')
        .then(() => {
            alert('Report generation initiated on ESP-32');
        })
        .catch(error => {
            console.error('Error generating report:', error);
            alert('Failed to generate report');
        });
}

function showNotifications() {
    alert('Notifications panel - ESP-32 system alerts and warnings would appear here');
}

function showAccount() {
    alert('Account settings - ESP-32 device configuration would appear here');
}

function dispatchIntervention(tableId) {
    if (confirm(`Dispatch intervention for Table ${tableId}? This will notify library staff and activate ESP-32 alerts.`)) {
        sendCommandToESP32('dispatch_intervention')
            .then(() => {
                alert(`Intervention dispatched for Table ${tableId}`);
                // Reset table warnings locally
                const table = dashboardData.tables.find(t => t.id === tableId);
                if (table) {
                    table.warnings = 0;
                    table.status = 'moderate';
                    renderTables();
                    updateStats();
                }
            })
            .catch(error => {
                console.error('Error dispatching intervention:', error);
                alert('Failed to dispatch intervention');
            });
    }
}

function sendCommandToESP32(command) {
    return fetch('/api/command', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Command failed');
        }
        return response.json();
    });
}

// Network Status Monitoring
function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    console.log('Network status:', isOnline ? 'Online' : 'Offline');
    
    if (!isOnline) {
        updateConnectionStatus(false);
        console.warn('Device offline - showing cached data');
    }
}

// Listen for network status changes
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// Initialize network status
updateNetworkStatus();

// Performance optimization for ESP-32
function optimizeForESP32() {
    // Reduce animations and transitions for better performance
    const style = document.createElement('style');
    style.textContent = `
        * {
            animation-duration: 0.01ms !important;
            animation-delay: 0.01ms !important;
            transition-duration: 0.01ms !important;
            transition-delay: 0.01ms !important;
        }
    `;
    document.head.appendChild(style);
    
    console.log('ESP-32 optimizations applied');
}

// Initialize optimizations for embedded deployment
if (window.location.hostname === 'localhost' || window.location.hostname.includes('192.168') || window.location.hostname.includes('10.0')) {
    setTimeout(optimizeForESP32, 1000);
}

// Handle visibility change to pause/resume updates
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        }
    } else {
        startAutoRefresh();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
});
