#!/usr/bin/env python3
"""
ESP-32 LittleFS Data Upload Script
This script uploads web files to ESP-32 LittleFS filesystem.
"""

import os
import sys
import serial
import serial.tools.list_ports
import time
from pathlib import Path

# Configuration
DATA_DIR = "data"
BAUD_RATE = 115200
CHIP_FAMILY = "esp32s3"

def find_esp32_port():
    """Find ESP-32 serial port automatically"""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "CH340" in port.description or "CP210" in port.description or "USB" in port.description:
            print(f"Found ESP-32 on port: {port.device}")
            return port.device
    return None

def upload_to_littlefs(port, data_dir):
    """Upload files to LittleFS using esptool"""
    if not os.path.exists(data_dir):
        print(f"Error: Data directory '{data_dir}' not found")
        return False
    
    # Create LittleFS image
    print("Creating LittleFS image...")
    
    # Check if mklittlefs is available
    try:
        import subprocess
        result = subprocess.run(['mklittlefs', '--help'], capture_output=True, text=True)
        if result.returncode == 0:
            print("Using mklittlefs to create filesystem image")
            image_path = "littlefs.bin"
            
            # Create LittleFS image
            cmd = [
                'mklittlefs',
                '-c', data_dir,
                '-s', '0x200000',  # 2MB filesystem size
                image_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Error creating LittleFS image: {result.stderr}")
                return False
            
            print("LittleFS image created successfully")
            
            # Upload to ESP-32
            print("Uploading to ESP-32...")
            upload_cmd = [
                'esptool.py',
                '--chip', CHIP_FAMILY,
                '--port', port,
                '--baud', str(BAUD_RATE),
                'write_flash',
                '0x900000',  # LittleFS partition offset
                image_path
            ]
            
            result = subprocess.run(upload_cmd, capture_output=True, text=True)
            if result.returncode == 0:
                print("Upload completed successfully!")
                # Clean up image file
                os.remove(image_path)
                return True
            else:
                print(f"Upload failed: {result.stderr}")
                return False
                
    except FileNotFoundError:
        print("mklittlefs not found. Please install ESP32 tools:")
        print("pip install esptool")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("ESP-32 LittleFS Data Upload Tool")
    print("=" * 40)
    
    # Check data directory
    if not os.path.exists(DATA_DIR):
        print(f"Error: Data directory '{DATA_DIR}' not found")
        print("Please ensure the data directory contains:")
        print("  - index.html")
        print("  - styles.css") 
        print("  - script.js")
        return 1
    
    # List files to upload
    files = list(Path(DATA_DIR).rglob("*"))
    files = [f for f in files if f.is_file()]
    print(f"Found {len(files)} files to upload:")
    for file in files:
        print(f"  - {file.relative_to(DATA_DIR)}")
    
    print()
    
    # Find ESP-32 port
    port = find_esp32_port()
    if not port:
        print("ESP-32 not found. Please check:")
        print("  - Device is connected via USB")
        print("  - Drivers are installed")
        print("  - Device is in programming mode")
        return 1
    
    # Upload files
    if upload_to_littlefs(port, DATA_DIR):
        print("\n✅ Upload completed successfully!")
        print("You can now reset your ESP-32 and access the dashboard.")
        return 0
    else:
        print("\n❌ Upload failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
