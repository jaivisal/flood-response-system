import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Activity,
  Users,
  Clock,
  TrendingUp,
  MapPin,
  Zap,
  Shield,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useIncidents, useIncidentStats } from '../hooks/useIncidents';
import { useRescueUnits } from '../hooks/useRescueUnits';
import { useFloodZones } from '../hooks/useFloodZones';
import MapContainer from '../components/Map/MapContainer';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentIncidents from '../components/Dashboard/RecentIncidents';
import ActiveUnits from '../components/Dashboard/ActiveUnits';
import AlertsPanel from '../components/Dashboard/AlertsPanel';
import RiskDashboard from '../components/Dashboard/RiskDashboard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import SimpleIncidentForm from '../components/Forms/IncidentForm';

export default function DashboardPage() {
  const { user } = useAuth();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);

  // Fetch data with auto-refresh
  const {
    data: incidents = [],
    isLoading: incidentsLoading,
    refetch: refetchIncidents,
  } = useIncidents({
    refetchInterval: refreshInterval,
  });

  const {
    data: rescueUnits = [],
    isLoading: unitsLoading,
    refetch: refetchUnits,
  } = useRescueUnits({
    refetchInterval: refreshInterval,
  });

  const {
    data: floodZones = [],
    isLoading: zonesLoading,
    refetch: refetchZones,
  } = useFloodZones({
    refetchInterval: refreshInterval,
  });

  // Fetch incident statistics
  const {
    data: incidentStats,
    isLoading: statsLoading,
    error: statsError,
  } = useIncidentStats();

  // FIXED: Report incident handlers
  const handleReportIncident = () => {
    console.log('Dashboard: Report Incident button clicked'); // Debug log
    setIsReportFormOpen(true);
  };

  const handleCloseReportForm = () => {
    console.log('Dashboard: Closing report form'); // Debug log
    setIsReportFormOpen(false);
  };

  const handleReportSuccess = (incident: any) => {
    console.log('Dashboard: Incident created successfully:', incident);
    setIsReportFormOpen(false);
    // Refresh all data
    refetchIncidents();
    refetchUnits();
    refetchZones();
  };

  // Debug logging
  useEffect(() => {
    if (statsError) {
      console.error('Stats loading error:', statsError);
    }
    if (incidentStats) {
      console.log('Stats loaded successfully:', incidentStats);
    }
  }, [incidentStats, statsError]);

  // Calculate dashboard metrics
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
  const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length;
  const availableUnits = rescueUnits.filter(u => u.status === 'available').length;
  const responseUnits = rescueUnits.filter(u => ['en_route', 'on_scene'].includes(u.status)).length;

  // Recent incidents (last 24 hours)
  const recentIncidents = incidents
    .filter(i => {
      const incidentDate = new Date(i.created_at);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return incidentDate > dayAgo;
    })
    .slice(0, 5);

  // Auto-refresh controls
  useEffect(() => {
    const interval = setInterval(() => {
      refetchIncidents();
      refetchUnits();
      refetchZones();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetchIncidents, refetchUnits, refetchZones]);

  if (incidentsLoading || unitsLoading || zonesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Emergency Response Dashboard
          </h1>
          <p className="mt-1 text-gray-500">
            Welcome back, {user?.full_name} • {user?.role.replace('_', ' ')}
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div className="flex items-center text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live Updates
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-md px-3 py-1"
          >
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={0}>Manual</option>
          </select>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatsCard
          title="Critical Incidents"
          value={criticalIncidents}
          icon={AlertTriangle}
          color="red"
          trend={criticalIncidents > 0 ? 'up' : 'stable'}
          subtitle={`${activeIncidents} total active`}
        />
        
        <StatsCard
          title="Available Units"
          value={availableUnits}
          icon={Shield}
          color="green"
          trend="stable"
          subtitle={`${responseUnits} responding`}
        />
        
        <StatsCard
          title="Response Time"
          value={incidentStats?.average_resolution_time || "12.5"}
          unit="h"
          icon={Clock}
          color="blue"
          trend="down"
          subtitle="Average resolution"
        />
        
        <StatsCard
          title="People Affected"
          value={incidents.reduce((sum, i) => sum + i.affected_people_count, 0)}
          icon={Users}
          color="orange"
          trend="up"
          subtitle="Last 24 hours"
        />
      </motion.div>

      {/* Stats Loading Error Display */}
      {statsError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800 text-sm">
              Unable to load detailed statistics. Using fallback data.
            </span>
          </div>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Section - Takes 2 columns */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Live Situation Map
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{incidents.length} incidents</span>
                <span>•</span>
                <span>{rescueUnits.length} units</span>
                <span>•</span>
                <span>{floodZones.length} zones</span>
              </div>
            </div>
            
            <MapContainer
              incidents={incidents}
              rescueUnits={rescueUnits}
              floodZones={floodZones}
              height="400px"
              showControls={true}
            />
          </div>
        </motion.div>

        {/* Risk Dashboard - Takes 1 column */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-1"
        >
          <RiskDashboard />
        </motion.div>

        {/* Alerts Panel - Takes 1 column */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <AlertsPanel incidents={incidents} />
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Units */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ActiveUnits units={rescueUnits.slice(0, 8)} />
        </motion.div>

        {/* Recent Incidents and Performance Metrics */}
        <div className="space-y-6">
          {/* Recent Incidents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <RecentIncidents incidents={recentIncidents} />
          </motion.div>

          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Performance Metrics
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Resolution Rate</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                  <span className="text-sm font-medium">78%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Unit Utilization</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <span className="text-sm font-medium">65%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Response Coverage</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                  <span className="text-sm font-medium">92%</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {incidentStats?.resolved_incidents || 156}
                  </div>
                  <div className="text-sm text-gray-500">Resolved Today</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{availableUnits}</div>
                  <div className="text-sm text-gray-500">Active Teams</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Critical Incidents Alert */}
      {criticalIncidents > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-red-50 border border-red-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mr-3 animate-pulse" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  {criticalIncidents} Critical Incident{criticalIncidents > 1 ? 's' : ''} Require Immediate Attention
                </h3>
                <p className="text-sm text-red-700">
                  These incidents need urgent response and resource allocation.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors">
                Auto-Assign Units
              </button>
              <button className="px-4 py-2 bg-white text-red-600 border border-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors">
                View All Critical
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* System Health Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-green-50 border border-green-200 rounded-lg p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <span className="text-sm font-medium text-green-900">
              All systems operational
            </span>
          </div>
          <div className="text-xs text-green-700">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </motion.div>

      {/* FIXED: Floating Action Button for Report Incident */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
        onClick={handleReportIncident}
        type="button"
        className="fixed bottom-6 right-6 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40"
        title="Report Emergency Incident"
      >
        <AlertTriangle className="w-6 h-6" />
      </motion.button>

      {/* FIXED: Simple Report Incident Form Modal */}
      <SimpleIncidentForm
        isOpen={isReportFormOpen}
        onClose={handleCloseReportForm}
        onSuccess={handleReportSuccess}
      />
    </div>
  );
}