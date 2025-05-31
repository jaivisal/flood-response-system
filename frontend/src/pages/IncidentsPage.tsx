import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Users,
  Activity,
  CheckCircle,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useIncidents, useIncidentStats } from '../hooks/useIncidents';
import { Incident, IncidentType, SeverityLevel, IncidentStatus } from '../types';
import MapContainer from '../components/Map/MapContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import StatsCard from '../components/Dashboard/StatsCard';

export default function IncidentsPage() {
  const { user } = useAuth();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | ''>('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<IncidentType | ''>('');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  // Fetch incidents
  const {
    data: incidents = [],
    isLoading,
    error,
    refetch,
  } = useIncidents({
    refetchInterval: 15000, // Refetch every 15 seconds for real-time updates
  });

  // Fetch incident statistics
  const { data: incidentStats, isLoading: statsLoading } = useIncidentStats();

  // Filter incidents based on search and filters
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesSearch = 
        incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.landmark?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity = !severityFilter || incident.severity === severityFilter;
      const matchesStatus = !statusFilter || incident.status === statusFilter;
      const matchesType = !typeFilter || incident.incident_type === typeFilter;
      const matchesCritical = !showCriticalOnly || incident.is_critical;

      return matchesSearch && matchesSeverity && matchesStatus && matchesType && matchesCritical;
    });
  }, [incidents, searchTerm, severityFilter, statusFilter, typeFilter, showCriticalOnly]);

  // Calculate statistics with safe fallbacks
  const stats = useMemo(() => {
    const totalIncidents = incidents?.length || 0;
    const criticalIncidents = incidents?.filter(i => i.severity === 'critical').length || 0;
    const activeIncidents = incidents?.filter(i => !['resolved', 'closed'].includes(i.status)).length || 0;
    const resolvedIncidents = incidents?.filter(i => ['resolved', 'closed'].includes(i.status)).length || 0;
    const unassignedIncidents = incidents?.filter(i => !i.assigned_unit_id && i.status === 'reported').length || 0;

    return {
      totalIncidents,
      criticalIncidents,
      activeIncidents,
      resolvedIncidents,
      unassignedIncidents,
    };
  }, [incidents]);

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    if (!filteredIncidents || filteredIncidents.length === 0) {
      return;
    }

    // Export incidents data as CSV
    const csvData = filteredIncidents.map(incident => ({
      'ID': incident.id,
      'Title': incident.title,
      'Type': incident.incident_type.replace('_', ' '),
      'Severity': incident.severity,
      'Status': incident.status.replace('_', ' '),
      'Affected People': incident.affected_people_count,
      'Water Level (m)': incident.water_level || '',
      'Address': incident.address || '',
      'Landmark': incident.landmark || '',
      'Reporter ID': incident.reporter_id,
      'Assigned Unit ID': incident.assigned_unit_id || '',
      'Created At': format(new Date(incident.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Updated At': incident.updated_at ? format(new Date(incident.updated_at), 'yyyy-MM-dd HH:mm:ss') : '',
      'Resolved At': incident.resolved_at ? format(new Date(incident.resolved_at), 'yyyy-MM-dd HH:mm:ss') : '',
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '📍';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <AlertTriangle className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Incidents</h3>
        <p className="text-gray-600 mb-4">Failed to load incident data. Please try again.</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const canManage = user?.role === 'command_center' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emergency Incidents</h1>
          <p className="mt-1 text-gray-500">
            Track and manage emergency incidents in real-time
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
            <Plus className="w-4 h-4 mr-2" />
            Report Incident
          </button>
        </div>
      </motion.div>

      {/* Statistics Cards - FIXED VERSION */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
      >
        <StatsCard
          title="Total Incidents"
          value={stats.totalIncidents}
          icon={AlertTriangle}
          color="blue"
          subtitle={`${filteredIncidents.length} shown`}
        />
        
        <StatsCard
          title="Critical"
          value={stats.criticalIncidents}
          icon={AlertTriangle}
          color="red"
          trend={stats.criticalIncidents > 0 ? 'up' : 'stable'}
        />
        
        <StatsCard
          title="Active"
          value={stats.activeIncidents}
          icon={Activity}
          color="orange"
          subtitle="In progress"
        />
        
        <StatsCard
          title="Unassigned"
          value={stats.unassignedIncidents}
          icon={Clock}
          color="yellow"
          subtitle="Need attention"
        />
        
        <StatsCard
          title="Resolved"
          value={stats.resolvedIncidents}
          icon={CheckCircle}
          color="green"
          subtitle="Completed"
        />
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center space-x-4">
            <div className="flex items-center">
              <Filter className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityLevel | '')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | '')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as IncidentType | '')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="flood">Flood</option>
              <option value="rescue_needed">Rescue Needed</option>
              <option value="infrastructure_damage">Infrastructure Damage</option>
              <option value="road_closure">Road Closure</option>
              <option value="power_outage">Power Outage</option>
              <option value="water_contamination">Water Contamination</option>
              <option value="evacuation_required">Evacuation Required</option>
              <option value="medical_emergency">Medical Emergency</option>
              <option value="other">Other</option>
            </select>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showCriticalOnly}
                onChange={(e) => setShowCriticalOnly(e.target.checked)}
                className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Critical only</span>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Incident Map</h2>
              <div className="text-sm text-gray-500">
                Showing {filteredIncidents.length} of {incidents.length} incidents
              </div>
            </div>
            
            <MapContainer
              incidents={filteredIncidents}
              onIncidentClick={handleIncidentClick}
              selectedIncident={selectedIncident}
              height="500px"
              showControls={true}
            />
          </div>
        </motion.div>

        {/* Incident List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Incidents ({filteredIncidents.length})
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredIncidents.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No incidents match your filters</p>
                </div>
              ) : (
                filteredIncidents.map((incident) => (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedIncident?.id === incident.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${incident.is_critical ? 'ring-2 ring-red-200' : ''}`}
                    onClick={() => handleIncidentClick(incident)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">{getSeverityIcon(incident.severity)}</span>
                          <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                            {incident.title}
                          </h4>
                          {incident.is_critical && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                              Critical
                            </span>
                          )}
                        </div>
                        
                        {incident.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {incident.description}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                            {incident.severity}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                            {incident.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>{format(new Date(incident.created_at), 'HH:mm')}</span>
                            </div>
                            
                            {incident.affected_people_count > 0 && (
                              <div className="flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                <span>{incident.affected_people_count}</span>
                              </div>
                            )}
                          </div>
                          
                          <span className="text-xs text-gray-400">
                            #{incident.id}
                          </span>
                        </div>
                        
                        {incident.address && (
                          <div className="mt-2 flex items-center text-xs text-gray-500">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{incident.address}</span>
                          </div>
                        )}
                      </div>
                      
                      {canManage && (
                        <div className="flex items-center space-x-1 ml-2">
                          <button className="p-1 text-gray-400 hover:text-blue-600 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-green-600 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          {incident.status === 'reported' && (
                            <button className="p-1 text-gray-400 hover:text-red-600 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Selected Incident Details */}
          {selectedIncident && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Incident Details
              </h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedIncident.title}</h4>
                  {selectedIncident.description && (
                    <p className="text-sm text-gray-600 mt-1">{selectedIncident.description}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span>
                    <span className="ml-1">{selectedIncident.incident_type.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="font-medium">Severity:</span>
                    <span className="ml-1">{selectedIncident.severity}</span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-1">{selectedIncident.status.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="font-medium">Affected:</span>
                    <span className="ml-1">{selectedIncident.affected_people_count} people</span>
                  </div>
                </div>
                
                {selectedIncident.water_level && (
                  <div className="text-sm">
                    <span className="font-medium">Water Level:</span>
                    <span className="ml-1">{selectedIncident.water_level}m</span>
                  </div>
                )}
                
                {selectedIncident.address && (
                  <div className="text-sm">
                    <span className="font-medium">Location:</span>
                    <span className="ml-1">{selectedIncident.address}</span>
                  </div>
                )}
                
                {selectedIncident.landmark && (
                  <div className="text-sm">
                    <span className="font-medium">Landmark:</span>
                    <span className="ml-1">{selectedIncident.landmark}</span>
                  </div>
                )}
                
                <div className="text-sm">
                  <span className="font-medium">Reported:</span>
                  <span className="ml-1">{format(new Date(selectedIncident.created_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
                
                {selectedIncident.updated_at && (
                  <div className="text-sm">
                    <span className="font-medium">Last Updated:</span>
                    <span className="ml-1">{format(new Date(selectedIncident.updated_at), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                )}
                
                {selectedIncident.assigned_unit_id && (
                  <div className="text-sm">
                    <span className="font-medium">Assigned Unit:</span>
                    <span className="ml-1">Unit #{selectedIncident.assigned_unit_id}</span>
                  </div>
                )}
                
                {canManage && (
                  <div className="pt-3 border-t border-gray-200 space-y-2">
                    {selectedIncident.status === 'reported' && !selectedIncident.assigned_unit_id && (
                      <button className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                        Assign Rescue Unit
                      </button>
                    )}
                    
                    {selectedIncident.status === 'assigned' && (
                      <button className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors">
                        Mark In Progress
                      </button>
                    )}
                    
                    {selectedIncident.status === 'in_progress' && (
                      <button className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors">
                        Mark Resolved
                      </button>
                    )}
                    
                    <button className="w-full px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors">
                      Edit Incident
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions for Critical Incidents */}
      {stats.criticalIncidents > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-red-50 border border-red-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  {stats.criticalIncidents} Critical Incident{stats.criticalIncidents > 1 ? 's' : ''} Require Immediate Attention
                </h3>
                <p className="text-sm text-red-700">
                  These incidents need urgent response and resource allocation.
                </p>
              </div>
            </div>
            
            {canManage && (
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors">
                  Auto-Assign Units
                </button>
                <button className="px-4 py-2 bg-white text-red-600 border border-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors">
                  View All Critical
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}