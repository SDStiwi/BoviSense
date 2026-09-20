# BoviSense Backend Worker

The **BoviSense Worker** is the backend processing component responsible for receiving telemetry forwarded from the BoviSense MQTT pipeline, processing sensor data, calculating a prototype health score, generating alerts, and synchronizing device availability with Supabase.

The Worker is implemented as a **Cloudflare Worker**.

---

## Architecture


Cattle Sensor Node
        |
        | LoRa 433 MHz
        v
ESP32 Edge Gateway
        |
        | MQTT over TLS
        v
CloudAMQP / MQTT Broker
        |
        v
Cloudflare Worker
        |
        +------------------+
        |                  |
        v                  v
    Telemetry           Alerts
        |                  |
        +--------+---------+
                 |
                 v
              Supabase
                 |
                 v
       BoviSense Dashboard


---

## Responsibilities

The Worker is responsible for:

* Receiving POST requests containing BoviSense telemetry.
* Decoding Base64-encoded payloads when required.
* Validating the presence of a node identifier.
* Normalizing sensor values.
* Normalizing acceleration field names.
* Calculating a prototype movement indicator when necessary.
* Updating device availability.
* Processing heartbeat messages.
* Calculating a rule-based prototype health score.
* Determining the device health status.
* Storing telemetry in Supabase.
* Generating alerts for abnormal measurements.
* Detecting devices that have stopped reporting.
* Marking inactive devices as offline.

The Worker **does not communicate directly with the cattle sensor node**.

---

## Data Flow


MQTT Message
     |
     v
Cloudflare Worker
     |
     +--> Decode payload
     |
     +--> Validate node ID
     |
     +--> Normalize measurements
     |
     +--> Update device status
     |
     +--> Calculate health score
     |
     +--> Store telemetry
     |
     +--> Generate alerts
     |
     v
Supabase


---

## Input Format

The Worker accepts a JSON request.

It can process a payload directly:

json
{
  "node_id": "A1B2C3D4",
  "ts": "2026-09-20T12:00:00Z",
  "slot": 12,
  "temperature": 35.4,
  "bpm": 72,
  "spo2": 98,
  "accx": 0.123,
  "accy": -0.456,
  "accz": 0.987,
  "movement": 1.566
}


It can also decode a Base64-encoded JSON payload when the incoming request contains a `payload` field.

---

## Telemetry Fields

| Field          | Description                         |
| -------------- | ----------------------------------- |
| `node_id`      | Unique sensor node identifier       |
| `ts`           | UTC timestamp                       |
| `slot`         | Packet sequence/slot value          |
| `temperature`  | DS18B20 skin/contact temperature    |
| `bpm`          | Estimated heart rate                |
| `spo2`         | Estimated oxygen saturation         |
| `accx`         | Acceleration X                      |
| `accy`         | Acceleration Y                      |
| `accz`         | Acceleration Z                      |
| `movement`     | Prototype activity indicator        |
| `health_score` | Rule-based prototype score          |
| `status`       | `healthy`, `warning`, or `critical` |

---

## Device Availability

The Worker maintains the current availability state of each node.

When telemetry or a heartbeat is received, the device is updated with:


status = online
last_seen = received timestamp


The Worker also runs a scheduled task that checks for devices that have not reported within the configured timeout.

Current timeout:


60 seconds


Devices exceeding this timeout are marked:


offline


---

## Heartbeat Handling

Heartbeat messages are used to update device availability without creating a telemetry record.

The Worker currently identifies a heartbeat using:

json
{
  "type": "heartbeat",
  "node_id": "A1B2C3D4",
  "ts": "2026-09-20T12:00:00Z"
}


Heartbeat processing:


Heartbeat
    |
    v
Update device last_seen
    |
    v
Mark device online
    |
    v
Do not insert telemetry


> The current ESP32 Edge firmware should include `"type": "heartbeat"` in the heartbeat JSON payload for this logic to be triggered explicitly.

---

## Rule-Based Health Score

The Worker calculates a **prototype rule-based health score** starting from:


100 points


Penalties are applied when measurements fall outside the configured prototype ranges.

### Current Thresholds

| Parameter   | Range / Threshold |
| ----------- | ----------------- |
| Temperature | 32–40 °C          |
| BPM         | 50–200            |
| SpO2        | ≥ 85%             |
| Movement    | ≥ 0.2             |

