import { Device, Telemetry, Alert, User } from '../types';
import { subMinutes, subHours } from 'date-fns';

const DEMO_LOCATION = {
  latitude: 35.5873125,
  longitude: -0.7969375,
};

const DEMO_USER: User = {
  id: 'demo-user',
  username: 'demo',
  role: 'farmer',
  full_name: 'Demo User',
  email: 'demo@bovisense.local',
};

export const MOCK_DEVICES: Device[] = [
  {
    node_id: 'CT-001',
    name: 'Cow 001',
    farm_name: 'Misserghin Farm',
    breed: 'Angus',
    age: 3,
    weight: 1200,
    ...DEMO_LOCATION,
    last_seen: new Date().toISOString(),
    status: 'online',
  },
  {
    node_id: 'CT-002',
    name: 'Cow 002',
    farm_name: 'Misserghin Farm',
    breed: 'Angus',
    age: 2,
    weight: 1100,
    ...DEMO_LOCATION,
    last_seen: subMinutes(new Date(), 5).toISOString(),
    status: 'online',
  },
  {
    node_id: 'CT-003',
    name: 'Cow 003',
    farm_name: 'Misserghin Farm',
    breed: 'Hereford',
    age: 4,
    weight: 1300,
    ...DEMO_LOCATION,
    last_seen: subMinutes(new Date(), 45).toISOString(),
    status: 'online',
  },
  {
    node_id: 'CT-004',
    name: 'Cow 004',
    farm_name: 'Misserghin Farm',
    breed: 'Holstein',
    age: 5,
    weight: 1250,
    ...DEMO_LOCATION,
    last_seen: subHours(new Date(), 3).toISOString(),
    status: 'offline',
  },
  {
    node_id: 'CT-005',
    name: 'Cow 005',
    farm_name: 'Misserghin Farm',
    breed: 'Brahman',
    age: 2,
    weight: 950,
    ...DEMO_LOCATION,
    last_seen: new Date().toISOString(),
    status: 'online',
  },
  {
    node_id: 'CT-006',
    name: 'Cow 006',
    farm_name: 'Misserghin Farm',
    breed: 'Brahman',
    age: 3,
    weight: 1050,
    ...DEMO_LOCATION,
    last_seen: new Date().toISOString(),
    status: 'online',
  },
];

export const generateMockTelemetry = (
  node_id: string,
  limit: number = 60
): Telemetry[] => {
  const data: Telemetry[] = [];
  const now = new Date();

  for (let i = 0; i < limit; i++) {
    const ts = subMinutes(now, i * 2).toISOString();

    data.push({
      id: Math.floor(Math.random() * 100000),
      node_id,
      ts,
      temperature: 38.5 + Math.random() * 1.5,
      bpm: 60 + Math.random() * 30,
      spo2: 95 + Math.random() * 5,
      movement: Math.floor(Math.random() * 5),
      health_score: 70 + Math.random() * 30,
      status: 'healthy',
      accX: Math.random() * 2 - 1,
      accY: Math.random() * 2 - 1,
      accZ: Math.random() * 2 - 1,
    });
  }

  return data;
};

export const MOCK_ALERTS: Alert[] = [
  {
    id: 1,
    node_id: 'CT-001',
    timestamp: subMinutes(new Date(), 10).toISOString(),
    type: 'TEMP',
    value: 40.2,
    message: 'High temperature detected',
  },
  {
    id: 2,
    node_id: 'CT-003',
    timestamp: subHours(new Date(), 1).toISOString(),
    type: 'BPM',
    value: 95,
    message: 'Elevated heart rate',
  },
  {
    id: 3,
    node_id: 'CT-004',
    timestamp: subHours(new Date(), 4).toISOString(),
    type: 'CONN',
    value: null,
    message: 'Device offline',
  },
  {
    id: 4,
    node_id: 'CT-005',
    timestamp: subMinutes(new Date(), 30).toISOString(),
    type: 'SPO2',
    value: 92,
    message: 'Low oxygen level',
  },
];

// Demo authentication
const DEMO_SESSION_KEY = 'bovisense_demo_session';

export const login = async (email: string, password: string) => {
  if (email !== 'demo@bovisense.local' || password !== 'demo123') {
    throw new Error('Invalid demo credentials');
  }

  localStorage.setItem(DEMO_SESSION_KEY, 'true');

  return {
    success: true,
    user: DEMO_USER,
  };
};

export const logout = async () => {
  localStorage.removeItem(DEMO_SESSION_KEY);
};

export const getCurrentUser = async (): Promise<User | null> => {
  const isLoggedIn = localStorage.getItem(DEMO_SESSION_KEY) === 'true';

  return isLoggedIn ? DEMO_USER : null;
};
// Demo device data
export const getDevices = async (): Promise<Device[]> => {
  return MOCK_DEVICES;
};

// Demo telemetry data
export const getTelemetry = async (
  node_id: string,
  limit: number = 60
): Promise<Telemetry[]> => {
  return generateMockTelemetry(node_id, limit);
};

// Demo alerts
export const getAlerts = async (
  node_id?: string,
  _hours: number = 24
): Promise<Alert[]> => {
  if (node_id) {
    return MOCK_ALERTS.filter((alert) => alert.node_id === node_id);
  }

  return MOCK_ALERTS;
};

// Demo telemetry subscription
export const subscribeToTelemetry = (
  node_id: string,
  callback: (data: Telemetry) => void
) => {
  const interval = window.setInterval(() => {
    const telemetry = generateMockTelemetry(node_id, 1)[0];
    callback(telemetry);
  }, 10000);

  return {
    unsubscribe: () => {
      window.clearInterval(interval);
    },
  };
};

// Demo device subscription
export const subscribeToDevices = (
  callback: (data: Device) => void
) => {
  const interval = window.setInterval(() => {
    const device = MOCK_DEVICES[Math.floor(Math.random() * MOCK_DEVICES.length)];
    callback(device);
  }, 30000);

  return {
    unsubscribe: () => {
      window.clearInterval(interval);
    },
  };
};
