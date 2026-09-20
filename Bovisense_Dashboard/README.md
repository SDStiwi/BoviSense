# BoviSense Dashboard

Web dashboard for the **BoviSense Smart Cattle Health Monitoring System**.

The dashboard provides a centralized interface for monitoring cattle sensor data, device status, health indicators, alerts, and farm activity.

## Overview

The dashboard is the user-facing component of BoviSense. It receives processed telemetry through the backend pipeline and presents the information through a web interface.

**Data flow:**


Cattle Sensor Node
       │
      LoRa
       │
       ▼
  Edge ESP32
       │
    MQTT/TLS
       │
       ▼
   Cloud Worker
       │
    Supabase
       │
       ▼
BoviSense Dashboard


The dashboard does not communicate directly with the LoRa sensor nodes.

## Features

* User login
* Dashboard overview
* Real-time device status
* Cattle/device monitoring
* Temperature, BPM and SpO₂ visualization
* Movement/activity monitoring
* Health score and status
* Alert monitoring
* Device details
* Farm/device map
* Online/offline device tracking
* Responsive web interface

## Technology Stack

* **React**
* **Vite**
* **Tailwind CSS**
* **Supabase**
* **JavaScript**

## Main Pages

| Page          | Purpose                            |
| ------------- | ---------------------------------- |
| Login         | User authentication                |
| Dashboard     | Overall system and device overview |
| Device Detail | Detailed telemetry for a device    |
| Alerts        | Health and system alerts           |
| Map           | Device/farm location visualization |

## Project Structure


Bovisense_Dashboard/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── ...
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── vite.config.js


## Configuration

Create a local `.env` file based on `.env.example`.

Example:

env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key


Do not commit `.env` files or private credentials to the repository.

## Run Locally

Install dependencies:

bash
npm install


Start the development server:

bash
npm run dev


Build for production:

bash
npm run build


Preview the production build:

bash
npm run preview


## Backend Integration

The dashboard uses **Supabase** as its data source.

The backend pipeline is responsible for receiving telemetry, processing health indicators, updating device status, and storing the resulting data in Supabase.

The dashboard consumes this stored data for visualization and monitoring.

## Prototype Status

The dashboard is part of the **BoviSense functional prototype (TRL 4)**.

Current implementation focuses on:

* Device monitoring
* Telemetry visualization
* Health status
* Alerts
* Device availability
* Farm-level supervision

Health indicators and alerts are **prototype rule-based outputs** and are not intended for medical or veterinary diagnosis.

## Related Components

* `../node/` — cattle sensor firmware
* `../edge_ft/` — ESP32 LoRa edge gateway
* `../Worker.js` — backend telemetry processing
* Supabase — data storage and backend services

## Project

**BoviSense — Smart Cattle Health Monitoring System**

> Detect early. Act fast. Protect the herd.
