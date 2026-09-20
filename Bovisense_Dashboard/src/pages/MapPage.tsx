import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDevices, useLatestTelemetry } from '../hooks/useData';
import { useTheme } from '../context/ThemeContext';
import { StatusBadge, HealthRing, LoadingSkeleton, LastUpdated } from '../components/ui';
import { LayoutGrid, Map as MapIcon, ChevronRight, Activity, AlertCircle } from 'lucide-react';
import { Device } from '../types';
// Fix Leaflet marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const RecenterMap = ({ coords }: { coords: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, map.getZoom());
  }, [coords, map]);
  return null;
};

const MapPage: React.FC = () => {
  const { devices, loading: devicesLoading, lastUpdated } = useDevices(5000);
  const { telemetryMap } = useLatestTelemetry(devices);
  const { t, dir } = useTheme();
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);

  const onlineCount = devices.filter(d => d.status === 'online').length;
  const alertCount = devices.filter(d => {
    const tel = telemetryMap[d.node_id];
    return tel && tel.health_score <= 70;
  }).length;

  const getMarkerIcon = (device: Device) => {
    const tel = telemetryMap[device.node_id];
    let color = '#9ca3af';
    if (device.status === 'online') {
      color = (tel && tel.health_score <= 70) ? '#ef4444' : '#22c55e';
    }

    // Larger marker dot - 20px size
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.4); transition: transform 0.2s;"></div>`,
      iconSize: [20, 20],
      popupAnchor: [0, -10],
    });
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row bg-gray-50 dark:bg-black" dir={dir}>
      <div className="w-full md:w-80 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col h-full">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold dark:text-white">{t('liveMap')}</h1>
            <nav className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <Link to="/" className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                <LayoutGrid className="w-4 h-4" />
              </Link>
              <Link to="/map" className="p-1.5 bg-white dark:bg-gray-700 rounded shadow-sm text-green-600">
                <MapIcon className="w-4 h-4" />
              </Link>
            </nav>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-green-600 block mb-1">{t('online')}</span>
              <span className="text-xl font-bold text-green-700 dark:text-green-400">{onlineCount}</span>
            </div>
            <div className="flex-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-red-600 block mb-1">{t('alerts')}</span>
              <span className="text-xl font-bold text-red-700 dark:text-red-400">{alertCount}</span>
            </div>
          </div>
          <div className="mt-4">
            <LastUpdated date={lastUpdated} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
          {devicesLoading ? (
            [1, 2, 3].map(i => <div key={i} className="p-4"><LoadingSkeleton /></div>)
          ) : (
            devices.map(device => (
              <div 
                key={device.node_id}
                onClick={() => device.latitude && device.longitude && setSelectedCoords([device.latitude, device.longitude])}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <HealthRing score={telemetryMap[device.node_id]?.health_score || 0} size={32} />
                    <div>
                      <h3 className="text-sm font-bold dark:text-white group-hover:text-green-600">{device.name || device.node_id}</h3>
                      <p className="text-[10px] text-gray-500">{device.farm_name}</p>
                    </div>
                  </div>
                  <StatusBadge status={device.status} className="scale-75 origin-top-right" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 relative z-0 min-h-[400px]">
        <MapContainer 
          center={[35.5873125, -0.7969375]}
          zoom={15} 
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {devices.map(device => (
            device.latitude && device.longitude && (
              <Marker 
                key={device.node_id} 
                position={[device.latitude, device.longitude]}
                icon={getMarkerIcon(device)}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[150px]">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">{device.name || device.node_id}</h3>
                      <StatusBadge status={device.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-red-500" />
                        <span className="text-[10px]">{telemetryMap[device.node_id]?.temperature?.toFixed(1) || '--'}°C</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-orange-500" />
                        <span className="text-[10px]">{telemetryMap[device.node_id]?.bpm || '--'} BPM</span>
                      </div>
                    </div>
                    <Link 
                      to={`/device/${device.node_id}`}
                      className="flex items-center justify-center w-full py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 transition-colors"
                    >
                      {t('viewDetails')} <ChevronRight className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
          {selectedCoords && <RecenterMap coords={selectedCoords} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPage;