# ESP-32 S3 Dashboard Deployment Guide

## Overview
This guide will help you deploy the ScholarTrack Library Dashboard on an ESP-32 S3 microcontroller. The dashboard will run as a standalone web server accessible via WiFi.

## Hardware Requirements

### Required Components
1. **ESP-32 S3 Development Board** (DevKit C-1 recommended)
   - Minimum 4MB flash (8MB+ recommended)
   - Built-in WiFi capability
   - USB programming interface

2. **Computer for Development**
   - Windows/Mac/Linux with USB ports
   - Internet connection for initial setup

3. **Optional Hardware Add-ons**
   - DHT22 or DHT11 Temperature/Humidity Sensor
   - Sound level sensor (microphone module)
   - Buzzer for alerts
   - LED indicators
   - Breadboard and jumper wires

### Pin Configuration
```cpp
// Default pin assignments in main.cpp
const int TEMP_SENSOR_PIN = 4;     // Temperature sensor
const int HUMIDITY_SENSOR_PIN = 5;  // Humidity sensor  
const int NOISE_SENSOR_PIN = 6;    // Noise level sensor
const int BUZZER_PIN = 7;          // Alert buzzer
const int LED_PIN = 8;             // Status LED
```

## Software Setup

### 1. Install PlatformIO (Recommended)
```bash
# Install Python first, then:
pip install platformio
```

### 2. Alternative: Arduino IDE Setup
1. Install Arduino IDE 2.0+
2. Add ESP32 board support:
   - File → Preferences → Additional Boards Manager URLs
   - Add: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_dev_index.json`
3. Tools → Board → Boards Manager → Search "ESP32" → Install
4. Select "ESP32-S3 DevKitC-1" from Boards menu

## Configuration

### 1. WiFi Settings
Edit `src/main.cpp` and update your WiFi credentials:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. Hardware Configuration
Update pin assignments if using different pins:
```cpp
const int TEMP_SENSOR_PIN = 4;     // Change as needed
const int HUMIDITY_SENSOR_PIN = 5;  // Change as needed
const int NOISE_SENSOR_PIN = 6;    // Change as needed
const int BUZZER_PIN = 7;          // Change as needed
const int LED_PIN = 8;             // Change as needed
```

## Deployment Steps

### Method 1: PlatformIO (Recommended)

#### Step 1: Build Firmware
```bash
cd esp32-s3
pio run
```

#### Step 2: Upload Web Files to LittleFS
```bash
pio run --target uploadfs
```

#### Step 3: Upload Firmware
```bash
pio run --target upload
```

#### Step 4: Monitor Serial Output
```bash
pio device monitor
```

### Method 2: Arduino IDE

#### Step 1: Prepare Data Folder
1. Create a `data` folder in your Arduino sketch directory
2. Copy all web files to the `data` folder:
   - `index.html`
   - `styles.css`
   - `script.js`

#### Step 2: Install LittleFS Plugin
1. Download ESP32 LittleFS Data Upload tool
2. Extract to Arduino IDE tools directory
3. Restart Arduino IDE

#### Step 3: Upload Web Files
1. Tools → ESP32 LittleFS Data Upload
2. Wait for upload completion

#### Step 4: Upload Firmware
1. Open `src/main.cpp` in Arduino IDE
2. Select correct board and port
3. Click Upload button

## Hardware Connections (Optional Sensors)

### DHT22 Temperature/Humidity Sensor
```
DHT22 Pin 1 (VCC) → ESP32 3.3V
DHT22 Pin 2 (Data) → ESP32 GPIO 4
DHT22 Pin 3 (NC)   → Not connected
DHT22 Pin 4 (GND) → ESP32 GND
```
Add 10kΩ pull-up resistor between Data and VCC.

### Buzzer and LED
```
Buzzer (+) → ESP32 GPIO 7
Buzzer (-) → ESP32 GND

LED (+) → ESP32 GPIO 8
LED (-) → 220Ω resistor → ESP32 GND
```

## Testing and Verification

### 1. Power On and Connect
1. Connect ESP-32 to USB power
2. Open Serial Monitor (115200 baud)
3. Wait for WiFi connection message
4. Note the IP address displayed

### 2. Access Dashboard
1. Open web browser
2. Navigate to ESP-32 IP address (e.g., `http://192.168.1.123`)
3. Or use mDNS: `http://scholartrack.local`

