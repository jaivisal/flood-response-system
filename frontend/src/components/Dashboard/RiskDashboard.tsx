import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  MapPin, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Shield,
  Droplets,
  Wind,
  Thermometer,
  Eye
} from 'lucide-react';
import { useFloodZones } from '../../hooks/useFloodZones';
import { useIncidents } from '../../hooks/useIncidents';
import { FloodZone, Incident } from '../../types';

interface RiskDashboardProps {
  className?: string;
}

interface RiskMetrics {
  totalRisk: number;
  criticalZones: number;
  peopleAtRisk: number;
  trendDirection: 'up' | 'down' | 'stable';
  riskDistribution: {
    extreme: number;
    very_high: number;
    high: number;
    medium: number;
    low: number;
    very_low: number;
  };
}

const getRiskColor = (level: string) => {
  const colors = {
    extreme: '#7c2d12',
    very_high: '#dc2626',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#22c55e',
    very_low: '#10b981'
  };
  return colors[level as keyof typeof colors] || '#6b7280';
};

const getRiskLabel = (level: string) => {
  const labels = {
    extreme: 'Extreme',
    very_high: 'Very High',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    very_low: 'Very Low'
  };
  return labels[level as keyof typeof labels] || level;
};

export default function RiskDashboard({ className = '' }: RiskDashboardProps) {
  const { data: floodZones = [], isLoading: zonesLoading } = useFloodZones();
  const { data: incidents = [], isLoading: incidentsLoading } = useIncidents();
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(null);

  // Calculate risk metrics
  const riskMetrics = useMemo((): RiskMetrics => {
    if (!floodZones.length) {
      return {
        totalRisk: 0,
        criticalZones: 0,
        peopleAtRisk: 0,
        trendDirection: 'stable',
        riskDistribution: {
          extreme: 0,
          very_high: 0,
          high: 0,
          medium: 0,
          low: 0,
          very_low: 0
        }
      };
    }

    // Calculate risk distribution
    const riskDistribution = floodZones.reduce((acc, zone) => {
      acc[zone.risk_level as keyof typeof acc] = (acc[zone.risk_level as keyof typeof acc] || 0) + 1;
      return acc;
    }, {
      extreme: 0,
      very_high: 0,
      high: 0,
      medium: 0,
      low: 0,
      very_low: 0
    });

    // Calculate total risk score (weighted)
    const riskWeights = { extreme: 6, very_high: 5, high: 4, medium: 3, low: 2, very_low: 1 };
    const totalRisk = Math.round(
      Object.entries(riskDistribution).reduce((total, [level, count]) => {
        return total + (count * riskWeights[level as keyof typeof riskWeights]);
      }, 0) / floodZones.length
    );

    // Critical zones (high, very high, extreme)
    const criticalZones = riskDistribution.extreme + riskDistribution.very_high + riskDistribution.high;

    // People at risk in critical zones
    const peopleAtRisk = floodZones
      .filter(zone => ['extreme', 'very_high', 'high'].includes(zone.risk_level))
      .reduce((total, zone) => total + zone.population_estimate, 0);

    // Determine trend (simplified logic - in real app, compare with historical data)
    const recentIncidents = incidents.filter(incident => {
      const incidentDate = new Date(incident.created_at);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return incidentDate > dayAgo;
    }).length;

    const trendDirection: 'up' | 'down' | 'stable' = 
      recentIncidents > 5 ? 'up' : 
      recentIncidents < 2 ? 'down' : 'stable';

    return {
      totalRisk,
      criticalZones,
      peopleAtRisk,
      trendDirection,
      riskDistribution
    };
  }, [floodZones, incidents]);

  // Weather simulation data (in real app, this would come from weather API)
  const weatherData = {
    temperature: 28,
    humidity: 75,
    windSpeed: 12,
    precipitation: 15,
    floodRisk: 'medium'
  };

  if (zonesLoading || incidentsLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Shield className="w-6 h-6 text-red-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
            <p className="text-sm text-gray-500">Real-time flood risk analysis</p>
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Activity className="w-4 h-4 mr-1" />
          <span>Live monitoring</span>
        </div>
      </div>

      {/* Overall Risk Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-red-900">Overall Risk Level</h4>
            <p className="text-sm text-red-700">Based on {floodZones.length} monitored zones</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-red-600">
              {riskMetrics.totalRisk}/6
            </div>
            <div className="flex items-center text-sm">
              {riskMetrics.trendDirection === 'up' && (
                <>
                  <TrendingUp className="w-4 h-4 text-red-600 mr-1" />
                  <span className="text-red-600">Rising</span>
                </>
              )}
              {riskMetrics.trendDirection === 'down' && (
                <>
                  <TrendingDown className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-green-600">Improving</span>
                </>
              )}
              {riskMetrics.trendDirection === 'stable' && (
                <>
                  <Activity className="w-4 h-4 text-gray-600 mr-1" />
                  <span className="text-gray-600">Stable</span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center p-3 bg-red-50 rounded-lg border border-red-200"
        >
          <div className="text-2xl font-bold text-red-600">{riskMetrics.criticalZones}</div>
          <div className="text-xs text-red-700">Critical Zones</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200"
        >
          <div className="text-2xl font-bold text-orange-600">
            {Math.round(riskMetrics.peopleAtRisk / 1000)}K
          </div>
          <div className="text-xs text-orange-700">People at Risk</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200"
        >
          <div className="text-2xl font-bold text-blue-600">{floodZones.length}</div>
          <div className="text-xs text-blue-700">Total Zones</div>
        </motion.div>
      </div>

      {/* Risk Distribution */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Risk Distribution</h4>
        <div className="space-y-2">
          {Object.entries(riskMetrics.riskDistribution).map(([level, count], index) => {
            const percentage = floodZones.length > 0 ? (count / floodZones.length) * 100 : 0;
            const isSelected = selectedRiskLevel === level;
            
            return (
              <motion.div
                key={level}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected ? 'transform scale-105' : ''
                }`}
                onClick={() => setSelectedRiskLevel(isSelected ? null : level)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    {getRiskLabel(level)}
                  </span>
                  <span className="text-xs text-gray-500">{count} zones</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className="h-2 rounded-full transition-all duration-200"
                    style={{ 
                      backgroundColor: getRiskColor(level),
                      opacity: isSelected ? 1 : 0.8
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Current Conditions */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Current Conditions</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center p-2 bg-blue-50 rounded-lg">
            <Thermometer className="w-4 h-4 text-blue-600 mr-2" />
            <div>
              <div className="text-sm font-medium text-blue-900">{weatherData.temperature}°C</div>
              <div className="text-xs text-blue-700">Temperature</div>
            </div>
          </div>
          
          <div className="flex items-center p-2 bg-cyan-50 rounded-lg">
            <Droplets className="w-4 h-4 text-cyan-600 mr-2" />
            <div>
              <div className="text-sm font-medium text-cyan-900">{weatherData.humidity}%</div>
              <div className="text-xs text-cyan-700">Humidity</div>
            </div>
          </div>
          
          <div className="flex items-center p-2 bg-gray-50 rounded-lg">
            <Wind className="w-4 h-4 text-gray-600 mr-2" />
            <div>
              <div className="text-sm font-medium text-gray-900">{weatherData.windSpeed} km/h</div>
              <div className="text-xs text-gray-700">Wind Speed</div>
            </div>
          </div>
          
          <div className="flex items-center p-2 bg-indigo-50 rounded-lg">
            <Droplets className="w-4 h-4 text-indigo-600 mr-2" />
            <div>
              <div className="text-sm font-medium text-indigo-900">{weatherData.precipitation}mm</div>
              <div className="text-xs text-indigo-700">Precipitation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Currently Flooded Areas */}
      {floodZones.some(zone => zone.is_currently_flooded) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="flex items-center mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-sm font-semibold text-red-900">Active Flooding</span>
          </div>
          <div className="space-y-1">
            {floodZones
              .filter(zone => zone.is_currently_flooded)
              .slice(0, 3)
              .map(zone => (
                <div key={zone.id} className="flex items-center justify-between text-xs">
                  <span className="text-red-800">{zone.name}</span>
                  <span className="text-red-600">{zone.population_estimate} people</span>
                </div>
              ))}
            {floodZones.filter(zone => zone.is_currently_flooded).length > 3 && (
              <div className="text-xs text-red-600 font-medium">
                +{floodZones.filter(zone => zone.is_currently_flooded).length - 3} more zones
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Action Button */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Eye className="w-4 h-4 mr-2" />
          View Detailed Risk Map
        </button>
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-3 text-center">
        <div className="inline-flex items-center text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Risk data updates every 30 seconds
        </div>
      </div>
    </div>
  );
}