import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import {
  MapPin,
  AlertTriangle,
  Users,
  Activity,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { FloodZone, RiskLevel, ZoneType } from '../types';
import MapContainer from '../components/Map/MapContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import StatsCard from '../components/Dashboard/StatsCard';

export default function FloodZonesPage() {
  const { user } = useAuth();
  const [selectedZone, setSelectedZone] = useState<FloodZone | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | ''>('');
  const [zoneTypeFilter, setZoneTypeFilter] = useState<ZoneType | ''>('');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  // Fetch flood zones
  const {
    data: floodZones = [],
    isLoading,
    error,
    refetch,
  } = useQuery<FloodZone[]>(
    'flood-zones',
    () => apiService.get('/floodzones/'),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch flood zone statistics
  const { data: zoneStats } = useQuery(
    'flood-zone-stats',
    () => apiService.get('/floodzones/stats/overview'),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  // Filter zones based on search and filters
  const filteredZones = useMemo(() => {
    return floodZones.filter((zone) => {
      const matchesSearch = 
        zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.zone_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.municipality?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRisk = !riskFilter || zone.risk_level === riskFilter;
      const matchesType = !zoneTypeFilter || zone.zone_type === zoneTypeFilter;
      const matchesCritical = !showCriticalOnly || zone.is_critical;

      return matchesSearch && matchesRisk && matchesType && matchesCritical;
    });
  }, [floodZones, searchTerm, riskFilter, zoneTypeFilter, showCriticalOnly]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalZones = floodZones.length;
    const criticalZones = floodZones.filter(z => z.is_critical).length;
    const floodedZones = floodZones.filter(z => z.is_currently_flooded).length;
    const evacuationZones = floodZones.filter(z => z.evacuation_mandatory || z.evacuation_recommended).length;
    const totalPopulation = floodZones.reduce((sum, z) => sum + z.population_estimate, 0);

    return {
      totalZones,
      criticalZones,
      floodedZones,
      evacuationZones,
      totalPopulation,
    };
  }, [floodZones]);

  const handleZoneClick = (zone: FloodZone) => {
    setSelectedZone(zone);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    // Export flood zones data as CSV
    const csvData = filteredZones.map(zone => ({
      'Zone Code': zone.zone_code,
      'Name': zone.name,
      'Risk Level': zone.risk_level,
      'Zone Type': zone.zone_type,
      'Population': zone.population_estimate,
      'Area (km²)': zone.area_sqkm || 0,
      'Currently Flooded': zone.is_currently_flooded ? 'Yes' : 'No',
      'Evacuation Status': zone.evacuation_mandatory ? 'Mandatory' : zone.evacuation_recommended ? 'Recommended' : 'None',
      'Priority Score': zone.priority_score,
      'District': zone.district || '',
      'Municipality': zone.municipality || '',
      'Responsible Officer': zone.responsible_officer || '',
      'Emergency Contact': zone.emergency_contact || '',
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flood_zones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Flood Zones</h3>
        <p className="text-gray-600 mb-4">Failed to load flood zone data. Please try again.</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const canManage = user?.role === 'district_officer' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Flood Risk Zones</h1>
          <p className="mt-1 text-gray-500">
            Monitor and manage flood risk assessment zones
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
          
          {canManage && (
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Plus className="w-4 h-4 mr-2" />
              Add Zone
            </button>
          )}
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
      >
        <StatsCard
          title="Total Zones"
          value={stats.totalZones}
          icon={MapPin}
          color="blue"
          subtitle={`${filteredZones.length} shown`}
        />
        
        <StatsCard
          title="Critical Zones"
          value={stats.criticalZones}
          icon={AlertTriangle}
          color="red"
          trend={stats.criticalZones > 0 ? 'up' : 'stable'}
        />
        
        <StatsCard
          title="Currently Flooded"
          value={stats.floodedZones}
          icon={Activity}
          color="orange"
          trend={stats.floodedZones > 0 ? 'up' : 'down'}
        />
        
        <StatsCard
          title="Evacuation Areas"
          value={stats.evacuationZones}
          icon={Users}
          color="purple"
          subtitle="Mandatory + recommended"
        />
        
        <StatsCard
          title="Total Population"
          value={Math.round(stats.totalPopulation / 1000)}
          unit="K"
          icon={Users}
          color="green"
          subtitle="In all zones"
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
                placeholder="Search zones..."
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
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskLevel | '')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Risk Levels</option>
              <option value="very_low">Very Low</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="very_high">Very High</option>
              <option value="extreme">Extreme</option>
            </select>

            <select
              value={zoneTypeFilter}
              onChange={(e) => setZoneTypeFilter(e.target.value as ZoneType | '')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Zone Types</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="agricultural">Agricultural</option>
              <option value="natural">Natural</option>
              <option value="mixed">Mixed Use</option>
            </select>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showCriticalOnly}
                onChange={(e) => setShowCriticalOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
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
              <h2 className="text-lg font-semibold text-gray-900">Flood Risk Map</h2>
              <div className="text-sm text-gray-500">
                Showing {filteredZones.length} of {floodZones.length} zones
              </div>
            </div>
            
            <MapContainer
              floodZones={filteredZones}
              onFloodZoneClick={handleZoneClick}
              selectedFloodZone={selectedZone}
              height="500px"
              showControls={true}
            />
          </div>
        </motion.div>

        {/* Zone List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Flood Zones ({filteredZones.length})
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredZones.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No zones match your filters</p>
                </div>
              ) : (
                filteredZones.map((zone) => (
                  <motion.div
                    key={zone.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedZone?.id === zone.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleZoneClick(zone)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {zone.name}
                          </h4>
                          {zone.is_critical && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Critical
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 mb-2">
                          Code: {zone.zone_code}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${
                            zone.risk_level === 'extreme' ? 'bg-red-100 text-red-800' :
                            zone.risk_level === 'very_high' ? 'bg-red-100 text-red-800' :
                            zone.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                            zone.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {zone.risk_level.replace('_', ' ')} risk
                          </span>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center text-xs text-gray-600">
                            <Users className="w-3 h-3 mr-1" />
                            <span>{zone.population_estimate.toLocaleString()}</span>
                          </div>
                          
                          {zone.is_currently_flooded && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Flooded
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {canManage && (
                        <div className="flex items-center space-x-1 ml-2">
                          <button className="p-1 text-gray-400 hover:text-blue-600 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-green-600 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-red-600 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Selected Zone Details */}
          {selectedZone && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Zone Details
              </h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedZone.name}</h4>
                  <p className="text-sm text-gray-600">{selectedZone.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Risk Level:</span>
                    <span className="ml-1">{selectedZone.risk_level.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>
                    <span className="ml-1">{selectedZone.zone_type.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="font-medium">Population:</span>
                    <span className="ml-1">{selectedZone.population_estimate.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium">Area:</span>
                    <span className="ml-1">{selectedZone.area_sqkm || 'N/A'} km²</span>
                  </div>
                </div>
                
                {selectedZone.responsible_officer && (
                  <div className="text-sm">
                    <span className="font-medium">Responsible Officer:</span>
                    <span className="ml-1">{selectedZone.responsible_officer}</span>
                  </div>
                )}
                
                {selectedZone.emergency_contact && (
                  <div className="text-sm">
                    <span className="font-medium">Emergency Contact:</span>
                    <span className="ml-1">{selectedZone.emergency_contact}</span>
                  </div>
                )}
                
                {canManage && (
                  <div className="pt-3 border-t border-gray-200">
                    <button className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                      Manage Zone
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}