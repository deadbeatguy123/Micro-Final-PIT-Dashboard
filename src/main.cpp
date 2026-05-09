#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include "DHT.h"

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Web Server
WebServer server(80);

// Dashboard Data Structure
struct TableData {
  String id;
  String status;
  int warnings;
  int maxWarnings;
  int studentCount;
};

struct DashboardData {
  TableData tables[8];
  int occupancyCurrent;
  int occupancyMax;
  int activeWarnings;
  float temperature;
  float humidity;
  int noiseLevel;
};

DashboardData dashboardData;

// Sensor pins (example configuration)
const int TEMP_SENSOR_PIN = 4;
const int HUMIDITY_SENSOR_PIN = 5;
const int NOISE_SENSOR_PIN = 6;
const int BUZZER_PIN = 7;
const int LED_PIN = 8;

// Timing variables
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_READ_INTERVAL = 5000; // 5 seconds
unsigned long lastDataUpdate = 0;
const unsigned long DATA_UPDATE_INTERVAL = 10000; // 10 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Initialize pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(TEMP_SENSOR_PIN, INPUT);
  pinMode(HUMIDITY_SENSOR_PIN, INPUT);
  pinMode(NOISE_SENSOR_PIN, INPUT);
  
  // Initialize LittleFS
  if (!LittleFS.begin(true)) {
    Serial.println("An Error occurred while mounting LittleFS");
    return;
  }
  
  // Initialize dashboard data
  initializeDashboardData();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup web server routes
  setupServerRoutes();
  
  // Start server
  server.begin();
  Serial.println("HTTP server started");
  
  // Setup mDNS
  if (MDNS.begin("scholartrack")) {
    Serial.println("MDNS responder started");
  }
}

void loop() {
  server.handleClient();
  
  // Read sensors periodically
  if (millis() - lastSensorRead > SENSOR_READ_INTERVAL) {
    readSensors();
    lastSensorRead = millis();
  }
  
  // Update dashboard data periodically
  if (millis() - lastDataUpdate > DATA_UPDATE_INTERVAL) {
    updateDashboardData();
    lastDataUpdate = millis();
  }
  
  // Check for critical alerts
  checkCriticalAlerts();
  
  delay(10);
}

void initializeDashboardData() {
  // Initialize table data
  String tableIds[] = {"A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"};
  String statuses[] = {"noisy", "quiet", "moderate", "critical", "quiet", "moderate", "quiet", "quiet"};
  int warnings[] = {2, 0, 0, 3, 0, 1, 0, 0};
  int studentCounts[] = {2, 0, 1, 1, 1, 1, 0, 1};
  
  for (int i = 0; i < 8; i++) {
    dashboardData.tables[i].id = tableIds[i];
    dashboardData.tables[i].status = statuses[i];
    dashboardData.tables[i].warnings = warnings[i];
    dashboardData.tables[i].maxWarnings = 3;
    dashboardData.tables[i].studentCount = studentCounts[i];
  }
  
  dashboardData.occupancyCurrent = 142;
  dashboardData.occupancyMax = 200;
  dashboardData.activeWarnings = 8;
  dashboardData.temperature = 22.5;
  dashboardData.humidity = 45.0;
  dashboardData.noiseLevel = 65;
}

void connectToWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    // Blink LED to indicate successful connection
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
  } else {
    Serial.println("Failed to connect to WiFi");
    // Create AP mode as fallback
    WiFi.softAP("ScholarTrack-ESP32", "password123");
    Serial.print("AP IP address: ");
    Serial.println(WiFi.softAPIP());
  }
}

void setupServerRoutes() {
  // Serve main dashboard
  server.on("/", HTTP_GET, []() {
    if (LittleFS.exists("/index.html")) {
      File file = LittleFS.open("/index.html", "r");
      server.streamFile(file, "text/html");
      file.close();
    } else {
      server.send(404, "text/plain", "File not found");
    }
  });
  
  // Serve CSS
  server.on("/styles.css", HTTP_GET, []() {
    if (LittleFS.exists("/styles.css")) {
      File file = LittleFS.open("/styles.css", "r");
      server.streamFile(file, "text/css");
      file.close();
    } else {
      server.send(404, "text/plain", "CSS file not found");
    }
  });
  
  // Serve JavaScript
  server.on("/script.js", HTTP_GET, []() {
    if (LittleFS.exists("/script.js")) {
      File file = LittleFS.open("/script.js", "r");
      server.streamFile(file, "application/javascript");
      file.close();
    } else {
      server.send(404, "text/plain", "JS file not found");
    }
  });
  
  // API endpoint for dashboard data
  server.on("/api/dashboard", HTTP_GET, []() {
    String json = getDashboardJson();
    server.send(200, "application/json", json);
  });
  
  // API endpoint for sensor data
  server.on("/api/sensors", HTTP_GET, []() {
    String json = getSensorsJson();
    server.send(200, "application/json", json);
  });
  
  // API endpoint for commands
  server.on("/api/command", HTTP_POST, []() {
    String body = server.arg("plain");
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, body);
    
    String command = doc["command"];
    handleCommand(command);
    
    server.send(200, "application/json", "{\"status\":\"success\"}");
  });
  
  // API endpoint for table updates
  server.on("/api/table/update", HTTP_POST, []() {
    String body = server.arg("plain");
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, body);
    
    String tableId = doc["tableId"];
    String status = doc["status"];
    int warnings = doc["warnings"];
    
    updateTableData(tableId, status, warnings);
    
    server.send(200, "application/json", "{\"status\":\"updated\"}");
  });
  
  // Handle 404
  server.onNotFound([]() {
    server.send(404, "text/plain", "Not found");
  });
}