### 3. Verify Features
- ✅ Dashboard loads correctly
- ✅ All 8 tables display with status
- ✅ Search functionality works
- ✅ Mobile responsive design
- ✅ Settings page accessible
- ✅ Real-time updates every 10 seconds

### 4. Test Hardware (if connected)
- ✅ LED indicators work
- ✅ Buzzer activates for critical alerts
- ✅ Sensor readings update in settings

## Troubleshooting

### Common Issues

**Dashboard doesn't load**
- Check LittleFS upload completed successfully
- Verify files are in correct `data/` folder
- Check Serial Monitor for errors
- Try accessing via IP address instead of mDNS

**WiFi connection fails**
- Verify SSID and password are correct
- Check network range and interference
- Try creating AP mode as fallback

**Memory issues**
- Reduce CSS/JS file sizes
- Use ESP-32 S3 with more RAM
- Disable unused features in firmware

**Sensor reading errors**
- Check sensor wiring and pin assignments
- Verify sensor compatibility with 3.3V logic
- Add pull-up resistors for I2C sensors

### Debug Mode
Enable debug output by setting in `platformio.ini`:
```ini
build_flags = 
    -DCORE_DEBUG_LEVEL=3
    -DCORE_DEBUG_LEVEL=ARDUHAL_LOG_LEVEL_DEBUG
```

## Advanced Configuration

### Custom Domain
Update mDNS hostname in firmware:
```cpp
if (MDNS.begin("custom-name")) {
    Serial.println("MDNS responder started");
}
```

### Security Features
Add basic authentication:
```cpp
// In server setup
server.on("/", HTTP_GET, []() {
    if (!server.authenticate("admin", "password")) {
        return server.requestAuthentication();
    }
    // Serve dashboard
});
```

### Power Management
Enable deep sleep for battery operation:
```cpp
#include "esp_sleep.h"
// Enter deep sleep after 5 minutes of inactivity
esp_sleep_enable_timer_wakeup(5 * 60 * 1000000);
esp_deep_sleep_start();
```

## Production Deployment

### 1. Enclosure Design
- 3D printed case for ESP-32 and sensors
- Ventilation for heat dissipation
- Access to USB port for programming
- Mounting options for wall/desk placement

### 2. Network Configuration
- Static IP assignment for reliable access
- Network failover configuration
- Remote monitoring capabilities

### 3. Maintenance
- Regular firmware updates
- Sensor calibration schedule
- Log rotation and cleanup
- Backup configuration

## API Reference

### Endpoints
- `GET /` - Main dashboard
- `GET /api/dashboard` - Dashboard data (JSON)
- `GET /api/sensors` - Sensor readings (JSON)
- `POST /api/command` - Send commands to ESP-32

### Commands
```json
{
  "command": "generate_report"
}
```
Available commands:
- `generate_report` - Generate system report
- `dispatch_intervention` - Trigger intervention alerts
- `reset_warnings` - Reset all table warnings
- `test_buzzer` - Test hardware buzzer

## Performance Optimization

### Memory Management
- Use PSRAM if available
- Implement file compression
- Cache frequently accessed data
- Limit concurrent connections

### Network Optimization
- Implement HTTP keep-alive
- Use gzip compression
- Optimize image sizes
- Implement CDN for external resources

### Power Optimization
- Use deep sleep between updates
- Optimize sensor reading frequency
- Implement power-saving modes
- Monitor battery levels

## Support and Maintenance

### Monitoring
- Serial output logging
- Network connectivity checks
- Sensor health monitoring
- Error reporting

### Updates
- OTA (Over-The-Air) updates
- Configuration backup/restore
- Firmware rollback capability
- Remote diagnostics

### Backup
- Configuration file backup
- Data export functionality
- System state snapshots
- Recovery procedures

---

## Quick Start Checklist

- [ ] Install PlatformIO or Arduino IDE
- [ ] Configure WiFi credentials
- [ ] Connect ESP-32 to computer
- [ ] Build and upload firmware
- [ ] Upload web files to LittleFS
- [ ] Test dashboard access
- [ ] Verify all features work
- [ ] Configure optional sensors
- [ ] Set up production environment

For additional support, check the Serial Monitor output and consult the ESP-32 documentation.
