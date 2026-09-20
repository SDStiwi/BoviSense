import React from 'react';
import { 
  Thermometer, 
  Heart, 
  Droplets, 
  Signal, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { cn } from '../utils/cn';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'healthy' | 'warning' | 'critical';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const styles = {
  online: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  offline: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  healthy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const dots = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  healthy: 'bg-green-500',
  warning: 'bg-orange-500',
  critical: 'bg-red-500',
};
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', styles[status], className)}>
      <span className={cn('w-2 h-2 mr-1.5 rounded-full animate-pulse', dots[status])} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

interface HealthRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const HealthRing: React.FC<HealthRingProps> = ({ score, size = 48, strokeWidth = 4, className }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  let color = 'text-green-500';
 if (score <= 40) color = 'text-red-500';
else if (score <= 70) color = 'text-orange-500';

  return (
    <div className={cn('relative flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn('transition-all duration-500 ease-in-out', color)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[10px] font-bold">{Math.round(score)}%</span>
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  };
  status?: 'normal' | 'warning' | 'danger';
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, icon, status = 'normal' }) => {
  const borders = {
    normal: 'border-gray-200 dark:border-gray-800',
    warning: 'border-orange-500',
    danger: 'border-red-500',
  };

  return (
    <div className={cn('bg-white dark:bg-gray-900 p-4 rounded-xl border-2 transition-all', borders[status])}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">{icon}</div>
      </div>
      <div className="flex items-baseline">
        <span className="text-2xl font-bold dark:text-white">{value}</span>
        {unit && <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
      </div>
    </div>
  );
};

export const SectionHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
    {action}
  </div>
);

export const AlertTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'TEMP': return <Thermometer className="w-4 h-4 text-red-500" />;
    case 'BPM': return <Heart className="w-4 h-4 text-orange-500" />;
    case 'SPO2': return <Droplets className="w-4 h-4 text-blue-500" />;
    case 'CONN': return <Signal className="w-4 h-4 text-gray-500" />;
    default: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  }
};

export const LoadingSkeleton = () => (
  <div className="animate-pulse flex space-x-4 p-4 bg-white dark:bg-gray-900 rounded-xl">
    <div className="rounded-full bg-gray-200 dark:bg-gray-800 h-12 w-12"></div>
    <div className="flex-1 space-y-4 py-1">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

export const LastUpdated: React.FC<{ date: Date }> = ({ date }) => (
  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
    <RefreshCw className="w-3 h-3 mr-1 animate-spin-slow" />
    Last updated: {date.toLocaleTimeString()}
  </div>
);
