import React from 'react';
import { Link } from 'react-router-dom';
import { useDevices, useLatestTelemetry, useAlerts } from '../hooks/useData';
import { useTheme } from '../context/ThemeContext';
import {
  StatusBadge,
  HealthRing,
  SectionHeader,
  LastUpdated,
  AlertTypeIcon,
  LoadingSkeleton,
} from '../components/ui';
import {
  Activity,
  Signal,
  AlertCircle,
  Users,
  LayoutGrid,
  Map as MapIcon,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Dashboard: React.FC = () => {
  const { t } = useTheme();
  const {
    devices,
    loading: devicesLoading,
    lastUpdated: devicesUpdated,
  } = useDevices();
  const { alerts, loading: alertsLoading } = useAlerts(undefined, 1);
  const { telemetryMap, loading: telemetryLoading } =
    useLatestTelemetry(devices);

  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const onlinePercent =
    totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;

  const recentAlertsCount = alerts.length;

  const avgHealth =
    Object.values(telemetryMap).length > 0
      ? Math.round(
          Object.values(telemetryMap).reduce(
            (acc, curr) => acc + (curr.health_score || 0),
            0
          ) / Object.values(telemetryMap).length
        )
      : 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
            BoviSense
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t('cattleDashboard')}
          </h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('monitoringHealth')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <LastUpdated date={devicesUpdated} />

          <nav className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700">
            <Link
              to="/"
              className="flex items-center px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm text-sm font-medium transition-all"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              {t('grid')}
            </Link>

            <Link
              to="/map"
              className="flex items-center px-4 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
            >
              <MapIcon className="w-4 h-4 mr-2" />
              {t('map')}
            </Link>
          </nav>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={t('totalDevices')}
          value={totalDevices}
          icon={<Users className="w-5 h-5 text-blue-500" />}
          loading={devicesLoading}
        />

        <StatCard
          label={t('onlineDevices')}
          value={`${onlineDevices} (${onlinePercent}%)`}
          icon={<Signal className="w-5 h-5 text-green-500" />}
          loading={devicesLoading}
        />

        <StatCard
          label={t('alerts1h')}
          value={recentAlertsCount}
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          status={recentAlertsCount > 0 ? 'danger' : 'normal'}
          loading={alertsLoading}
        />

        <StatCard
          label={t('avgHealthScore')}
          value={`${avgHealth}%`}
          icon={<Activity className="w-5 h-5 text-orange-500" />}
          loading={telemetryLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Device Grid */}
        <div className="lg:col-span-2 space-y-5">
          <SectionHeader title={t('devices')} />

          {devicesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <LoadingSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devices.map((device) => (
                <Link
                  key={device.node_id}
                  to={`/device/${device.node_id}`}
                  className="group"
                >
                  <div className="h-full bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/70 dark:border-gray-800 hover:border-green-400 dark:hover:border-green-700 hover:shadow-md transition-all duration-200">
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <HealthRing
                          score={
                            telemetryMap[device.node_id]?.health_score || 0
                          }
                          size={50}
                        />

                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">
                            {device.name || device.node_id}
                          </h3>

                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {device.farm_name}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status={device.status} />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex gap-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            {t('temp')}
                          </span>

                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                            {telemetryMap[device.node_id]?.temperature?.toFixed(
                              1
                            ) || '--'}
                            °C
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            {t('bpm')}
                          </span>

                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                            {telemetryMap[device.node_id]?.bpm || '--'}
                          </span>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all" />
                    </div>

                    <div className="mt-3 text-[10px] text-gray-400">
                      {t('seen')}{' '}
                      {formatDistanceToNow(new Date(device.last_seen))} ago
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="space-y-5">
          <SectionHeader
            title={t('recentAlerts')}
            action={
              <Link
                to="/alerts"
                className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center"
              >
                <Bell className="w-4 h-4 mr-1" />
                {t('viewAll')}
              </Link>
            }
          />

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/70 dark:border-gray-800 overflow-hidden">
            {alertsLoading ? (
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-full" />
                </div>
              ))
            ) : alerts.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-green-500" />
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('noAlerts')}
                </p>
              </div>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 flex gap-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg h-fit">
                    <AlertTypeIcon type={alert.type} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <Link
                        to={`/device/${alert.node_id}`}
                        className="text-sm font-bold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 truncate transition-colors"
                      >
                        {alert.node_id}
                      </Link>

                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(alert.timestamp))} ago
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  status?: 'normal' | 'danger';
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  status = 'normal',
  loading,
}) => (
  <div
    className={`bg-white dark:bg-gray-900 p-5 rounded-2xl border transition-all hover:shadow-sm ${
      status === 'danger'
        ? 'border-red-200 dark:border-red-900/60'
        : 'border-gray-200/70 dark:border-gray-800'
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </span>

      <div
        className={`p-2.5 rounded-xl ${
          status === 'danger'
            ? 'bg-red-50 dark:bg-red-900/20'
            : 'bg-gray-50 dark:bg-gray-800'
        }`}
      >
        {icon}
      </div>
    </div>

    {loading ? (
      <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-1/2" />
    ) : (
      <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
        {value}
      </div>
    )}
  </div>
);

export default Dashboard;