export interface Device {
  node_id: string;
  name?: string;
  farm_id?: string;
  farm_name?: string;
  breed?: string;
  age?: number;
  weight?: number;
  latitude?: number;
  longitude?: number;
  last_seen: string;
  status: "online" | "offline";
}

export interface Telemetry {
  id: number;
  node_id: string;
  ts: string;
  temperature: number | null;
  bpm: number | null;
  spo2: number | null;
  movement: number;
  health_score: number;
  status: 'healthy' | 'warning' | 'critical';
  accX?: number;
  accY?: number;
  accZ?: number;
}

export interface Alert {
  id: number;
  node_id: string;
  timestamp: string;
  type: string;
  value: number | null;
  message: string;
}

export interface User {
  id?: string;
  username: string;
  role: 'admin' | 'farmer';
  full_name?: string;
  email?: string;
}
