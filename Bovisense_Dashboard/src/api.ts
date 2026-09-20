import { supabase } from './api/supabaseClient';
import * as demoApi from './api/demo';
import { Device, Telemetry, Alert, User } from './types';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Login
export const login = async (email: string, password: string) => {
  if (DEMO_MODE) {
    return demoApi.login(email, password);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return {
    success: true,
    user: {
      id: data.user.id,
      username: profile?.username || email.split('@')[0],
      role: profile?.role || 'farmer',
      full_name: profile?.full_name || '',
      email: data.user.email,
    },
  };
};

// Logout
export const logout = async () => {
  if (DEMO_MODE) {
    return demoApi.logout();
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
};

// Get current session user
export const getCurrentUser = async (): Promise<User | null> => {
  if (DEMO_MODE) {
    return demoApi.getCurrentUser();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    username: profile?.username || user.email?.split('@')[0] || '',
    role: profile?.role || 'farmer',
    full_name: profile?.full_name || '',
    email: user.email || undefined,
  };
};

// Get devices
export const getDevices = async (): Promise<Device[]> => {
  if (DEMO_MODE) {
    return demoApi.getDevices();
  }

  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('name');

  if (error) {
    throw error;
  }

  return data || [];
};

// Get telemetry
export const getTelemetry = async (
  node_id: string,
  limit: number = 60
): Promise<Telemetry[]> => {
  if (DEMO_MODE) {
    return demoApi.getTelemetry(node_id, limit);
  }

  const { data, error } = await supabase
    .from('telemetry')
    .select('*')
    .eq('node_id', node_id)
    .order('ts', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
};

// Get alerts
export const getAlerts = async (
  node_id?: string,
  hours: number = 24
): Promise<Alert[]> => {
  if (DEMO_MODE) {
    return demoApi.getAlerts(node_id, hours);
  }

  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);

  let query = supabase
    .from('alerts')
    .select('*')
    .gte('timestamp', cutoffTime.toISOString())
    .order('timestamp', { ascending: false });

  if (node_id) {
    query = query.eq('node_id', node_id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
};

// Real-time telemetry subscription
export const subscribeToTelemetry = (
  node_id: string,
  callback: (data: Telemetry) => void
) => {
  if (DEMO_MODE) {
    return demoApi.subscribeToTelemetry(node_id, callback);
  }

  return supabase
    .channel(`telemetry:${node_id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'telemetry',
        filter: `node_id=eq.${node_id}`,
      },
      (payload) => {
        callback(payload.new as Telemetry);
      }
    )
    .subscribe();
};

// Real-time device subscription
export const subscribeToDevices = (
  callback: (data: Device) => void
) => {
  if (DEMO_MODE) {
    return demoApi.subscribeToDevices(callback);
  }

  return supabase
    .channel('devices')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'devices',
      },
      (payload) => {
        callback(payload.new as Device);
      }
    )
    .subscribe();
};
