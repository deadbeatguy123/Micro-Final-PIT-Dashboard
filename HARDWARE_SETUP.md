# Hardware Setup Guide for ESP-32 Dashboard

## Overview
This guide covers the physical hardware setup for the ScholarTrack Library Dashboard on ESP-32 S3, including optional sensors and alert systems.

## Required Components

### Core Components
| Component | Specification | Purpose |
|-----------|----------------|---------|
| ESP-32 S3 DevKit C-1 | 4MB+ Flash, WiFi, Bluetooth | Main controller and web server |
| USB Cable | USB-C to USB-A | Power and programming |
| Computer | Windows/Mac/Linux | Development and deployment |

### Optional Components
| Component | Specification | Purpose |
|-----------|----------------|---------|
| DHT22 Sensor | Temperature/Humidity | Environmental monitoring |
| Microphone Module | Analog/Digital | Noise level detection |
| Buzzer | 5V Piezo | Audio alerts |
| LED | 5mm Red/Green | Visual indicators |
| Breadboard | 400-point | Prototyping |
| Jumper Wires | M-F, F-F, M-M | Connections |
| Resistors | 10kΩ, 220Ω | Pull-up, current limiting |
| Power Supply | 5V 2A (optional) | Standalone power |

## Pin Configuration

### Default Pin Assignments
```cpp
// In src/main.cpp
const int TEMP_SENSOR_PIN = 4;     // DHT22 Data
const int HUMIDITY_SENSOR_PIN = 5;  // Not used (DHT22 handles both)
const int NOISE_SENSOR_PIN = 6;    // Microphone analog
const int BUZZER_PIN = 7;          // Buzzer control
const int LED_PIN = 8;             // Status LED
```

### ESP-32 S3 Pinout Reference
```
ESP-32 S3 DevKit C-1 Pinout:
┌─────────────────────────────────────┐
│  3V3  GND  IO1  IO2  IO3  IO4  IO5  │
│  IO6  IO7  IO8  IO9  IO10 IO11 IO12 │
│  IO13 IO14 IO15 IO16 IO17 IO18 IO19 │
│  IO20 IO21 IO22 IO23 IO24 IO25 IO26 │
│  IO27 IO28 IO29 IO30 IO31 IO32 IO33 │
│  IO34 IO35 IO36 IO37 IO38 IO39 IO40 │
│  IO41 IO42 IO43 IO44 IO45 IO46 IO47 │
│  IO48 5V   GND  GND  VIN  USB  USB  │
└─────────────────────────────────────┘
```

## Wiring Diagrams

### Basic Setup (ESP-32 Only)
```
ESP-32 S3
├── USB Cable → Computer (Power + Programming)
└── No additional connections required
```

### Full Setup with Sensors
```
ESP-32 S3 Connections:
├── Pin 4  → DHT22 Data
├── Pin 6  → Microphone A0
├── Pin 7  → Buzzer (+)
├── Pin 8  → LED (+) via 220Ω resistor
├── 3V3    → DHT22 VCC
├── 3V3    → Microphone VCC
├── GND    → DHT22 GND
├── GND    → Microphone GND
├── GND    → Buzzer (-)
└── GND    → LED (-)
```

### Detailed DHT22 Connection
```
DHT22 Sensor:
Pin 1 (VCC)  → ESP-32 3V3
Pin 2 (Data) → ESP-32 GPIO 4 + 10kΩ pull-up to 3V3
Pin 3 (NC)   → Not connected
Pin 4 (GND)  → ESP-32 GND
```

### Buzzer and LED Connection
```
Alert Components:
Buzzer (+) → ESP-32 GPIO 7
Buzzer (-) → ESP-32 GND

LED (+)    → 220Ω resistor → ESP-32 GPIO 8
LED (-)    → ESP-32 GND
```

## Assembly Instructions

### Step 1: Prepare Workspace
1. Clear work area
2. Gather all components
3. Verify ESP-32 powers on via USB
4. Install required drivers (CH340/CP210)

### Step 2: Basic Setup
1. Connect ESP-32 to computer via USB
2. Verify power LED illuminates
3. Test programming connection
4. Proceed to software deployment

### Step 3: Sensor Integration (Optional)

#### DHT22 Temperature/Humidity Sensor
1. Insert DHT22 into breadboard
2. Connect VCC to ESP-32 3V3 pin
3. Connect GND to ESP-32 GND pin
4. Connect Data to ESP-32 GPIO 4
5. Add 10kΩ pull-up resistor between Data and 3V3
6. Verify connections with multimeter

#### Microphone for Noise Detection
1. Insert microphone module into breadboard
2. Connect VCC to ESP-32 3V3 pin
3. Connect GND to ESP-32 GND pin
4. Connect Analog Output to ESP-32 GPIO 6
5. Adjust sensitivity if module has potentiometer

#### Alert System
1. Connect buzzer (+) to ESP-32 GPIO 7
2. Connect buzzer (-) to ESP-32 GND
3. Connect LED (+) to 220Ω resistor
4. Connect resistor other end to ESP-32 GPIO 8
5. Connect LED (-) to ESP-32 GND

### Step 4: Testing
1. Power on ESP-32
2. Monitor serial output (115200 baud)
3. Verify sensor readings appear
4. Test buzzer and LED functionality
5. Access dashboard via browser

## Enclosure Design