### Temperature Penalty

Temperature outside the configured range produces a penalty proportional to the deviation, capped at:


40 points


### BPM Penalty

Heart rate outside the configured range produces a penalty proportional to the deviation, capped at:


35 points


### SpO2 Penalty

SpO2 below the configured threshold produces a penalty capped at:


40 points


### Movement Penalty

Movement below the configured prototype threshold produces an activity penalty.

---

## Health Status

The resulting score is converted into a status:

| Score | Status     |
| ----: | ---------- |
|  > 70 | `healthy`  |
|  > 40 | `warning`  |
|  ≤ 40 | `critical` |

The score is constrained to a minimum of:


0


---

## Important Prototype Limitation

The health score is a **rule-based engineering prototype**.

It is intended for:

* anomaly monitoring,
* system demonstration,
* backend testing,
* dashboard visualization,
* prototype validation.

It is **not a veterinary diagnostic model** and should not be interpreted as a medical or veterinary diagnosis.

The threshold values and penalty functions are configurable and may require further validation using larger real-world datasets and veterinary expertise.

---

## Alerts

The Worker can generate alerts for:

* High temperature.
* Low temperature.
* High heart rate.
* Low heart rate.
* Low SpO2.
* Low activity.
* Overall `warning` health status.
* Overall `critical` health status.

Each alert contains information such as:


node_id
type
value
message
timestamp


Alerts are stored in the Supabase `alerts` table.

---

## Supabase Integration

The Worker communicates with Supabase through its REST API.

The main tables used are:


telemetry
alerts
devices


### Telemetry

Stores processed sensor measurements and calculated health information.

### Alerts

Stores generated abnormal-condition and health-status alerts.

### Devices

Stores node availability information, including:

* `node_id`
* `last_seen`
* `status`

---

## Environment Variables

No Supabase credentials are stored in the source code.

The Worker expects the following Cloudflare Worker environment variables/secrets:


SUPABASE_URL
SUPABASE_KEY


These values must be configured in the Cloudflare Worker environment.

**Do not commit real credentials to GitHub.**

---

## Deployment

The Worker is designed to run on **Cloudflare Workers**.

The exact deployment configuration depends on the Cloudflare project setup.

Before deployment, configure:

text
SUPABASE_URL
SUPABASE_KEY


as Worker environment variables/secrets.

---

## Error Handling

The Worker includes basic error handling for:

* Invalid HTTP methods.
* Missing Supabase configuration.
* Missing node identifiers.
* Invalid database responses.
* Device update failures.
* Scheduled offline-detection failures.
* Unexpected Worker errors.

Errors are logged using the Worker runtime's console logging.

The current error-handling behavior is designed for the prototype MQTT/CloudAMQP pipeline and may be refined for production deployment.

---

## Project Structure

If kept in the repository root:

text
BoviSense/
├── Worker.js
└── README_Worker.md


If organized as a dedicated component:

text
worker/
├── Worker.js
└── README.md


---

## Security Considerations

The current implementation follows several basic security practices:

* Supabase credentials are provided through environment variables.
* Credentials are not hardcoded in the source.
* MQTT communication between the edge gateway and broker uses TLS.
* Incoming node packets are validated by the edge gateway before forwarding.
* Prototype packet authentication is performed at the LoRa gateway.

However, the current LoRa authentication mechanism is a **prototype mechanism** and is not a replacement for cryptographically secure authentication.

A production implementation would require stronger authentication, authorization, secret management, input validation, and monitoring.

---

## Relationship with Other BoviSense Components

The Worker is part of the complete BoviSense system:

text
node/
    ESP32 cattle sensor
          |
          | LoRa
          v
edge_ft/
    ESP32 edge gateway
          |
          | MQTT/TLS
          v
CloudAMQP
          |
          v
Worker.js
    Backend processing
          |
          | REST API
          v
Supabase
          |
          v
Bovisense_Dashboard/


---

## Project Status

**Prototype / Research Project**

The Worker implements the backend processing required for the current BoviSense prototype, including telemetry storage, device availability monitoring, rule-based health scoring, and alert generation.

The scoring and alert mechanisms are intended for prototype validation and future improvement using real-world cattle datasets.
