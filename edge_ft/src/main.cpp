#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <math.h>

// ============================================================
// BoviSense - ESP32 Edge Gateway
//
// Responsibilities:
//   - Receive telemetry from cattle sensor nodes via LoRa.
//   - Validate and decode the received binary packet.
//   - Generate UTC timestamps using NTP.
//   - Forward telemetry and heartbeat data via MQTT over TLS.
//
// The gateway does not calculate health scores.
// Health evaluation and alert processing are handled by the
// backend/cloud layer.
// ============================================================


// ============================================================
// LoRa Configuration
// ============================================================

#define LORA_SS   5
#define LORA_RST  14
#define LORA_DIO0 26


// ============================================================
// Wi-Fi Configuration
// Replace the placeholders locally when deploying the gateway.
// Do not commit real credentials to the repository.
// ============================================================

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";


// ============================================================
// MQTT Configuration
// MQTT is secured using TLS on port 8883.
// ============================================================

const char* mqtt_server = "YOUR_MQTT_BROKER";
const uint16_t mqtt_port = 8883;
const char* mqtt_user = "YOUR_MQTT_USERNAME";
const char* mqtt_pass = "YOUR_MQTT_PASSWORD";


// ============================================================
// MQTT Root CA Certificate
//
// Public CA certificate used to verify the MQTT broker during
// the TLS connection. This certificate does not contain any
// private credentials.
// ============================================================

static const char* root_ca = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";


// ============================================================
// Network Clients
// ============================================================

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);


// ============================================================
// Prototype Authentication
//
// The authentication value is embedded in the LoRa packet.
// This is intended for prototype packet validation only.
// It is not a replacement for production-grade cryptographic
// authentication.
// ============================================================

#define AUTH_PASSWORD 0x5A


// ============================================================
// Time Synchronization
// ============================================================

const char* ntpServer = "pool.ntp.org";

String getTimestamp() {
  time_t now = time(nullptr);
  struct tm t;

  gmtime_r(&now, &t);

  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &t);

  return String(buf);
}


// ============================================================
// Wi-Fi Connection
// ============================================================

void connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[WiFi] Connected");
}


// ============================================================
// NTP Time Synchronization
// ============================================================

void syncTime() {
  Serial.print("[NTP] Synchronizing time...");

  configTime(0, 0, ntpServer);

  while (time(nullptr) < 100000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println(" done");
}


// ============================================================
// MQTT Connection
// ============================================================

void connectMQTT() {
  // Configure TLS certificate validation.
  wifiClient.setCACert(root_ca);

  mqttClient.setServer(mqtt_server, mqtt_port);

  // Keep the MQTT connection alive during periods with
  // no telemetry traffic.
  mqttClient.setKeepAlive(30);

  // Generate a unique MQTT client ID from the ESP32 MAC address.
  uint8_t mac[6];
  WiFi.macAddress(mac);

  char clientId[32];

  sprintf(
    clientId,
    "EDGE_%02X%02X%02X%02X%02X%02X",
    mac[0],
    mac[1],
    mac[2],
    mac[3],
    mac[4],
    mac[5]
  );

  Serial.printf("[MQTT] Connecting as %s...\n", clientId);

  // Retry until the broker becomes available.
  while (!mqttClient.connect(clientId, mqtt_user, mqtt_pass)) {
    Serial.printf(
      "  Connection failed, rc=%d. Retrying in 2 seconds...\n",
      mqttClient.state()
    );

    delay(2000);
  }

  Serial.println("[MQTT] Connected");
}


// ============================================================
// LoRa Initialization
// ============================================================

void setupLoRa() {
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("[LoRa] Initialization failed");
    while (1);
  }

  // Enable LoRa packet CRC validation.
  LoRa.enableCrc();

  Serial.println("[LoRa] Ready");
}


// ============================================================
// Arduino Setup
// ============================================================

void setup() {
  Serial.begin(115200);

  connectWiFi();
  syncTime();
  setupLoRa();
  connectMQTT();
}


// ============================================================
// Main Loop
// ============================================================

