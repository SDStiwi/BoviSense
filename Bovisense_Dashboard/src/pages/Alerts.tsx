import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAlerts } from '../hooks/useData';
import { useTheme } from '../context/ThemeContext';
import {
  AlertTypeIcon,
  LastUpdated,
  LoadingSkeleton
} from '../components/ui';
import { format } from 'date-fns';
import { Filter, ChevronRight } from 'lucide-react';

const Alerts: React.FC = () => {
  const [hours, setHours] = useState(24);
  const { alerts, loading, lastUpdated } = useAlerts(undefined, hours);
  const { t } = useTheme();

  const hourOptions = [
    { value: 6, label: t('last6h') },
    { value: 24, label: t('last24h') },
    { value: 48, label: t('last48h') },
    { value: 168, label: t('last7d') },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('systemAlerts')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('reviewHealth')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <LastUpdated date={lastUpdated} />

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none appearance-none"
            >
              {hourOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-20 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-gray-300" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('noAlertsFound')}
            </h3>

            <p className="text-gray-500">
              {t('adjustFilter')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t('type')}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t('device')}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t('message')}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t('value')}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t('timestamp')}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg inline-flex">
                        <AlertTypeIcon type={alert.type} />
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        to={`/device/${alert.node_id}`}
                        className="font-bold text-green-600 hover:underline"
                      >
                        {alert.node_id}
                      </Link>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {alert.message}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {alert.value !== null ? (
                        <span className="text-sm font-mono font-semibold dark:text-gray-200">
                          {alert.value}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {format(new Date(alert.timestamp), 'MMM d, HH:mm:ss')}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/device/${alert.node_id}`}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        aria-label={t('viewDetails')}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;

