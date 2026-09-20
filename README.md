# BoviSense — Smart Cattle Health Monitoring System

> **Detect early. Act fast. Protect the herd.**

BoviSense is an IoT-based cattle health monitoring system designed to collect physiological and activity data from cattle, transmit it through a LoRa-based edge network, and provide centralized monitoring through a web dashboard.

The project combines **IoT, LoRa, Edge Computing, MQTT, Cloud Services, and Web Technologies** into an end-to-end prototype.

## System Architecture


┌─────────────────────┐
│   Cattle Wearable   │
│  ESP32 + Sensors    │
└──────────┬──────────┘
           │
        LoRa 433 MHz
           │
           ▼
┌─────────────────────┐
│    Edge Gateway     │
│       ESP32         │
└──────────┬──────────┘
           │
        MQTT / TLS
           │
           ▼
┌─────────────────────┐
│    Cloud Worker     │
│ Processing & Alerts │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│      Supabase       │
│ Data & Device State │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  BoviSense Dashboard│
│   Web Monitoring    │
└─────────────────────┘


## Key Features

* Wireless cattle telemetry using **LoRa 433 MHz**
* Temperature, BPM and SpO₂ monitoring
* Activity/movement monitoring
* ESP32-based edge gateway
* MQTT communication over TLS
* Cloud-based telemetry processing
* Rule-based health scoring
* Automatic health alerts
* Online/offline device monitoring
* Web-based monitoring dashboard
* Supabase data storage

## Main Components

| Component                                      | Description                                |
| ---------------------------------------------- | ------------------------------------------ |
| [`node/`](node/)                               | ESP32 wearable sensor firmware             |
| [`edge_ft/`](edge_ft/)                         | ESP32 LoRa-to-MQTT edge gateway            |
| [`Worker.js`](Worker.js)                       | Cloud telemetry processing and alert logic |
| [`Bovisense_Dashboard/`](Bovisense_Dashboard/) | Web monitoring dashboard                   |
| [`images/`](images/)                           | Project images and documentation media     |

## Hardware

The prototype uses:

* ESP32 development boards
* SX1278 LoRa transceiver
* DS18B20 temperature sensor
* MAX30102 optical sensor
* MPU6050 interface planned for physical movement sensing

The current prototype uses software-generated movement data where the MPU6050 is not physically connected.

## Software Stack

### Embedded

* Arduino Framework
* PlatformIO
* C++

### Communication

* LoRa 433 MHz
* MQTT
* TLS
* Wi-Fi

### Backend

* Cloudflare Worker
* Supabase

### Frontend

* React
* Vite
* Tailwind CSS
* TypeScript

## Data Flow


Sensors
   ↓
ESP32 Node
   ↓
LoRa
   ↓
ESP32 Edge Gateway
   ↓
MQTT / TLS
   ↓
Cloud Worker
   ↓
Health Processing + Alerts
   ↓
Supabase
   ↓
Web Dashboard


The edge gateway is responsible for receiving, validating, decoding, and forwarding sensor data. Health scoring and alert processing are handled by the backend rather than by the edge device.

## Repository Structure


BoviSense _Portfolio/
│
├── Bovisense_Dashboard/
│   └── Web monitoring application
│
├── edge_ft/
│   └── ESP32 LoRa edge gateway
│
├── node/
│   └── ESP32 cattle sensor node
│
├── images/
│   └── Project images
│
├── Worker.js
├── README_Worker.md
└── README.md


## Getting Started

Each major component contains its own README with installation and configuration instructions.

Start with:

1. [`node/README.md`](node/README.md)
2. [`edge_ft/README.md`](edge_ft/README.md)
3. [`README_Worker.md`](README_Worker.md)
4. [`Bovisense_Dashboard/README.md`](Bovisense_Dashboard/README.md)

## Prototype Demonstration

Field testing was performed with the BoviSense prototype under real cattle conditions.

* [Field Test Video ](https://drive.google.com/file/d/1APICbSTNjFOJPU-BNR09dIqQldkBMbr6/view?usp=drive_link)
* [Demo Video ](https://drive.google.com/file/d/1ZAl4-MwL44KO83ORRnd4-DGKMr8z8PPN/view?usp=drive_link)

## Prototype Status

BoviSense is currently a **functional prototype (TRL 4)** with initial testing performed under real-world cattle conditions.

The prototype demonstrates the complete data path from sensor acquisition to web-based monitoring.

Some components remain experimental, including physiological measurements and movement sensing. The system is intended as a **research and prototype platform**, not as a veterinary diagnostic device.

## Security

* Credentials are kept outside the repository.
* Environment variables are used for sensitive configuration.
* MQTT communication uses TLS.
* Prototype authentication is implemented between the LoRa node and edge gateway.
* No private keys or production credentials are included in the public repository.

## Project Context

**BoviSense — Smart Cattle Health Monitoring System**

Developed as part of a Master's project in Computer Science at **USTO-MB**.

The project explores the integration of **IoT, LoRa, Edge Computing, Cloud Services, and intelligent livestock monitoring**.

---

**Project tagline:**

*Detect early. Act fast. Protect the herd.*
