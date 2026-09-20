import { supabase } from './supabaseClient';
import { Device, Telemetry, Alert, User } from '../types';

// ---------- Authentication ----------
export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  // Fetch user profile from profiles table
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
    }
  };
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    username: profile?.username || user.email?.split('@')[0],
    role: profile?.role || 'farmer',
    full_name: profile?.full_name || '',
    email: user.email,
  };
};

// ---------- Devices ----------
export const getDevices = async (): Promise<Device[]> => {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
};

// ---------- Telemetry ----------
export const getTelemetry = async (node_id: string, limit: number = 60): Promise<Telemetry[]> => {
  const { data, error } = await supabase
    .from('telemetry')
    .select('*')
    .eq('node_id', node_id)
    .order('ts', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
};

// ---------- Alerts ----------
export const getAlerts = async (node_id?: string, hours: number = 24): Promise<Alert[]> => {
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
  if (error) throw error;
  return data || [];
};

// ---------- Real-time subscriptions ----------
export const subscribeToTelemetry = (node_id: string, callback: (data: Telemetry) => void) => {
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

export const subscribeToDevices = (callback: (data: Device) => void) => {
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