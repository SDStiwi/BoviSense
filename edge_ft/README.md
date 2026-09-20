\# BoviSense Edge Gateway



The BoviSense Edge Gateway is an ESP32-based gateway that receives cattle health telemetry from wearable sensor nodes over \*\*LoRa 433 MHz\*\*, validates the received packets, and forwards the data to a remote backend through \*\*MQTT over TLS\*\*.



It acts as the communication bridge between the cattle collar nodes and the cloud/backend infrastructure.



\## Architecture




Cattle Sensor Node

      │

      │ LoRa 433 MHz

      ▼

ESP32 Edge Gateway

      │

      │ Wi-Fi

      ▼

MQTT Broker

      │

      ▼

Backend / Cloud

      │

      ▼

BoviSense Dashboard





\## Main Responsibilities



The Edge Gateway:



\* Receives LoRa packets from cattle sensor nodes.

\* Verifies packet size and CRC.

\* Validates the prototype authentication field.

\* Decodes temperature, BPM, SpO₂ and movement data.

\* Generates timestamps using NTP.

\* Publishes telemetry through MQTT.

\* Publishes heartbeat messages for device-status monitoring.

\* Maintains the MQTT connection and reconnects when necessary.

\* Uses TLS to secure the MQTT connection.



The gateway \*\*does not calculate the cattle health score\*\*. Health evaluation and alert processing are handled by the backend/cloud layer.



\## Hardware



\* ESP32 development board

\* LoRa SX1278 / compatible 433 MHz module

\* Wi-Fi connectivity



\### LoRa configuration



\* Frequency: 433 MHz

\* CRC: Enabled

\* Packet size: 16 bytes

\* Communication: LoRa point-to-point



\### Pin configuration



| LoRa signal | ESP32 GPIO |

| ----------- | ---------: |

| NSS / SS    |          5 |

| RESET       |         14 |

| DIO0        |         26 |



\## Telemetry Packet



The gateway receives a fixed 16-byte binary packet from the cattle node.



| Bytes | Field                  |

| ----- | ---------------------- |

| 0–3   | Node ID                |

| 4–5   | Temperature × 100      |

| 6     | BPM                    |

| 7     | SpO₂                   |

| 8     | Flags / authentication |

| 9     | Sequence / slot        |

| 10–11 | X-axis acceleration    |

| 12–13 | Y-axis acceleration    |

| 14–15 | Z-axis acceleration    |



The acceleration values are transmitted with a scale factor of 1000.



\## MQTT



The gateway connects to an MQTT broker using:



\* MQTT over TCP

\* TLS

\* Port `8883`

\* MQTT username/password authentication



Telemetry is published to:




telemetry





Heartbeat messages are published to:




heartbeat





\### Credentials



No real credentials are stored in the repository.



The source code intentionally contains placeholders such as:



cpp

YOUR\_WIFI\_SSID

YOUR\_WIFI\_PASSWORD

YOUR\_MQTT\_BROKER

YOUR\_MQTT\_USERNAME

YOUR\_MQTT\_PASSWORD





These values must be replaced locally when configuring a physical gateway.



\## Prototype Authentication



The current prototype uses a shared authentication value embedded in the LoRa packet flags.



This mechanism is intended for \*\*prototype packet validation\*\*, not as a replacement for production-grade cryptographic authentication.



A future production version could use stronger device authentication and cryptographic message integrity.



\## Project Structure




edge\_ft/

├── include/

├── lib/

├── src/

│   └── main.cpp

├── test/

├── .gitignore

├── platformio.ini

└── README.md





\## Build



This project uses PlatformIO with the Arduino framework.



Install the project dependencies and build with:



bash

pio run





To upload the firmware:



bash

pio run --target upload





To open the serial monitor:



bash

pio device monitor





The serial monitor is configured for:




115200 baud





\## Security Note



The repository contains no production Wi-Fi or MQTT credentials.



The embedded Root CA certificate is used to verify the MQTT server during the TLS connection. It is a public certificate and does not contain private credentials.



\## BoviSense Project



BoviSense is an IoT-based cattle health monitoring system combining:



\* Wearable sensor nodes

\* LoRa communication

\* ESP32 edge gateway

\* MQTT

\* Cloud/backend processing

\* Web-based monitoring



The gateway is one component of the complete BoviSense architecture.



