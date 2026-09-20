# BoviSense Cattle Sensor Node

The **BoviSense Cattle Sensor Node** is an ESP32-based wearable sensing unit designed to collect cattle physiological and activity-related data and transmit it wirelessly to the BoviSense edge gateway using **LoRa at 433 MHz**.

The node performs sensor acquisition, filtering, basic signal processing, packet construction, and wireless transmission. **Health scoring and alert generation are performed in the backend, not on the sensor node.**

---

## System Architecture


Cattle Sensor Node
       |
       | LoRa 433 MHz
       v
BoviSense Edge Gateway
       |
       | MQTT over TLS
       v
Backend / Cloud
       |
       v
Supabase
       |
       v
BoviSense Dashboard


---

## Node Responsibilities

The sensor node is responsible for:

* Measuring cattle skin/contact temperature using a DS18B20.
* Reading optical signals from a MAX30102 sensor.
* Estimating BPM and SpO2 from the optical signal.
* Applying filtering and smoothing to sensor measurements.
* Computing short-term averages.
* Generating a device identifier from the ESP32 MAC address.
* Generating a heartbeat flag.
* Providing a prototype activity/movement indicator.
* Packing measurements into a fixed 16-byte binary LoRa packet.
* Adding a prototype packet authentication value.
* Transmitting telemetry through LoRa.
* Reporting basic hardware diagnostics during startup.

The node **does not calculate a health score or generate veterinary/medical diagnoses**.

---

## Hardware

### Main Components

| Component                       | Purpose                                                |
| ------------------------------- | ------------------------------------------------------ |
| ESP32 DevKit / ESP32-WROOM      | Main microcontroller                                   |
| DS18B20                         | Skin/contact temperature measurement                   |
| MAX30102                        | Optical pulse and SpO2 signal acquisition              |
| SX1278 / compatible LoRa module | 433 MHz wireless communication                         |
| MPU6050                         | Planned accelerometer; currently simulated in firmware |

### Current Prototype Status

The MPU6050 hardware is **not currently used by the firmware**.

Instead, the node generates simulated acceleration values through a software movement model. This allows the complete telemetry pipeline to be tested before integrating the physical accelerometer.

---

## Pin Configuration

| Component     |               ESP32 Pin |
| ------------- | ----------------------: |
| DS18B20       |                  GPIO 4 |
| MAX30102 SDA  |                 GPIO 21 |
| MAX30102 SCL  |                 GPIO 22 |
| LoRa NSS / SS |                  GPIO 5 |
| LoRa RESET    |                 GPIO 14 |
| LoRa DIO0     |                 GPIO 26 |
| LoRa SPI      | Default ESP32 VSPI pins |

The exact wiring may vary depending on the ESP32 development board and LoRa module used.

---

## Sensor Processing

### DS18B20 Temperature

The DS18B20 is used to measure cattle skin/contact temperature.

The firmware includes:

* Periodic temperature conversion.
* Kalman filtering.
* Dynamic measurement noise adjustment.
* A calibration offset.
* A validity check to reject unrealistic sudden changes.

The current prototype measures **skin/contact temperature**, not internal body temperature.

Therefore, the measured value should not be interpreted as a direct core body-temperature measurement.

---

### MAX30102

The MAX30102 is used to acquire optical pulse-related signals.

The firmware performs:

* Sensor initialization.
* Contact detection.
* Signal sampling.
* Band-pass filtering.
* Pulse detection.
* BPM estimation.
* SpO2 estimation.
* Smoothing of calculated values.
* Short-term averaging.

BPM and SpO2 values are considered **experimental prototype estimates** and are not intended for medical diagnosis.

Sensor placement, contact quality, movement, ambient conditions, and hardware characteristics can affect the measurements.

---

## Movement / Activity Indicator

The current firmware uses a **software-generated movement model** instead of readings from a physical MPU6050.

The simulated acceleration values include:

* Random variation.
* Slow periodic movement.
* Constrained X/Y/Z values.

This allows movement-related processing and the complete backend pipeline to be tested before physical accelerometer integration.

The movement value is therefore a **prototype activity indicator**, not a direct measurement from a physical accelerometer.

---

## Device Identification

Each node generates a device identifier from the ESP32's factory MAC address.

The identifier uses the last four bytes of the MAC address, allowing each node to have a stable identifier without manually assigning a node ID.

Example:


Node ID: A1B2C3D4


The resulting ID is transmitted as the first four bytes of the LoRa packet.

---

## LoRa Communication

The node communicates with the BoviSense Edge Gateway using a LoRa module operating at **433 MHz**.

Current configuration:


Frequency: 433 MHz
Frequency configuration: 433E6


The LoRa module is responsible for wireless transmission between the cattle node and the edge gateway.

The node does not communicate directly with MQTT, Supabase, or the cloud.

The communication path is:


ESP32 Node
    |
    | LoRa
    v
ESP32 Edge Gateway
    |
    | MQTT over TLS
    v
Backend / Cloud


---

## Telemetry Packet

The node uses a fixed **16-byte binary packet**.

| Byte(s) | Field                  | Format                |
| ------- | ---------------------- | --------------------- |
| 0–3     | Node ID                | 32-bit identifier     |
| 4–5     | Temperature            | Temperature × 100     |
| 6       | BPM                    | 8-bit unsigned        |
| 7       | SpO2                   | 8-bit unsigned        |
| 8       | Flags / authentication | 8-bit                 |
| 9       | Sequence / slot        | 8-bit                 |
| 10–11   | Acceleration X         | Signed 16-bit, × 1000 |
| 12–13   | Acceleration Y         | Signed 16-bit, × 1000 |
| 14–15   | Acceleration Z         | Signed 16-bit, × 1000 |

