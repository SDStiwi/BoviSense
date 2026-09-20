import { useState, useEffect, useCallback } from 'react';
import { Device, Telemetry, Alert } from '../types';
import { getDevices, getTelemetry, getAlerts, subscribeToDevices, subscribeToTelemetry } from '../api';

export const useDevices = (refreshInterval = 10000) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const data = await getDevices();
      setDevices(data);
      setLastUpdated(new Date());
      setError(null);
      console.log(`Fetched ${data.length} devices`);
    } catch (err) {
      setError('Failed to fetch devices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Subscribe to real-time updates
    const subscription = subscribeToDevices((newDevice) => {
      setDevices(prev => {
        const index = prev.findIndex(d => d.node_id === newDevice.node_id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = newDevice;
          return updated;
        }
        return [newDevice, ...prev];
      });
      setLastUpdated(new Date());
    });
    
    const interval = setInterval(fetchData, refreshInterval);
    
    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [fetchData, refreshInterval]);

  return { devices, loading, error, refetch: fetchData, lastUpdated };
};

export const useTelemetry = (node_id: string | undefined, limit = 60, refreshInterval = 15000) => {
  const [data, setData] = useState<Telemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    if (!node_id) return;
    try {
      const telemetry = await getTelemetry(node_id, limit);
      setData(telemetry);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch telemetry');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [node_id, limit]);

  useEffect(() => {
    fetchData();
    
    // Subscribe to real-time telemetry updates
    let subscription: { unsubscribe: () => void } | null = null;
    if (node_id) {
        subscription = subscribeToTelemetry(node_id, (newTelemetry) => {
        setData(prev => {
          const newData = [newTelemetry, ...prev];
          // Keep only the latest 'limit' items
          return newData.slice(0, limit);
        });
        setLastUpdated(new Date());
      });
    }
    
    const interval = setInterval(fetchData, refreshInterval);
    
    return () => {
      clearInterval(interval);
      if (subscription) subscription.unsubscribe();
    };
  }, [fetchData, refreshInterval, node_id, limit]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
};

export const useAlerts = (node_id?: string, hours = 24, refreshInterval = 20000) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const data = await getAlerts(node_id, hours);
      const alertsData = Array.isArray(data) ? data : [];
      setAlerts(alertsData);
      setLastUpdated(new Date());
      setError(null);
      console.log(`Fetched ${alertsData.length} alerts for ${hours} hours`);
    } catch (err) {
      setError('Failed to fetch alerts');
      console.error(err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [node_id, hours]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { alerts, loading, error, refetch: fetchData, lastUpdated };
};

export const useLatestTelemetry = (devices: Device[]) => {
  const [telemetryMap, setTelemetryMap] = useState<Record<string, Telemetry>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      const results: Record<string, Telemetry> = {};
      
      await Promise.all(
        devices.map(async (device) => {
          try {
            const data = await getTelemetry(device.node_id, 1);
            if (data && data.length > 0) {
              results[device.node_id] = data[0];
            }
          } catch (err) {
            console.error(`Error fetching latest telemetry for ${device.node_id}`, err);
          }
        })
      );
      setTelemetryMap(results);
      setLoading(false);
    };

    if (devices.length > 0) {
      fetchLatest();
    } else {
      setLoading(false);
    }
  }, [devices]);

  return { telemetryMap, loading };
};