void loop() {
  // Keep the MQTT connection alive and reconnect if necessary.
  if (!mqttClient.connected()) {
    Serial.println("[MQTT] Disconnected. Reconnecting...");
    connectMQTT();
  }

  mqttClient.loop();

  // Check for an incoming LoRa packet without blocking.
  int packetSize = LoRa.parsePacket();

  if (packetSize == 0) {
    delay(10);
    return;
  }

  Serial.println("\n====================");
  Serial.printf(
    "[LoRa] Packet received | size = %d bytes\n",
    packetSize
  );

  // BoviSense uses a fixed 16-byte telemetry packet.
  if (packetSize != 16) {
    Serial.println("[LoRa] Invalid packet size. Packet ignored.");
    return;
  }

  // Read the complete binary packet.
  uint8_t b[16];

  for (int i = 0; i < 16; i++) {
    b[i] = LoRa.read();
  }

  // Print the raw packet for debugging and prototype testing.
  Serial.print("[LoRa] Raw: ");

  for (int i = 0; i < 16; i++) {
    Serial.printf("%02X ", b[i]);
  }

  Serial.println();


  // ==========================================================
  // Node Identification
  // ==========================================================

  uint32_t nodeID =
      ((uint32_t)b[0] << 24) |
      ((uint32_t)b[1] << 16) |
      ((uint32_t)b[2] << 8) |
      b[3];

  char nodeHex[9];

  sprintf(nodeHex, "%08X", nodeID);

  Serial.printf("[NODE] ID: %s\n", nodeHex);


  // ==========================================================
  // Prototype Packet Authentication
  // ==========================================================

  uint8_t flags = b[8];

  // Bits 1-7 contain the prototype authentication value.
  uint8_t receivedPassword = (flags >> 1) & 0x7F;

  Serial.printf(
    "[AUTH] Received value: 0x%02X\n",
    receivedPassword
  );

  if (receivedPassword != AUTH_PASSWORD) {
    Serial.println("[AUTH] Validation failed. Packet dropped.");
    return;
  }

  Serial.println("[AUTH] Validation successful");

  // Bit 0 indicates that the packet contains a heartbeat.
  bool heartbeat = flags & 0x01;


  // ==========================================================
  // Sensor Data Decoding
  // ==========================================================

  float temp = ((b[4] << 8) | b[5]) / 100.0;
  int bpm = b[6];
  int spo2 = b[7];

  uint8_t slot = b[9];

  float accx = ((b[10] << 8) | b[11]) / 1000.0;
  float accy = ((b[12] << 8) | b[13]) / 1000.0;
  float accz = ((b[14] << 8) | b[15]) / 1000.0;

  // Movement is represented by the sum of the absolute
  // acceleration components.
  float movement =
      fabs(accx) +
      fabs(accy) +
      fabs(accz);

  Serial.printf(
    "[DATA] Temp=%.2f | BPM=%d | SpO2=%d | Slot=%d\n",
    temp,
    bpm,
    spo2,
    slot
  );

  Serial.printf(
    "[ACC] X=%.3f Y=%.3f Z=%.3f | Movement=%.3f\n",
    accx,
    accy,
    accz,
    movement
  );


  // ==========================================================
  // Telemetry Payload
  // ==========================================================

  StaticJsonDocument<256> doc;

  doc["node_id"] = nodeHex;
  doc["ts"] = getTimestamp();
  doc["slot"] = slot;
  doc["temperature"] = temp;
  doc["bpm"] = bpm;
  doc["spo2"] = spo2;
  doc["accx"] = accx;
  doc["accy"] = accy;
  doc["accz"] = accz;
  doc["movement"] = movement;

  char payload[256];

  serializeJson(doc, payload);


  // ==========================================================
  // Telemetry Publishing
  // ==========================================================

  // Make sure the MQTT connection is available before publishing.
  if (!mqttClient.connected()) {
    Serial.println("[MQTT] Not connected. Reconnecting...");
    connectMQTT();
  }

  Serial.println("[MQTT] Publishing telemetry...");

  if (mqttClient.publish("telemetry", payload)) {
    Serial.println("[MQTT] Telemetry published");
  } else {
    Serial.println("[MQTT] Telemetry publish failed");
  }

  Serial.println(payload);


  // ==========================================================
  // Heartbeat Publishing
  // ==========================================================

  if (heartbeat) {
    Serial.println("[HEARTBEAT] Heartbeat flag detected");

    StaticJsonDocument<128> hb;

    hb["node_id"] = nodeHex;
    hb["ts"] = getTimestamp();

    char hbPayload[128];

    serializeJson(hb, hbPayload);

    if (mqttClient.publish("heartbeat", hbPayload)) {
      Serial.println("[MQTT] Heartbeat published");
    } else {
      Serial.println("[MQTT] Heartbeat publish failed");
    }

    Serial.println(hbPayload);
  }

  Serial.println("====================\n");
}
