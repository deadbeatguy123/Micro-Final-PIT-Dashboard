# Quick Start Guide: ESP-32 Dashboard Deployment

## 🚀 5-Minute Quick Start

### Prerequisites
- ESP-32 S3 development board
- USB cable
- Computer with internet
- WiFi network access

### Step 1: Install PlatformIO
```bash
pip install platformio
```

### Step 2: Configure WiFi
Edit `src/main.cpp`:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### Step 3: Connect ESP-32
1. Connect ESP-32 to computer via USB
2. Install drivers if needed (CH340/CP210)

### Step 4: Build and Deploy
```bash
cd esp32-s3
pio run                    # Build firmware
pio run --target uploadfs  # Upload web files
pio run --target upload    # Upload firmware
```

### Step 5: Access Dashboard
1. Open Serial Monitor: `pio device monitor`
2. Note the IP address shown
3. Open browser: `http://[IP_ADDRESS]`

## 📋 Detailed Steps

### 1. Project Setup
```bash
# Clone or download the project
cd esp32-s3

# Verify structure
ls src/main.cpp
ls data/index.html
ls platformio.ini
```

### 2. WiFi Configuration
Open `src/main.cpp` and update:
```cpp
const char* ssid = "YOUR_WIFI_SSID";        // Your WiFi name
const char* password = "YOUR_WIFI_PASSWORD"; // Your WiFi password
```

### 3. Hardware Connection (Optional)
```
ESP-32 Pin 4 → DHT22 Data
ESP-32 Pin 7 → Buzzer (+)
ESP-32 Pin 8 → LED (+)
ESP-32 GND  → All grounds
```

### 4. Build Process
```bash
# Clean build
pio run -t clean

# Build firmware
pio run

# Upload web files to LittleFS
pio run -t uploadfs

# Upload firmware
pio run -t upload
```

### 5. Monitor and Test
```bash
# Watch serial output
pio device monitor

# Test in browser
http://192.168.1.123  # Use IP from serial monitor
```

## 🔧 Common Commands

### PlatformIO Commands
```bash
pio run                    # Build
pio run -t upload         # Upload firmware
pio run -t uploadfs       # Upload filesystem
pio device monitor         # Serial monitor
pio run -t clean          # Clean build
pio project init           # Initialize project
```

### Troubleshooting Commands
```bash
pio device list            # List connected devices
pio run -t erase          # Erase flash completely
pio run -t uploadfs --force # Force filesystem upload
```

## 📱 Testing the Dashboard

### Basic Functionality
- [ ] Dashboard loads on mobile and desktop
- [ ] All 8 tables display correctly
- [ ] Search functionality works
- [ ] Settings page accessible
- [ ] Real-time updates every 10 seconds

### Hardware Tests (if connected)
- [ ] LED blinks on connection
- [ ] Buzzer sounds for critical alerts
- [ ] Sensor readings update in settings

### Network Tests
- [ ] Access via IP address
- [ ] mDNS works: `http://scholartrack.local`
- [ ] API endpoints respond:
  - `http://[IP]/api/dashboard`
  - `http://[IP]/api/sensors`

## 🚨 Troubleshooting

### Upload Issues
```bash
# Check device connection
pio device list

# Try different port
pio run -t upload --upload-port COM3

# Erase and reflash
pio run -t erase
pio run -t uploadfs
pio run -t upload
```

### Network Issues
```bash
# Check WiFi credentials
grep "ssid\|password" src/main.cpp

# Monitor connection
pio device monitor

# Try AP mode fallback
# Edit main.cpp to enable AP mode
```

### Dashboard Issues
```bash
# Check filesystem upload
pio run -t uploadfs --verbose

# Verify files exist
ls data/
ls build/littlefs/

# Re-upload web files
pio run -t uploadfs
```

## 📊 Performance Optimization

### Memory Usage
```cpp
// In platformio.ini
build_flags = 
    -DBOARD_HAS_PSRAM
    -mfix-esp32-psram-cache-issue
```

### Power Saving
```cpp
// Add to main.cpp for battery operation
#include "esp_sleep.h"
esp_sleep_enable_timer_wakeup(300000000); // 5 minutes
```

### Network Optimization
```cpp
// Add to server setup for better performance
server.sendHeader("Connection", "keep-alive");
server.sendHeader("Cache-Control", "public, max-age=3600");
```

## 🔄 Updates and Maintenance

### OTA Updates
```cpp
// Enable OTA in platformio.ini
upload_protocol = espota
upload_port = scholartrack.local
upload_flags = 
    --port=3232
    --auth=ota_password
```

### Backup Configuration
```bash
# Backup current setup
cp -r esp32-s3 esp32-s3-backup
git add .
git commit -m "Backup before update"
```

### Firmware Updates
```bash
# Update libraries
pio lib update

# Update platform
pio platform update

# Rebuild after updates
pio run -t clean
pio run
```

## 📞 Support

### Serial Monitor Output
```
Connecting to WiFi...
WiFi connected!
IP address: 192.168.1.123
MDNS responder started
HTTP server started
Dashboard ready at: http://192.168.1.123
```

### Common Error Messages
```
Error: LittleFS mount failed
→ Solution: Upload filesystem first with `pio run -t uploadfs`

Error: WiFi connection failed
→ Solution: Check SSID/password and network range

Error: File not found
→ Solution: Verify LittleFS upload completed successfully
```

### Getting Help
1. Check Serial Monitor output
2. Verify all files uploaded correctly
3. Test with minimal configuration
4. Consult full DEPLOYMENT_GUIDE.md

---

## ✅ Success Checklist

- [ ] WiFi credentials configured
- [ ] ESP-32 connected to computer
- [ ] Firmware built successfully
- [ ] Web files uploaded to LittleFS
- [ ] Firmware uploaded to device
- [ ] Dashboard accessible via browser
- [ ] All features tested and working

**🎉 Your ESP-32 Dashboard is now live!**
