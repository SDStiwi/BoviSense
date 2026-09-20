import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Telemetry } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import {
  ChevronLeft,
  Thermometer,
  Heart,
  Droplets,
  Activity,
  Calendar,
  Weight,
  Info,
  ArrowUpRight,
} from 'lucide-react';
import { useDevices, useTelemetry, useAlerts } from '../hooks/useData';
import {
  StatusBadge,
  HealthRing,
  MetricCard,
  SectionHeader,
  LastUpdated,
  AlertTypeIcon,
  LoadingSkeleton,
} from '../components/ui';
import { format } from 'date-fns';

const DeviceDetail: React.FC = () => {
  const { node_id } = useParams<{ node_id: string }>();
  const { devices } = useDevices();
  const {
    data: telemetry,
    loading: telLoading,
    lastUpdated: telUpdated,
  } = useTelemetry(node_id, 60);
  const { alerts, loading: alertsLoading } = useAlerts(node_id, 48);
  const { t } = useTheme();

  const device = devices.find((d) => d.node_id === node_id);
  const latest = telemetry[0];

  if (!device && !telLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Info className="w-6 h-6 text-gray-400" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('deviceNotFound')}
        </h2>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('deviceNotFoundDescription')}
        </p>

        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
          aria-label={t('backToDashboard')}
        >
          <ChevronLeft className="w-4 h-4" />
          {t('backToDashboard')}
        </Link>
      </div>
    );
  }

  const chartData = [...telemetry].reverse().map((item) => ({
    ...item,
    time: format(new Date(item.ts), 'HH:mm'),
  }));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/70 dark:border-gray-800 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              to="/"
              className="shrink-0 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('backToDashboard')}
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>

            <HealthRing score={latest?.health_score || 0} size={64} />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {device?.name || node_id}
                </h1>

                <StatusBadge status={device?.status || 'offline'} />
              </div>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                {node_id} • {device?.farm_name}
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:items-end gap-3">
            <LastUpdated date={telUpdated} />

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                {device?.breed || '—'}
              </span>

              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {device?.age
                  ? `${device.age} ${t('years')}`
                  : '—'}
              </span>

              <span className="flex items-center gap-1.5">
                <Weight className="w-3.5 h-3.5" />
                {device?.weight
                  ? `${device.weight} ${t('kg')}`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vitals */}
      <div>
        <div className="mb-4">
          <SectionHeader title={t('currentVitals')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label={t('temperature')}
            value={latest?.temperature?.toFixed(1) || '--'}
            unit="°C"
            icon={<Thermometer className="w-5 h-5 text-red-500" />}
            status={
              latest?.temperature && latest.temperature > 39.5
                ? 'danger'
                : latest?.temperature && latest.temperature > 39
                  ? 'warning'
                  : 'normal'
            }
          />

          <MetricCard
            label={t('heartRate')}
            value={latest?.bpm || '--'}
            unit="BPM"
            icon={<Heart className="w-5 h-5 text-orange-500" />}
            status={
              latest?.bpm && latest.bpm > 90
                ? 'danger'
                : latest?.bpm && latest.bpm > 80
                  ? 'warning'
                  : 'normal'
            }
          />

          <MetricCard
            label={t('bloodOxygen')}
            value={latest?.spo2 || '--'}
            unit="%"
            icon={<Droplets className="w-5 h-5 text-blue-500" />}
            status={
              latest?.spo2 && latest.spo2 < 94
                ? 'danger'
                : latest?.spo2 && latest.spo2 < 96
                  ? 'warning'
                  : 'normal'
            }
          />

          <MetricCard
            label={t('movement')}
            value={latest?.movement || 0}
            unit={t('activity')}
            icon={<Activity className="w-5 h-5 text-green-500" />}
          />
        </div>
      </div>

      {/* Charts */}
      <div>
        <div className="mb-4">
          <SectionHeader title={t('telemetryHistory')} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartSection
            title={`${t('bodyTemperature')} (°C)`}
            data={chartData}
            dataKey="temperature"
            color="#ef4444"
            domain={[36, 42]}
            refLine={39}
          />

          <ChartSection
            title={`${t('heartRate')} (BPM)`}
            data={chartData}
            dataKey="bpm"
            color="#f97316"
            domain={[40, 120]}
            refLine={80}
          />

          <ChartSection
            title={`${t('bloodOxygen')} (%)`}
            data={chartData}
            dataKey="spo2"
            color="#3b82f6"
            domain={[88, 100]}
            refLine={96}
          />

          <ChartSection
            title={t('movementActivity')}
            data={chartData}
            dataKey="movement"
            color="#22c55e"
            domain={[0, 5]}
          />
        </div>
      </div>

      {/* Accelerometer & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accelerometer */}
        <div className="lg:col-span-1">
          <SectionHeader title={t('accelerometer')} />

          <div className="mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/70 dark:border-gray-800 p-5">
            <div className="grid grid-cols-3 gap-3">
              <AxisValue
                axis="X"
                value={latest?.accX}
              />

              <AxisValue
                axis="Y"
                value={latest?.accY}
              />

              <AxisValue
                axis="Z"
                value={latest?.accZ}
              />
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Activity className="w-3.5 h-3.5" />
                {t('motionData')}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="lg:col-span-2">
          <SectionHeader title={t('deviceAlerts48h')} />

          <div className="mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/70 dark:border-gray-800 overflow-hidden">
            {alertsLoading ? (
              <div className="p-4">
                <LoadingSkeleton />
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
                  <Activity className="w-5 h-5 text-green-500" />
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('noDeviceAlerts')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="shrink-0 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <AlertTypeIcon type={alert.type} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {alert.message}
                        </p>

                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(
                            new Date(alert.timestamp),
                            'MMM d, HH:mm'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {alert.value !== null && (
                        <span className="text-sm font-mono font-semibold bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 rounded-lg">
                          {alert.value}
                        </span>
                      )}

                      <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface AxisValueProps {
  axis: string;
  value?: number;
}

const AxisValue: React.FC<AxisValueProps> = ({ axis, value }) => (
  <div className="bg-gray-50 dark:bg-gray-800/70 rounded-xl p-4 text-center">
    <span className="text-xs font-medium text-gray-400 uppercase">
      {axis}
    </span>

    <div className="mt-1 font-mono font-bold text-gray-900 dark:text-white">
      {value?.toFixed(2) || '0.00'}
    </div>
  </div>
);

interface ChartSectionProps {
  title: string;
  data: Telemetry[];
  dataKey: keyof Telemetry;
  color: string;
  domain: [number, number];
  refLine?: number;
}

const ChartSection: React.FC<ChartSectionProps> = ({
  title,
  data,
  dataKey,
  color,
  domain,
  refLine,
}) => (
  <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl border border-gray-200/70 dark:border-gray-800">
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300">
        {title}
      </h3>

      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>

    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />

          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={domain}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
            }}
            itemStyle={{ color: '#fff' }}
          />

          {refLine !== undefined && (
            <ReferenceLine
              y={refLine}
              stroke="#94a3b8"
              strokeDasharray="3 3"
            />
          )}

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default DeviceDetail;