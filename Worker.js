// ================= Supabase Configuration =================
// Configure SUPABASE_URL and SUPABASE_KEY as Cloudflare Worker
// environment variables/secrets. Never commit real credentials.

const TEMP_MIN = 32;
const TEMP_MAX = 40;

const BPM_MIN = 50;
const BPM_MAX = 200;

const SPO2_MIN = 85;
const MOVEMENT_MIN = 0.2;

const OFFLINE_AFTER_MS = 60 * 1000;

// ================= Rule-Based Scoring =================
// Prototype rule-based scoring for monitoring purposes.
// This is not a medical diagnostic system.

function temperaturePenalty(temp) {
    if (temp >= TEMP_MIN && temp <= TEMP_MAX) return 0;

    const diff = temp > TEMP_MAX
        ? temp - TEMP_MAX
        : TEMP_MIN - temp;

    return Math.min(Math.round(diff * 12), 40);
}

function bpmPenalty(bpm) {
    if (bpm >= BPM_MIN && bpm <= BPM_MAX) return 0;

    const diff = bpm > BPM_MAX
        ? bpm - BPM_MAX
        : BPM_MIN - bpm;

    return Math.min(Math.round(diff * 0.4), 35);
}

function spo2Penalty(spo2) {
    if (spo2 >= SPO2_MIN) return 0;

    return Math.min((SPO2_MIN - spo2) * 5, 40);
}

function movementPenalty(movement) {
    if (movement >= MOVEMENT_MIN) return 0;

    return Math.round((MOVEMENT_MIN - movement) * 120);
}

// ================= Health Status =================

function getHealthStatus(score) {
    if (score > 70) return "healthy";
    if (score > 40) return "warning";
    return "critical";
}

// ================= Input Validation =================