### Temperature Encoding

Temperature is multiplied by 100 before transmission.

Example:


32.75 °C → 3275


The edge gateway converts the value back to degrees Celsius.

### Acceleration Encoding

Acceleration values are multiplied by 1000 and transmitted as signed 16-bit integers.

The edge gateway must therefore decode these fields as **signed `int16_t` values**.

---

## Packet Flags

The flags byte contains the heartbeat and prototype authentication information.


Bit 0      : Heartbeat flag
Bits 1–7   : Prototype authentication value


The current prototype authentication value is:


AUTH_PASSWORD = 0x5A


This mechanism is intended only for prototype packet validation.

It is **not cryptographic authentication or encryption** and should not be considered a production security mechanism.

---

## Heartbeat

The firmware updates a heartbeat flag approximately every **30 seconds**.

Telemetry packets are transmitted approximately every **60 seconds**.

The heartbeat flag is therefore included in normal telemetry packets rather than being transmitted as a separate heartbeat packet.

The backend uses device timestamps and heartbeat information to help determine device availability.

---

## Transmission Timing

Current firmware intervals:

| Operation              |    Interval |
| ---------------------- | ----------: |
| Telemetry transmission | ~60 seconds |
| Heartbeat flag update  | ~30 seconds |
| Temperature conversion |  ~2 seconds |
| MAX30102 sampling      |      ~20 ms |

The exact transmission timing can vary slightly because it depends on the firmware execution cycle and sensor processing.

---

## Reliability

The firmware includes basic retry handling for LoRa transmission.

Current configuration:


Maximum retries: 3


The node also performs startup diagnostics for the main sensors and communication module.

This is intended for prototype-level reliability testing rather than production-grade fault tolerance.

---

## Hardware Diagnostics

At startup, the firmware checks the availability of:

* DS18B20
* MAX30102
* LoRa module

The MPU6050 is reported as **simulated** because the current implementation does not communicate with a physical MPU6050.

These diagnostics help identify hardware or wiring problems during prototype testing.

---

## Dependencies

The firmware currently uses the following main libraries:

* **OneWire**
* **DallasTemperature**
* **SparkFun MAX3010x Pulse and Proximity Sensor Library**
* **LoRa**

The MPU6050 is currently simulated in firmware, so an MPU6050 hardware library is **not required by the current implementation**.

The exact dependency versions are defined in `platformio.ini`.

---

## Project Structure


node/
├── include/
├── lib/
├── src/
│   └── main.cpp
├── test/
├── .gitignore
├── platformio.ini
└── README.md


---

## Building the Firmware

This project uses **PlatformIO** with the Arduino framework.

### PlatformIO Environment

ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200


### Build

From the `node` directory:

bash
pio run


### Upload

Connect the ESP32 to the computer and run:

bash
pio run --target upload


### Serial Monitor

To monitor startup diagnostics and firmware output:

bash
pio device monitor


The configured serial speed is:


115200 baud


---

## Configuration

The main hardware and communication parameters are defined directly in `src/main.cpp`, including:

* GPIO assignments.
* LoRa frequency.
* Transmission intervals.
* Sensor thresholds.
* Filtering parameters.
* Temperature calibration.
* Prototype authentication value.

For a production implementation, these parameters could be moved to a dedicated configuration system.

---

## Prototype Limitations

The current implementation has several limitations:

* The MPU6050 is simulated rather than physically integrated.
* Temperature represents skin/contact temperature rather than core body temperature.
* BPM and SpO2 are experimental estimates.
* Sensor readings may be affected by cattle movement and sensor placement.
* The prototype authentication mechanism is not cryptographically secure.
* The movement value is currently software-generated.
* LoRa communication is intended for prototype testing.
* The node does not perform health diagnosis.
* Health scoring and alerts are handled by the backend.
* Production deployment would require additional security, calibration, validation, and field testing.

These limitations are intentionally documented to distinguish the current prototype from a production veterinary monitoring system.

---

## BoviSense Data Flow

The complete telemetry path is:


DS18B20 ──────┐
              │
MAX30102 ─────┤
              │
Movement ─────┤
              ↓
        ESP32 Sensor Node
              │
              │ 16-byte binary packet
              │
              ↓
        LoRa 433 MHz
              │
              ↓
        ESP32 Edge Gateway
              │
              │ MQTT over TLS
              ↓
       Backend / Cloud
              │
              ↓
           Supabase
              │
              ↓
      BoviSense Dashboard


The sensor node is therefore responsible for **data acquisition and wireless telemetry**, while higher-level processing and health assessment are handled by the backend system.

---

## Related BoviSense Components

This node is one component of the larger BoviSense system:

* `node/` — ESP32 cattle sensor node.
* `edge_ft/` — ESP32 LoRa edge gateway.
* `Bovisense_Dashboard/` — Web dashboard.
* `Worker.js` — Backend processing and Supabase integration.

Together, these components form the BoviSense prototype architecture.

---

## Project Status

**Prototype stage**

The current implementation demonstrates the core sensing and communication pipeline required for the BoviSense prototype:


Sensor acquisition
       ↓
Signal processing
       ↓
Binary packet generation
       ↓
LoRa transmission
       ↓
Edge gateway reception
       ↓
Backend processing
       ↓
Cloud database
       ↓
Dashboard visualization


The system is intended as a research and engineering prototype for cattle health monitoring and early anomaly detection.
