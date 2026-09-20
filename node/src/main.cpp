#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include "MAX30105.h"
#include <SPI.h>
#include <LoRa.h>
#include <esp_mac.h>          // for MAC address
#include <esp_system.h>

// ===================== DS18B20 =====================
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
#define AUTH_PASSWORD 0x5A

// ===================== MAX30102 =====================
MAX30105 sensor;

// ===================== LoRa =====================
#define LORA_SS 5
#define LORA_RST 14
#define LORA_DIO0 26
#define LORA_BAND 433E6

#define MAX_RETRIES 3
#define SEND_INTERVAL_MS 60000
#define HEARTBEAT_INTERVAL_MS 30000

unsigned long lastSend = 0;
unsigned long lastHeartbeat = 0;

// ===================== OUTPUT =====================
float finalTemp = 0;
float finalBPM = 0;      // Instantaneous filtered BPM
float finalSpO2 = 0;     // instantaneous filtered SpO2

// ===================== AVERAGES FOR LORA =====================
float avgBPMtoSend = 0;
float avgSpO2toSend = 0;

// ===================== TEMP =====================
unsigned long lastTempRequest = 0;
const unsigned long TEMP_INTERVAL = 2000;
bool tempConversionPending = false;

// ===================== KALMAN TEMP =====================
float Q = 0.001, R = 0.05, X = 0, P = 1, K = 0;
bool initialized = false;

float lastValidTemp = 0;
float stableTemp = 0;
int stabilityCounter = 0;
float calibrationOffset = 0.26;

float kalmanTemp(float m) {
  if (!initialized) { X = m; initialized = true; }
  float innovation = fabs(m - X);
  R = (innovation > 0.5) ? 0.2 : 0.05;
  P += Q;
  K = P / (P + R);
  X = X + K * (m - X);
  P = (1 - K) * P;
  return X;
}

bool isValidTemp(float t) {
  static bool first = true;
  if (first) { first = false; return true; }
  return fabs(t - lastValidTemp) <= 2.0;
}

// ===================== MAX30102 CONFIG =====================
const unsigned long SAMPLE_INTERVAL = 20;

float bp_x1 = 0, bp_x2 = 0;
float bp_y1 = 0, bp_y2 = 0;

float bandpass(float input) {
  const float b0 = 0.2066, b1 = 0, b2 = -0.2066;
  const float a1 = -0.5869, a2 = 0;
  float out = b0 * input + b1 * bp_x1 + b2 * bp_x2
              - a1 * bp_y1 - a2 * bp_y2;
  bp_x2 = bp_x1;
  bp_x1 = input;
  bp_y2 = bp_y1;
  bp_y1 = out;
  return out;
}

// ===================== BPM + SpO2 =====================
float bpm = 0, bpmSmooth = 0;
unsigned long lastBeat = 0;

float spo2Smooth = 97;

float irDC = 0, redDC = 0;
float irAC = 0, redAC = 0;

float sigMax = 0, sigMin = 0;
bool rising = false;
float prevFiltered = 0;   // for local maximum check

float irPeakValue = 0, redPeakValue = 0;
bool inPeak = false;

// Contact state
bool wasContact = false;
#define CONTACT_THRESHOLD 30000   // increased for wrist

// ===================== AVERAGING (30 sec) =====================
float bpmSum = 0;
int bpmCount = 0;
float spo2Sum = 0;
int spo2Count = 0;
unsigned long lastReport = 0;
const unsigned long REPORT_INTERVAL = 30000; // 30 seconds

// ===================== RESET FUNCTION =====================
void resetPPG() {
  irDC = redDC = irAC = redAC = 0;
  sigMax = sigMin = 0;
  rising = false;
  inPeak = false;
  irPeakValue = redPeakValue = 0;
  bp_x1 = bp_x2 = bp_y1 = bp_y2 = 0;
  bpmSmooth = 0;
  spo2Smooth = 97;
  lastBeat = 0;
  finalBPM = 0;
  finalSpO2 = 0;
  prevFiltered = 0;
  Serial.println("[PPG] State reset");
}

// ===================== HEARTBEAT =====================
bool isHeartbeatPacket = false;