function toNumber(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

// ================= Worker Handler =================

export default {
    async fetch(request, env, ctx) {
        try {
            if (request.method !== "POST") {
                return new Response("Only POST allowed", { status: 405 });
            }

            const SUPABASE_URL = env.SUPABASE_URL;
            const SUPABASE_KEY = env.SUPABASE_KEY;

            if (!SUPABASE_URL || !SUPABASE_KEY) {
                console.error("Supabase environment variables are missing.");
                return new Response("Server configuration error", { status: 500 });
            }

            const TELEMETRY_URL = `${SUPABASE_URL}/rest/v1/telemetry`;
            const ALERTS_URL = `${SUPABASE_URL}/rest/v1/alerts`;
            const DEVICES_URL = `${SUPABASE_URL}/rest/v1/devices`;

            const body = await request.json();

            // Decode base64 payload from CloudAMQP when present.
            let data;

            if (body.payload) {
                const decoded = atob(body.payload);
                data = JSON.parse(decoded);
            } else {
                data = body;
            }

            // Basic validation.
            if (!data.node_id) {
                console.warn("Missing node_id");
                return new Response("Missing node_id", { status: 400 });
            }

            // Ensure a timestamp is available.
            if (!data.ts) {
                data.ts = new Date().toISOString();
            }

            // Normalize numeric values.
            data.temperature = toNumber(data.temperature);
            data.bpm = toNumber(data.bpm);
            data.spo2 = toNumber(data.spo2);

            // Normalize accelerometer field names.
            if (data.accX !== undefined) {
                data.accx = toNumber(data.accX);
                delete data.accX;
            }

            if (data.accY !== undefined) {
                data.accy = toNumber(data.accY);
                delete data.accY;
            }

            if (data.accZ !== undefined) {
                data.accz = toNumber(data.accZ);
                delete data.accZ;
            }

            data.accx = toNumber(data.accx);
            data.accy = toNumber(data.accy);
            data.accz = toNumber(data.accz);

            // Movement is a simple prototype activity indicator.
            // It uses the sum of absolute acceleration components.
            if (data.movement === undefined) {
                data.movement =
                    Math.abs(data.accx) +
                    Math.abs(data.accy) +
                    Math.abs(data.accz);
            } else {
                data.movement = toNumber(data.movement);
            }

            // Update device availability without blocking telemetry processing.
            ctx.waitUntil(
                upsertDevice(
                    DEVICES_URL,
                    SUPABASE_KEY,
                    data.node_id,
                    data.ts
                )
            );

            // Heartbeat updates device availability but is not stored as telemetry.
            if (data.type === "heartbeat") {
                return new Response("Heartbeat OK", { status: 200 });
            }

            // ================= Rule-Based Health Score =================

            let score = 100;
            const reasons = [];

            const tp = temperaturePenalty(data.temperature);
            score -= tp;

            if (tp) {
                reasons.push({
                    parameter: "Temperature",
                    value: data.temperature,
                    penalty: tp
                });
            }

            const bp = bpmPenalty(data.bpm);
            score -= bp;

            if (bp) {
                reasons.push({
                    parameter: "Heart Rate",
                    value: data.bpm,
                    penalty: bp
                });
            }

            const sp = spo2Penalty(data.spo2);
            score -= sp;

            if (sp) {
                reasons.push({
                    parameter: "SpO2",
                    value: data.spo2,
                    penalty: sp
                });
            }

            const mp = movementPenalty(data.movement);
            score -= mp;

            if (mp) {
                reasons.push({
                    parameter: "Movement",
                    value: data.movement,
                    penalty: mp
                });
            }

            score = Math.max(0, Math.round(score));

            const healthStatus = getHealthStatus(score);

            // ================= Telemetry Payload =================
            // Health scoring is performed here in the backend,
            // not on the ESP32 Edge or sensor node.

            const telemetryData = {
                node_id: data.node_id,
                ts: data.ts,
                slot: data.slot ?? 0,
                temperature: data.temperature,
                bpm: data.bpm,
                spo2: data.spo2,
                accx: data.accx,
                accy: data.accy,
                accz: data.accz,
                movement: data.movement,
                health_score: score,
                status: healthStatus
            };

            // ================= Insert Telemetry =================

            const telemetryRes = await fetch(TELEMETRY_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify(telemetryData)
            });

            if (!telemetryRes.ok) {
                const errText = await telemetryRes.text();
                console.error("Telemetry error:", errText);
                return new Response("DB error", { status: 500 });
            }

            // ================= Alerts =================

            const alerts = [];

            // Temperature alert.
            if (
                data.temperature < TEMP_MIN ||
                data.temperature > TEMP_MAX
            ) {
                const tempMsg = data.temperature > TEMP_MAX
                    ? `High temperature (${data.temperature.toFixed(1)}°C, threshold ${TEMP_MAX}°C)`
                    : `Low temperature (${data.temperature.toFixed(1)}°C, threshold ${TEMP_MIN}°C)`;

                alerts.push({
                    node_id: data.node_id,
                    type: "temperature",
                    value: data.temperature,
                    message: tempMsg,
                    timestamp: data.ts
                });
            }

            // Heart-rate alert.
            if (
                data.bpm < BPM_MIN ||
                data.bpm > BPM_MAX
            ) {
                const bpmMsg = data.bpm > BPM_MAX
                    ? `High heart rate (${data.bpm} BPM, threshold ${BPM_MAX} BPM)`
                    : `Low heart rate (${data.bpm} BPM, threshold ${BPM_MIN} BPM)`;

                alerts.push({
                    node_id: data.node_id,
                    type: "bpm",
                    value: data.bpm,
                    message: bpmMsg,
                    timestamp: data.ts
                });
            }

            // SpO2 alert.
            if (data.spo2 < SPO2_MIN) {
                alerts.push({
                    node_id: data.node_id,
                    type: "spo2",
                    value: data.spo2,
                    message: `Low oxygen saturation (${data.spo2}%, threshold ${SPO2_MIN}%)`,
                    timestamp: data.ts
                });
            }

            // Movement alert.
            if (data.movement < MOVEMENT_MIN) {
                alerts.push({
                    node_id: data.node_id,
                    type: "movement",
                    value: data.movement,
                    message: `Low activity (${data.movement.toFixed(2)}, threshold ${MOVEMENT_MIN})`,
                    timestamp: data.ts
                });
            }

            // Overall health alert.
            if (healthStatus !== "healthy") {
                const reasonText = reasons
                    .map(
                        reason =>
                            `${reason.parameter} (-${reason.penalty})`
                    )
                    .join(", ");

                alerts.push({
                    node_id: data.node_id,
                    type: healthStatus,
                    value: score,
                    message: `Health ${healthStatus.toUpperCase()}: ${reasonText}`,
                    timestamp: data.ts
                });
            }

            if (alerts.length > 0) {
                ctx.waitUntil(
                    fetch(ALERTS_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "apikey": SUPABASE_KEY,
                            "Authorization": `Bearer ${SUPABASE_KEY}`
                        },
                        body: JSON.stringify(alerts)
                    })
                );
            }

            return new Response("OK", { status: 200 });

        } catch (err) {
            console.error("Worker error:", err);
            return new Response("Handled error", { status: 200 });
        }
    },

    // ================= Offline Detection =================

    async scheduled(event, env, ctx) {
        try {
            const SUPABASE_URL = env.SUPABASE_URL;
            const SUPABASE_KEY = env.SUPABASE_KEY;

            if (!SUPABASE_URL || !SUPABASE_KEY) {
                console.error("Supabase environment variables are missing.");
                return;
            }

            const DEVICES_URL = `${SUPABASE_URL}/rest/v1/devices`;

            const cutoff = new Date(
                Date.now() - OFFLINE_AFTER_MS
            ).toISOString();

            const res = await fetch(
                `${DEVICES_URL}?status=eq.online&last_seen=lt.${cutoff}`,
                {
                    headers: {
                        "apikey": SUPABASE_KEY,
                        "Authorization": `Bearer ${SUPABASE_KEY}`
                    }
                }
            );

            if (!res.ok) {
                console.error("Offline detection query failed.");
                return;
            }

            const devices = await res.json();

            if (!devices.length) return;

            const ids = devices
                .map(device => `"${device.node_id}"`)
                .join(",");

            const filter = `in.(${ids})`;

            await fetch(`${DEVICES_URL}?node_id=${filter}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    status: "offline"
                })
            });

        } catch (err) {
            console.error("Scheduled error:", err);
        }
    }
};

// ================= Device Upsert =================

async function upsertDevice(
    devicesUrl,
    supabaseKey,
    nodeId,
    timestamp
) {
    try {
        const headers = {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
        };

        const res = await fetch(
            `${devicesUrl}?node_id=eq.${nodeId}`,
            {
                method: "PATCH",
                headers: {
                    ...headers,
                    "Prefer": "return=representation"
                },
                body: JSON.stringify({
                    last_seen: timestamp,
                    status: "online"
                })
            }
        );

        const result = await res.json();

        // Create the device record if it does not already exist.
        if (Array.isArray(result) && result.length === 0) {
            await fetch(devicesUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    node_id: nodeId,
                    last_seen: timestamp,
                    status: "online"
                })
            });
        }

    } catch (err) {
        console.error("Device upsert error:", err);
    }
}

