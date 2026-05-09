# ScholarTrack ESP-32 S3 Dashboard

A lightweight, embedded web dashboard for library table monitoring that runs on ESP-32 S3 microcontroller.

## Features

- **Real-time Table Monitoring**: Track 8 library tables with status, warnings, and occupancy
- **Responsive Design**: Works on desktop and mobile devices
- **ESP-32 Integration**: Hardware alerts, sensor monitoring, and device control
- **Low Memory Footprint**: Optimized for embedded deployment
- **Offline Capability**: Full functionality without internet connection
- **Material Design UI**: Clean, modern interface with Tailwind CSS

## Hardware Requirements

### ESP-32 S3 Development Board
- ESP-32 S3 DevKit C-1 or similar
- Minimum 4MB flash storage (8MB+ recommended)
- WiFi connectivity
- Optional sensors:
  - Temperature sensor (DHT22/DHT11)
  - Humidity sensor
  - Noise level sensor
  - Buzzer for alerts
  - LED indicators

### Pin Configuration (Default)
```cpp
const int TEMP_SENSOR_PIN = 4;     // Temperature sensor
const int HUMIDITY_SENSOR_PIN = 5;  // Humidity sensor  
const int NOISE_SENSOR_PIN = 6;    // Noise level sensor
const int BUZZER_PIN = 7;          // Alert buzzer
const int LED_PIN = 8;             // Status LED
```

## Software Requirements

### Development Environment
- PlatformIO IDE (recommended) or Arduino IDE
- ESP32 board support package
- LittleFS filesystem support

### Required Libraries
- ESP32WebServer
- ArduinoJson
- WiFi
- LittleFS
- ESPmDNS

## Installation

### 1. Clone/Download Project
```bash
git clone <repository-url>
cd esp32-s3
```

### 2. Configure WiFi
Open `src/main.cpp` and update WiFi credentials:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 3. Build and Upload
Using PlatformIO:
```bash
pio run --target upload
```

Using Arduino IDE:
1. Open `src/main.cpp`
2. Select ESP32 S3 board
3. Upload to device

### 4. Upload File System
The web files need to be uploaded to LittleFS:
```bash
pio run --target uploadfs
```

## Usage

### Access Dashboard
1. Connect to WiFi network
2. Open web browser
3. Navigate to ESP-32 IP address (shown in Serial Monitor)
4. Or use mDNS: `http://scholartrack.local`

### Dashboard Features
- **Floor Overview**: Real-time table status and warnings
- **Search**: Filter tables by ID or student information
- **Alerts**: Visual and audible alerts for critical situations
- **Settings**: Configure refresh intervals and thresholds
- **Mobile Support**: Responsive design for smartphones/tablets

### API Endpoints
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

## File Structure

```
esp32-s3/
├── src/
│   └── main.cpp              # ESP-32 main firmware
├── data/
│   ├── index.html            # Dashboard HTML
│   ├── styles.css            # Dashboard styles
│   └── script.js             # Dashboard JavaScript
├── platformio.ini           # PlatformIO configuration
└── README.md                 # This file
```

## Configuration

### WiFi Settings
Update SSID and password in `src/main.cpp`:
```cpp
const char* ssid = "YOUR_NETWORK_NAME";
const char* password = "YOUR_PASSWORD";
```

### Sensor Configuration
Modify pin definitions in `src/main.cpp`:
```cpp
const int TEMP_SENSOR_PIN = 4;
const int HUMIDITY_SENSOR_PIN = 5;
const int NOISE_SENSOR_PIN = 6;
```

### Update Intervals
Adjust timing constants in `src/main.cpp`:
```cpp
const unsigned long SENSOR_READ_INTERVAL = 5000;  // 5 seconds
const unsigned long DATA_UPDATE_INTERVAL = 10000; // 10 seconds
```

## Troubleshooting

### Common Issues

**Dashboard not loading**
- Check WiFi connection in Serial Monitor
- Verify LittleFS upload completed successfully
- Try accessing via IP address instead of mDNS

**Memory issues**
- Reduce CSS/JS file sizes
- Disable unused features in `main.cpp`
- Use ESP-32 S3 with more RAM

**Sensor reading errors**
- Check sensor wiring and pin assignments
- Verify sensor compatibility with 3.3V logic
- Add pull-up resistors if needed

**WiFi connection problems**
- Verify SSID and password are correct
- Check network range and interference
- Try creating AP mode as fallback

### Debug Mode
Enable debug output by setting:
```cpp
#define CORE_DEBUG_LEVEL 3
```

### Performance Optimization
- Reduce auto-refresh intervals
- Minimize DOM updates
- Use smaller font files
- Compress images and assets

## Development

### Adding New Features
1. Update HTML structure in `data/index.html`
2. Add styles in `data/styles.css`
3. Implement JavaScript in `data/script.js`
4. Add ESP-32 handlers in `src/main.cpp`
5. Upload filesystem changes

### Custom Styling
Modify CSS variables in `data/styles.css`:
```css
:root {
  --primary-color: #051125;
  --secondary-color: #83540c;
  --error-color: #ba1a1a;
}
```

### Sensor Integration
Add new sensors in `src/main.cpp`:
```cpp
void readNewSensor() {
  // Read sensor value
  // Update dashboard data
  // Trigger alerts if needed
}
```

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check Serial Monitor output
2. Verify hardware connections
3. Review configuration settings
4. Consult ESP-32 documentation

## Version History

- **v1.0.0** - Initial release with basic dashboard functionality
- **v1.1.0** - Added mobile support and sensor integration
- **v1.2.0** - Optimized for ESP-32 S3 with LittleFS