// ===================== MONITOR & UPDATE AVERAGES (30 sec) =====================
void printAverages(unsigned long now) {
  if (now - lastReport >= REPORT_INTERVAL) {
    lastReport = now;

    float avgBPM = (bpmCount > 0) ? (bpmSum / bpmCount) : 0;
    float avgSpO2 = (spo2Count > 0) ? (spo2Sum / spo2Count) : 0;

    // Store averages for LoRa transmission
    avgBPMtoSend = avgBPM;
    avgSpO2toSend = avgSpO2;

    Serial.println("\n========== 30s AVERAGES ==========");
    Serial.print("TEMP: "); Serial.print(finalTemp, 2); Serial.println(" °C");
    Serial.print("AVG BPM: "); Serial.print(avgBPM, 1);
    Serial.print(" (from "); Serial.print(bpmCount); Serial.println(" beats)");
    Serial.print("AVG SpO2: "); Serial.print(avgSpO2, 1);
    Serial.print(" (from "); Serial.print(spo2Count); Serial.println(" readings)");
    Serial.print("Heartbeat Packet: "); Serial.println(isHeartbeatPacket ? "YES" : "NO");
    Serial.println("==================================\n");

    // Reset accumulators for next window
    bpmSum = 0; bpmCount = 0;
    spo2Sum = 0; spo2Count = 0;
  }
}

// ===================== SIMULATED COW MOVEMENT (replaces MPU6050) =====================
// Generates light, slow accelerations typical of a grazing/walking cow.
// Values in g (9.81 m/s²), range around ±0.3g.
static float simX = 0.0, simY = 0.0, simZ = 0.0;
static unsigned long lastSimTime = 0;
const unsigned long SIM_UPDATE_MS = 50;   // update every 50 ms for smooth motion

void simulateCowMovement(float &ax, float &ay, float &az) {
  unsigned long now = millis();
  if (now - lastSimTime >= SIM_UPDATE_MS) {
    lastSimTime = now;
    // Simple random walk + sinusoidal drift for "light movement"
    static float phase = 0.0;
    phase += 0.03;             // slow oscillation
    if (phase > TWO_PI) phase -= TWO_PI;
    
    // Random step (gentle)
    float stepX = ((float)random(-20, 21)) / 5000.0;  // ±0.004g per step
    float stepY = ((float)random(-20, 21)) / 5000.0;
    float stepZ = ((float)random(-20, 21)) / 5000.0;
    
    simX += stepX;
    simY += stepY;
    simZ += stepZ;
    
    // Add a soft periodic motion (like swaying while walking)
    simX += 0.005 * sin(phase * 1.2);
    simY += 0.005 * sin(phase * 0.8);
    simZ += 0.005 * sin(phase * 1.5);
    
    // Constrain to realistic range ±0.4g and keep a slight bias (simulate standing posture)
    simX = constrain(simX, -0.4, 0.4);
    simY = constrain(simY, -0.4, 0.4);
    simZ = constrain(simZ, 0.7, 1.2);   // Z axis usually ~1g when standing, but cow moves
    
    // Add a small amount of noise (measurement noise)
    ax = simX + ((float)random(-50, 51)) / 1000.0;
    ay = simY + ((float)random(-50, 51)) / 1000.0;
    az = simZ + ((float)random(-50, 51)) / 1000.0;
  } else {
    // return last valid values if not updated this call
    ax = simX;
    ay = simY;
    az = simZ;
  }
}

// ===================== UNIQUE DEVICE ID FROM MAC =====================
uint32_t deviceID = 0;

uint32_t getDeviceID() {
    uint8_t mac[6];
    esp_efuse_mac_get_default(mac);
    // Use last 4 bytes of MAC (bytes 2,3,4,5)
    uint32_t id = ((uint32_t)mac[2] << 24) |
                  ((uint32_t)mac[3] << 16) |
                  ((uint32_t)mac[4] << 8)  |
                  mac[5];
    return id;
}