String getDashboardJson() {
  DynamicJsonDocument doc(4096);
  
  doc["occupancy"]["current"] = dashboardData.occupancyCurrent;
  doc["occupancy"]["max"] = dashboardData.occupancyMax;
  doc["warnings"] = dashboardData.activeWarnings;
  
  JsonArray tables = doc.createNestedArray("tables");
  for (int i = 0; i < 8; i++) {
    JsonObject table = tables.createNestedObject();
    table["id"] = dashboardData.tables[i].id;
    table["status"] = dashboardData.tables[i].status;
    table["warnings"] = dashboardData.tables[i].warnings;
    table["maxWarnings"] = dashboardData.tables[i].maxWarnings;
    table["studentCount"] = dashboardData.tables[i].studentCount;
  }
  
  String json;
  serializeJson(doc, json);
  return json;
}

String getSensorsJson() {
  DynamicJsonDocument doc(1024);
  
  doc["temperature"] = dashboardData.temperature;
  doc["humidity"] = dashboardData.humidity;
  doc["noiseLevel"] = dashboardData.noiseLevel;
  doc["timestamp"] = millis();
  
  String json;
  serializeJson(doc, json);
  return json;
}

void handleCommand(String command) {
  Serial.print("Received command: ");
  Serial.println(command);
  
  if (command == "generate_report") {
    generateReport();
  } else if (command == "dispatch_intervention") {
    dispatchIntervention();
  } else if (command == "reset_warnings") {
    resetAllWarnings();
  } else if (command == "test_buzzer") {
    testBuzzer();
  }
}

void updateTableData(String tableId, String status, int warnings) {
  for (int i = 0; i < 8; i++) {
    if (dashboardData.tables[i].id == tableId) {
      dashboardData.tables[i].status = status;
      dashboardData.tables[i].warnings = warnings;
      
      // Update critical status
      if (warnings >= 3) {
        dashboardData.tables[i].status = "critical";
        triggerAlert(tableId);
      }
      
      break;
    }
  }
  
  // Recalculate active warnings
  dashboardData.activeWarnings = 0;
  for (int i = 0; i < 8; i++) {
    dashboardData.activeWarnings += dashboardData.tables[i].warnings;
  }
}

void readSensors() {
  // Simulate sensor readings (replace with actual sensor code)
  dashboardData.temperature = 20.0 + (random(0, 100) / 10.0);
  dashboardData.humidity = 40.0 + (random(0, 200) / 10.0);
  dashboardData.noiseLevel = 50 + random(0, 30);
  
  Serial.print("Temperature: ");
  Serial.print(dashboardData.temperature);
  Serial.print("°C, Humidity: ");
  Serial.print(dashboardData.humidity);
  Serial.print("%, Noise: ");
  Serial.print(dashboardData.noiseLevel);
  Serial.println("dB");
}

void updateDashboardData() {
  // Simulate random updates to dashboard data
  int randomTable = random(0, 8);
  
  // Randomly update warnings
  if (random(0, 100) > 70) {
    if (dashboardData.tables[randomTable].warnings < dashboardData.tables[randomTable].maxWarnings) {
      dashboardData.tables[randomTable].warnings++;
      
      if (dashboardData.tables[randomTable].warnings >= 3) {
        dashboardData.tables[randomTable].status = "critical";
        triggerAlert(dashboardData.tables[randomTable].id);
      } else if (dashboardData.tables[randomTable].warnings >= 2) {
        dashboardData.tables[randomTable].status = "noisy";
      }
    }
  }
  
  // Randomly update occupancy
  if (random(0, 100) > 80) {
    if (dashboardData.occupancyCurrent < dashboardData.occupancyMax) {
      dashboardData.occupancyCurrent++;
    } else if (dashboardData.occupancyCurrent > 100) {
      dashboardData.occupancyCurrent--;
    }
  }
  
  // Recalculate active warnings
  dashboardData.activeWarnings = 0;
  for (int i = 0; i < 8; i++) {
    dashboardData.activeWarnings += dashboardData.tables[i].warnings;
  }
  
  Serial.print("Dashboard updated - Active warnings: ");
  Serial.println(dashboardData.activeWarnings);
}

void checkCriticalAlerts() {
  for (int i = 0; i < 8; i++) {
    if (dashboardData.tables[i].status == "critical") {
      // Flash LED for critical alerts
      static unsigned long lastFlash = 0;
      if (millis() - lastFlash > 500) {
        digitalWrite(LED_PIN, !digitalRead(LED_PIN));
        lastFlash = millis();
      }
      return;
    }
  }
  digitalWrite(LED_PIN, LOW);
}

void triggerAlert(String tableId) {
  Serial.print("CRITICAL ALERT: Table ");
  Serial.println(tableId);
  
  // Activate buzzer
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
  delay(100);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
}

void generateReport() {
  Serial.println("Generating report...");
  // In a real implementation, this would collect data and create a report file
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
}

void dispatchIntervention() {
  Serial.println("Dispatching intervention...");
  // In a real implementation, this would send notifications or activate hardware
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(300);
    digitalWrite(BUZZER_PIN, LOW);
    delay(300);
  }
}

void resetAllWarnings() {
  Serial.println("Resetting all warnings...");
  for (int i = 0; i < 8; i++) {
    dashboardData.tables[i].warnings = 0;
    if (dashboardData.tables[i].status == "critical" || dashboardData.tables[i].status == "noisy") {
      dashboardData.tables[i].status = "moderate";
    }
  }
  dashboardData.activeWarnings = 0;
}

void testBuzzer() {
  Serial.println("Testing buzzer...");
  digitalWrite(BUZZER_PIN, HIGH);
  delay(500);
  digitalWrite(BUZZER_PIN, LOW);
}
