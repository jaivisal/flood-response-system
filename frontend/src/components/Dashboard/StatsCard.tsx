import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  color: 'red' | 'green' | 'blue' | 'orange' | 'purple' | 'gray' | 'yellow';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  subtitle?: string;
  onClick?: () => void;
}

const colorClasses = {
  red: {
    bg: 'bg-red-500',
    text: 'text-red-600',
    bgLight: 'bg-red-50',
    border: 'border-red-200',
  },
  green: {
    bg: 'bg-green-500',
    text: 'text-green-600',
    bgLight: 'bg-green-50',
    border: 'border-green-200',
  },
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
  },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-600',
    bgLight: 'bg-orange-50',
    border: 'border-orange-200',
  },
  purple: {
    bg: 'bg-purple-500',
    text: 'text-purple-600',
    bgLight: 'bg-purple-50',
    border: 'border-purple-200',
  },
  gray: {
    bg: 'bg-gray-500',
    text: 'text-gray-600',
    bgLight: 'bg-gray-50',
    border: 'border-gray-200',
  },
  yellow: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-600',
    bgLight: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
};

const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    case 'stable':
      return <Minus className="w-4 h-4 text-gray-500" />;
    default:
      return null;
  }
};

const getTrendColor = (trend?: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return 'text-red-600';
    case 'down':
      return 'text-green-600';
    case 'stable':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
};

export default function StatsCard({
  title,
  value,
  unit,
  icon: Icon,
  color,
  trend,
  trendValue,
  subtitle,
  onClick,
}: StatsCardProps) {
  const colors = colorClasses[color];

  // Safely handle the value - ensure it's never undefined or null
  const displayValue = value ?? 0;
  const displayTrendValue = trendValue ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      className={`relative overflow-hidden rounded-xl bg-white p-6 shadow-sm border ${colors.border} ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } transition-all duration-200`}
      onClick={onClick}
    >
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${colors.bgLight} rounded-full -mr-16 -mt-16 opacity-50`} />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-lg ${colors.bgLight}`}>
            <Icon className={`h-6 w-6 ${colors.text}`} />
          </div>
          {trend && (
            <div className="flex items-center space-x-1">
              {getTrendIcon(trend)}
              {trendValue !== undefined && (
                <span className={`text-sm font-medium ${getTrendColor(trend)}`}>
                  {Math.abs(displayTrendValue)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Main value */}
        <div className="mt-4">
          <div className="flex items-baseline space-x-2">
            <h3 className="text-3xl font-bold text-gray-900">
              {displayValue.toLocaleString()}
            </h3>
            {unit && (
              <span className="text-lg font-medium text-gray-500">{unit}</span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-gray-600">{title}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>

        {/* Progress bar for certain metrics */}
        {color === 'blue' && typeof displayValue === 'number' && displayValue <= 100 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${displayValue}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className={`h-2 rounded-full ${colors.bg}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hover effect */}
      {onClick && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-0 hover:opacity-10 transition-opacity duration-200"
          whileHover={{ opacity: 0.1 }}
        />
      )}
    </motion.div>
  );
}