// ===================== LORA (sends the 30s averages) =====================
bool sendLoRa(float temp, int bpm, int spo2,
              float ax, float ay, float az,
              bool heartbeat) {
  uint8_t buffer[16];
  uint32_t id = deviceID;
  buffer[0] = (id >> 24) & 0xFF;
  buffer[1] = (id >> 16) & 0xFF;
  buffer[2] = (id >> 8) & 0xFF;
  buffer[3] = id & 0xFF;
  int16_t tInt = temp * 100;
  buffer[4] = (tInt >> 8) & 0xFF;
  buffer[5] = tInt & 0xFF;
  buffer[6] = bpm;
  buffer[7] = spo2;
  
  // Build flags byte: bit0 = heartbeat, bits1-7 = password
  uint8_t flags = 0;
  if (heartbeat) flags |= 0x01;
  flags |= (AUTH_PASSWORD << 1);   // shift password into bits 1-7
  buffer[8] = flags;
  
  buffer[9] = (millis() / 30000) & 0xFF;
  int16_t ax_i = ax * 1000;
  int16_t ay_i = ay * 1000;
  int16_t az_i = az * 1000;
  buffer[10] = (ax_i >> 8) & 0xFF;
  buffer[11] = ax_i & 0xFF;
  buffer[12] = (ay_i >> 8) & 0xFF;
  buffer[13] = ay_i & 0xFF;
  buffer[14] = (az_i >> 8) & 0xFF;
  buffer[15] = az_i & 0xFF;
  
  // ----- DETAILED LOGGING OF LoRa MESSAGE -----
  Serial.println("\n[LORA] Packet content (16 bytes):");
  Serial.print("Hex: ");
  for (int i = 0; i < 16; i++) {
    if (buffer[i] < 0x10) Serial.print("0");
    Serial.print(buffer[i], HEX);
    Serial.print(" ");
  }
  Serial.println();
  
  Serial.print("Decoded: ID=0x");
  Serial.print(id, HEX);
  Serial.print(", Temp="); Serial.print(temp, 1);
  Serial.print("°C, BPM="); Serial.print(bpm);
  Serial.print(", SpO2="); Serial.print(spo2);
  Serial.print("%, HB="); Serial.print(heartbeat ? "1" : "0");
  Serial.print(", Seq="); Serial.print((millis() / 30000) & 0xFF);
  Serial.print(", Accel=("); Serial.print(ax,2); Serial.print(",");
  Serial.print(ay,2); Serial.print(","); Serial.print(az,2); Serial.println(") g");
  // -------------------------------------------

  Serial.print("[LORA] Sending packet... ");
  for (int i = 0; i < MAX_RETRIES; i++) {
    LoRa.beginPacket();
    LoRa.write(buffer, 16);
    if (LoRa.endPacket() == 1) {
      Serial.println("OK");
      return true;
    }
    delay(50);
  }
  Serial.println("FAIL");
  return false;
}

// ===================== HARDWARE CHECK =====================
bool ds18b20_ok = true;
bool max30102_ok = true;
bool lora_ok = true;

void checkHardware() {
  Serial.println("\n[HW CHECK] Running hardware diagnostics...");

  sensors.requestTemperatures();
  float testTemp = sensors.getTempCByIndex(0);
  if (testTemp == DEVICE_DISCONNECTED_C) {
    ds18b20_ok = false;
    Serial.println("[HW CHECK] DS18B20: FAIL (no device on OneWire bus)");
  } else {
    ds18b20_ok = true;
    Serial.print("[HW CHECK] DS18B20: OK (temp = ");
    Serial.print(testTemp);
    Serial.println(" °C)");
  }

  if (!sensor.begin(Wire, 400000)) {
    max30102_ok = false;
    Serial.println("[HW CHECK] MAX30102: FAIL (I2C not responding)");
  } else {
    sensor.check();
    bool hasData = false;
    for (int i = 0; i < 5; i++) {
      if (sensor.available()) {
        long ir = sensor.getIR();
        if (ir > 0) hasData = true;
        sensor.nextSample();
      }
      delay(10);
    }
    if (hasData) {
      max30102_ok = true;
      Serial.println("[HW CHECK] MAX30102: OK (sensor produces data)");
    } else {
      max30102_ok = false;
      Serial.println("[HW CHECK] MAX30102: WARNING (sensor IC present but no light detected)");
    }
  }

  // MPU6050 is not connected; movement is currently simulated.
  Serial.println("[HW CHECK] MPU6050: SIMULATION (light cow motion active)");

  if (lora_ok) {
    Serial.println("[HW CHECK] LoRa: OK (radio initialised)");
  } else {
    Serial.println("[HW CHECK] LoRa: FAIL (radio not responding)");
  }

  Serial.println("[HW CHECK] Diagnostics complete.");
}