### 3D Printed Enclosure
```
Dimensions: 100mm x 80mm x 40mm
Features:
- ESP-32 mounting posts
- Sensor cutouts
- Ventilation holes
- USB access port
- Wall mounting tabs
```

### Laser Cut Acrylic Enclosure
```
Materials: 3mm acrylic sheets
Layers:
- Front panel (display cutout)
- Back panel (mounting holes)
- Side panels (ventilation)
- Top panel (sensor openings)
```

### Simple Project Box
`` off-the-shelf project box:
- Size: 120mm x 80mm x 50mm
- Modifications needed:
  - USB cable cutout
  - Ventilation holes
  - LED indicator holes
  - Mounting standoffs
```

## Power Options

### USB Power (Development)
- Source: Computer USB port
- Voltage: 5V
- Current: 500mA (sufficient)
- Use: Development and testing

### USB Power Adapter
- Source: Wall adapter
- Voltage: 5V 2A
- Use: Semi-permanent installation
- Advantage: Stable power

### Battery Power (Portable)
- Source: Li-ion battery pack
- Voltage: 3.7V - 5V
- Capacity: 2000mAh+ recommended
- Use: Mobile/temporary deployment
- Need: Voltage regulator for 5V sensors

### Power over Ethernet (PoE)
- Source: PoE injector
- Voltage: 48V (regulated to 5V)
- Use: Professional installation
- Advantage: Single cable for power+data

## Network Setup

### WiFi Configuration
```cpp
// In src/main.cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// For enterprise networks
const char* ssid = "ENTERPRISE_NETWORK";
const char* username = "your_username";
const char* password = "your_password";
```

### Static IP Assignment
```cpp
// Optional: Set static IP
IPAddress local_IP(192, 168, 1, 100);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);

WiFi.config(local_IP, gateway, subnet);
```

### Network Range Considerations
- Maximum range: ~50m indoor, ~150m outdoor
- Walls reduce range by 30-50%
- Metal enclosures block signal
- Use WiFi extender for large areas

## Calibration and Testing

### DHT22 Sensor Calibration
1. Place sensor alongside calibrated thermometer
2. Read values for 30 minutes
3. Calculate offset: `calibrated_temp = raw_temp + offset`
4. Update firmware with calibration values
5. Verify humidity readings against hygrometer

### Microphone Calibration
1. Test with known sound levels
2. Adjust analog reading thresholds
3. Set noise level categories:
   - Quiet: < 50dB
   - Moderate: 50-70dB
   - Noisy: > 70dB

### Alert System Testing
1. Test buzzer volume levels
2. Verify LED brightness
3. Test alert timing and duration
4. Check battery impact of alerts

## Troubleshooting Hardware

### Common Issues

**ESP-32 won't power on**
- Check USB cable and port
- Verify 5V power supply
- Test with different USB cable
- Check for short circuits

**Sensor not detected**
- Verify wiring connections
- Check pull-up resistor (DHT22)
- Test sensor with multimeter
- Replace faulty sensor

**WiFi connection issues**
- Check signal strength
- Verify SSID/password
- Try different WiFi network
- Reset WiFi settings

**Alerts not working**
- Check buzzer polarity
- Verify LED orientation
- Test with direct GPIO control
- Check resistor values

### Diagnostic Tools

#### Multimeter Tests
```bash
# Voltage checks
3V3 pin: Should read 3.3V
5V pin: Should read 5V (when powered)
GND pin: Should read 0V

# Continuity checks
GPIO to sensor: Should beep
Power connections: Should beep
Ground connections: Should beep
```

#### Serial Monitor Output
```
Expected output:
ESP-32 Dashboard Starting
LittleFS mounted successfully
Connecting to WiFi...
WiFi connected!
IP Address: 192.168.1.123
Web server started
Reading sensors: Temp=22.5°C, Humidity=45%
Dashboard ready: http://192.168.1.123
```

#### Network Testing
```bash
# Ping ESP-32
ping 192.168.1.123

# Test web server
curl http://192.168.1.123/api/dashboard

# Test mDNS
nslookup scholartrack.local
```

## Maintenance and Upkeep

### Regular Maintenance
- Clean sensor housings monthly
- Check wiring connections
- Verify power supply stability
- Update firmware as needed
- Calibrate sensors quarterly

### Environmental Considerations
- Operating temperature: 0-50°C
- Humidity range: 20-80% RH
- Avoid direct sunlight
- Protect from moisture
- Ensure adequate ventilation

### Long-term Reliability
- Use quality components
- Provide proper strain relief
- Implement surge protection
- Regular backup of configuration
- Monitor for component degradation

---

## Quick Reference

### Pin Summary
| Pin | Function | Connection |
|-----|----------|------------|
| 4   | DHT22 Data | Sensor + 10kΩ pull-up |
| 6   | Microphone | Analog input |
| 7   | Buzzer | Positive lead |
| 8   | LED | Through 220Ω resistor |
| 3V3 | Power | Sensors VCC |
| GND | Ground | All grounds |

### Required Tools
- Screwdriver set
- Wire strippers
- Multimeter
- Soldering iron (optional)
- Breadboard
- Jumper wires

### Safety Precautions
- Disconnect power before wiring
- Use correct voltage levels
- Avoid short circuits
- Provide proper ventilation
- Use ESD protection

This hardware setup guide provides everything needed to deploy the ScholarTrack dashboard on ESP-32 hardware, from basic development to full production installation.
