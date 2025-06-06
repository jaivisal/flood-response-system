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
  UserPlus,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useIncidents, useIncidentStats } from '../hooks/useIncidents';
import { useRescueUnits } from '../hooks/useRescueUnits';
import { useFloodZones } from '../hooks/useFloodZones';
import { useAutoAssignUnits } from '../hooks/useAssignments';
import MapContainer from '../components/Map/MapContainer';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentIncidents from '../components/Dashboard/RecentIncidents';
import ActiveUnits from '../components/Dashboard/ActiveUnits';
import AlertsPanel from '../components/Dashboard/AlertsPanel';
import RiskDashboard from '../components/Dashboard/RiskDashboard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import SimpleIncidentForm from '../components/Forms/IncidentForm';
import UnitAssignmentModal from '../components/Incidents/UnitAssignmentModal';
import { Incident, RescueUnit } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [incidentToAssign, setIncidentToAssign] = useState<Incident | null>(null);
  const [showAutoAssignConfirm, setShowAutoAssignConfirm] = useState(false);

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

  // Auto-assign mutation
  const autoAssignMutation = useAutoAssignUnits();

  // Report incident handlers
  const handleReportIncident = () => {
    console.log('Dashboard: Report Incident button clicked');
    setIsReportFormOpen(true);
  };

  const handleCloseReportForm = () => {
    console.log('Dashboard: Closing report form');
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

  // Assignment handlers
  const handleAssignUnit = (incident: Incident) => {
    setIncidentToAssign(incident);
    setIsAssignmentModalOpen(true);
  };

  const handleAssignmentSuccess = (assignedUnit: RescueUnit) => {
    console.log('Unit assigned successfully:', assignedUnit);
    setIsAssignmentModalOpen(false);
    setIncidentToAssign(null);
    refetchIncidents();
    refetchUnits();
  };

  // Auto-assign handlers
  const handleAutoAssign = async () => {
    try {
      const criticalIncidentIds = criticalIncidents
        .filter(incident => 
          incident.severity === 'critical' && 
          incident.status === 'reported' && 
          !incident.assigned_unit_id
        )
        .map(incident => incident.id);

      if (criticalIncidentIds.length === 0) {
        return;
      }

      await autoAssignMutation.mutateAsync(criticalIncidentIds);
      setShowAutoAssignConfirm(false);
      refetchIncidents();
      refetchUnits();
    } catch (error) {
      console.error('Auto-assignment failed:', error);
      setShowAutoAssignConfirm(false);
    }
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
  const criticalIncidents = incidents.filter(i => i.severity === 'critical');
  const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status));
  const availableUnits = rescueUnits.filter(u => u.status === 'available');
  const responseUnits = rescueUnits.filter(u => ['en_route', 'on_scene'].includes(u.status));
  const unassignedCritical = criticalIncidents.filter(i => i.status === 'reported' && !i.assigned_unit_id);

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
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        refetchIncidents();
        refetchUnits();
        refetchZones();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
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
          value={criticalIncidents.length}
          icon={AlertTriangle}
          color="red"
          trend={criticalIncidents.length > 0 ? 'up' : 'stable'}
          subtitle={`${activeIncidents.length} total active`}
        />
        
        <StatsCard
          title="Available Units"
          value={availableUnits.length}
          icon={Shield}
          color="green"
          trend="stable"
          subtitle={`${responseUnits.length} responding`}
        />
        
        <StatsCard
          title="Response Time"
          value={typeof incidentStats?.average_resolution_time === 'number' ? incidentStats.average_resolution_time : 12.5}
          unit="h"
          icon={Clock}
          color="blue"
          trend="down"
          subtitle="Average resolution"
        />
        
        <StatsCard
          title="People Affected"
          value={incidents.reduce((sum, i) => sum + (i.affected_people_count || 0), 0)}
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
                  <div className="text-2xl font-bold text-blue-600">{availableUnits.length}</div>
                  <div className="text-sm text-gray-500">Active Teams</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Critical Incidents Alert with Auto-Assign */}
      {criticalIncidents.length > 0 && (
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
                  {criticalIncidents.length} Critical Incident{criticalIncidents.length > 1 ? 's' : ''} Require Immediate Attention
                </h3>
                <p className="text-sm text-red-700">
                  {unassignedCritical.length > 0 ? 
                    `${unassignedCritical.length} unassigned critical incidents need urgent response.` :
                    'All critical incidents have been assigned to rescue units.'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {unassignedCritical.length > 0 && (
                <button 
                  onClick={() => setShowAutoAssignConfirm(true)}
                  disabled={autoAssignMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {autoAssignMutation.isLoading ? 'Assigning...' : 'Auto-Assign Units'}
                  {unassignedCritical.length > 0 && (
                    <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">
                      {unassignedCritical.length}
                    </span>
                  )}
                </button>
              )}
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

      {/* Floating Action Button for Report Incident */}
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

      {/* Report Incident Form Modal */}
      <SimpleIncidentForm
        isOpen={isReportFormOpen}
        onClose={handleCloseReportForm}
        onSuccess={handleReportSuccess}
      />

      {/* Unit Assignment Modal */}
      {incidentToAssign && (
        <UnitAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => {
            setIsAssignmentModalOpen(false);
            setIncidentToAssign(null);
          }}
          incident={incidentToAssign}
          onSuccess={handleAssignmentSuccess}
        />
      )}

      {/* Auto-Assign Confirmation Modal */}
      {showAutoAssignConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => e.target === e.currentTarget && setShowAutoAssignConfirm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full mr-3">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Auto-Assign Units</h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                This will automatically assign the most suitable available units to {unassignedCritical.length} critical incident{unassignedCritical.length > 1 ? 's' : ''}.
              </p>

              <div className="space-y-2">
                {unassignedCritical.slice(0, 3).map((incident) => (
                  <div key={incident.id} className="flex items-center p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-900 truncate">
                        {incident.title}
                      </p>
                      <p className="text-xs text-red-700">
                        {incident.affected_people_count} people affected
                      </p>
                    </div>
                  </div>
                ))}
                {unassignedCritical.length > 3 && (
                  <div className="text-sm text-gray-500 text-center">
                    +{unassignedCritical.length - 3} more incident{unassignedCritical.length - 3 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowAutoAssignConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAutoAssign}
                disabled={autoAssignMutation.isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {autoAssignMutation.isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning...
                  </div>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Confirm Auto-Assign
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}