// ===================== SETUP =====================
void setup() {
  Serial.begin(115200);
  
  // Seed random for cow movement simulation
  randomSeed(analogRead(0));
  
  // Generate unique device ID from MAC
  deviceID = getDeviceID();
  Serial.print("Device MAC-based ID: 0x");
  Serial.println(deviceID, HEX);
  
  sensors.begin();
  sensors.setResolution(12);
  Wire.begin();
  sensor.begin(Wire, 400000);
  sensor.setup();
  
  // No MPU initialization – simulation will be used
  
  SPI.begin(18, 19, 23, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  lora_ok = LoRa.begin(LORA_BAND);
  if (!lora_ok) {
    Serial.println("[SETUP] LoRa initialisation failed!");
  } else {
    Serial.println("[SETUP] LoRa initialised successfully");
  }
  
  checkHardware();
  Serial.println("SYSTEM READY");
  Serial.println("NOTE: MPU6050 replaced by simulated light cow movement.");
}

// ===================== LOOP =====================
void loop() {
  unsigned long now = millis();
  
  static unsigned long lastHardwareCheck = 0;
  if (now - lastHardwareCheck >= 60000) {
    lastHardwareCheck = now;
    checkHardware();
  }

  // ===================== TEMP =====================
  if (!tempConversionPending && now - lastTempRequest >= TEMP_INTERVAL) {
    sensors.requestTemperatures();
    tempConversionPending = true;
    lastTempRequest = now;
  }

  if (tempConversionPending && sensors.isConversionComplete()) {
    tempConversionPending = false;
    float raw = sensors.getTempCByIndex(0);
    if (raw != DEVICE_DISCONNECTED_C && isValidTemp(raw)) {
      lastValidTemp = raw;
      float filtered = kalmanTemp(raw);
      float calibrated = filtered + calibrationOffset;
      finalTemp = calibrated;
      Serial.print("[TEMP] ");
      Serial.println(finalTemp, 2);
      if (fabs(calibrated - stableTemp) < 0.1) stabilityCounter++;
      else stabilityCounter = 0;
      if (stabilityCounter > 3) stableTemp = calibrated;
    } else {
      if (raw == DEVICE_DISCONNECTED_C) {
        Serial.println("[TEMP] DS18B20 disconnected");
        ds18b20_ok = false;
      }
    }
  }

  // ===================== MAX30102 =====================
  static unsigned long lastSample = 0;
  if (now - lastSample >= SAMPLE_INTERVAL) {
    lastSample = now;
    sensor.check();
    while (sensor.available()) {
      long ir = sensor.getIR();
      long red = sensor.getRed();
      sensor.nextSample();

      if (ir == 0 || red == 0) continue;

      if (ir >= 250000 || red >= 250000) {
        Serial.println("[WARN] Sensor saturation - reduce pressure or LED");
        continue;
      }

      bool contact = (ir > CONTACT_THRESHOLD);

      if (!contact) {
        if (wasContact) {
          resetPPG();
          wasContact = false;
        }
        continue;
      }
      wasContact = true;

      irDC = 0.95 * irDC + 0.05 * ir;
      redDC = 0.95 * redDC + 0.05 * red;
      irAC = ir - irDC;
      redAC = red - redDC;

      float filtered = bandpass(irAC);

      sigMax = sigMax * 0.995;
      sigMin = sigMin * 0.995;
      if (filtered > sigMax) sigMax = filtered;
      if (filtered < sigMin) sigMin = filtered;

      float amp = sigMax - sigMin;
      if (amp < 30.0f) continue;

      float threshold = sigMin + amp * 0.6f;

      if (filtered > threshold && filtered > prevFiltered && !rising) {
        rising = true;
        unsigned long interval = now - lastBeat;
        if (lastBeat > 0 && interval >= 333 && interval <= 1500) {
          bpm = 60000.0f / interval;
          bpmSmooth = 0.85f * bpmSmooth + 0.15f * bpm;
          finalBPM = bpmSmooth;
          Serial.print("[BPM] ");
          Serial.println(finalBPM);

          if (finalBPM > 0) {
            bpmSum += finalBPM;
            bpmCount++;
          }
        }
        lastBeat = now;
      }
      if (filtered < threshold) rising = false;
      prevFiltered = filtered;

      if (filtered > threshold && !inPeak) {
        inPeak = true;
        irPeakValue = 0;
        redPeakValue = 0;
      }
      if (inPeak) {
        if (irAC > irPeakValue) irPeakValue = irAC;
        if (redAC > redPeakValue) redPeakValue = redAC;
      }
      if (filtered < threshold && inPeak) {
        inPeak = false;
        if (irPeakValue > 50.0f && redPeakValue > 50.0f && irDC > 1000.0f) {
          float R = (redPeakValue / redDC) / (irPeakValue / irDC);
          float spo2 = 104.0f - 15.0f * R + 10.0f;
          spo2 = constrain(spo2, 70.0f, 100.0f);
          spo2Smooth = 0.92f * spo2Smooth + 0.08f * spo2;
          finalSpO2 = spo2Smooth;
          Serial.print("[SpO2] ");
          Serial.println(finalSpO2);

          if (finalSpO2 > 0) {
            spo2Sum += finalSpO2;
            spo2Count++;
          }
        }
      }
    }
  }

  // ===================== HEARTBEAT =====================
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    isHeartbeatPacket = true;
    lastHeartbeat = now;
    Serial.println("[HEARTBEAT] Device alive");
  } else {
    isHeartbeatPacket = false;
  }

  printAverages(now);

  // ===================== SEND LoRa =====================
  if (now - lastSend >= SEND_INTERVAL_MS) {
    lastSend = now;
    
    // Get simulated accelerometer values (light cow movement)
    float accX, accY, accZ;
    simulateCowMovement(accX, accY, accZ);
    
    sendLoRa(finalTemp, 
             (int)avgBPMtoSend, 
             (int)avgSpO2toSend,
             accX, accY, accZ, 
             isHeartbeatPacket);
    Serial.println("[LOOP] LoRa sent");
  }
}