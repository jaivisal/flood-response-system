import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Activity,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Radio,
  Users,
  Fuel,
  Clock,
  Shield,
  AlertTriangle,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useRescueUnits, useRescueUnitStats } from '../hooks/useRescueUnits';
import { RescueUnit, UnitType, UnitStatus } from '../types';
import MapContainer from '../components/Map/MapContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import StatsCard from '../components/Dashboard/StatsCard';

export default function RescueUnitsPage() {
  const { user } = useAuth();
  const [selectedUnit, setSelectedUnit] = useState<RescueUnit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<UnitType | ''>('');
  const [statusFilter, setStatusFilter] = useState<UnitStatus | ''>('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Fetch rescue units
  const {
    data: rescueUnits = [],
    isLoading,
    error,
    refetch,
  } = useRescueUnits({
    refetchInterval: 20000, // Refetch every 20 seconds for real-time updates
  });

  // Fetch rescue unit statistics
  const { data: unitStats } = useRescueUnitStats();

  // Filter units based on search and filters
  const filteredUnits = useMemo(() => {
    return rescueUnits.filter((unit) => {
      const matchesSearch = 
        unit.unit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.call_sign?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.team_leader?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.current_address?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = !typeFilter || unit.unit_type === typeFilter;
      const matchesStatus = !statusFilter || unit.status === statusFilter;
      const matchesAvailable = !showAvailableOnly || unit.is_available;

      return matchesSearch && matchesType && matchesStatus && matchesAvailable;
    });
  }, [rescueUnits, searchTerm, typeFilter, statusFilter, showAvailableOnly]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalUnits = rescueUnits.length;
    const availableUnits = rescueUnits.filter(u => u.status === 'available').length;
    const busyUnits = rescueUnits.filter(u => u.status === 'busy').length;
    const respondingUnits = rescueUnits.filter(u => ['en_route', 'on_scene'].includes(u.status)).length;
    const offlineUnits = rescueUnits.filter(u => u.status === 'offline').length;
    const maintenanceUnits = rescueUnits.filter(u => u.needs_maintenance).length;

    return {
      totalUnits,
      availableUnits,
      busyUnits,
      respondingUnits,
      offlineUnits,
      maintenanceUnits,
    };
  }, [rescueUnits]);

  const handleUnitClick = (unit: RescueUnit) => {
    setSelectedUnit(unit);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    // Export rescue units data as CSV
    const csvData = filteredUnits.map(unit => ({
      'ID': unit.id,
      'Unit Name': unit.unit_name,
      'Call Sign': unit.call_sign || '',
      'Type': unit.unit_type.replace('_', ' '),
      'Status': unit.status.replace('_', ' '),
      'Team Size': unit.team_size,
      'Capacity': unit.capacity,
      'Team Leader': unit.team_leader || '',
      'Contact': unit.contact_number || '',
      'Radio': unit.radio_frequency || '',
      'Location': unit.current_address || '',
      'Fuel Level': unit.fuel_level || '',
      'Available': unit.is_available ? 'Yes' : 'No',
      'Needs Maintenance': unit.needs_maintenance ? 'Yes' : 'No',
      'Last Update': format(new Date(unit.last_location_update), 'yyyy-MM-dd HH:mm:ss'),
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rescue_units_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'en_route':
        return 'bg-blue-100 text-blue-800';
      case 'on_scene':
        return 'bg-purple-100 text-purple-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUnitTypeIcon = (type: string) => {
    switch (type) {
      case 'fire_rescue':
        return '🚒';
      case 'medical':
        return '🚑';
      case 'water_rescue':
        return '🚤';
      case 'evacuation':
        return '🚐';
      case 'search_rescue':
        return '🚁';
      case 'police':
        return '🚓';
      case 'emergency_services':
        return '🚨';
      case 'volunteer':
        return '👥';
      default:
        return '🚨';
    }
  };

  const getUnitTypeDisplayName = (type: string) => {
    const names = {
      fire_rescue: 'Fire Rescue',
      medical: 'Medical',
      water_rescue: 'Water Rescue',
      evacuation: 'Evacuation',
      search_rescue: 'Search & Rescue',
      police: 'Police',
      emergency_services: 'Emergency Services',
      volunteer: 'Volunteer',
    };
    return names[type as keyof typeof names] || type.replace('_', ' ');
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Rescue Units</h3>
        <p className="text-gray-600 mb-4">Failed to load rescue unit data. Please try again.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Rescue Units</h1>
          <p className="mt-1 text-gray-500">
            Monitor and coordinate emergency response teams
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
              Add Unit
            </button>
          )}
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6"
      >
        <StatsCard
          title="Total Units"
          value={stats.totalUnits}
          icon={Activity}
          color="blue"
          subtitle={`${filteredUnits.length} shown`}
        />
        
        <StatsCard
          title="Available"
          value={stats.availableUnits}
          icon={Shield}
          color="green"
          subtitle="Ready for dispatch"
        />
        
        <StatsCard
          title="Responding"
          value={stats.respondingUnits}
          icon={Activity}
          color="blue"
          subtitle="En route / On scene"
        />
        
        <StatsCard
          title="Busy"
          value={stats.busyUnits}
          icon={Clock}
          color="yellow"
          subtitle="Currently assigned"
        />
        
        <StatsCard
          title="Offline"
          value={stats.offlineUnits}
          icon={AlertTriangle}
          color="gray"
          subtitle="Not operational"
        />
        
        <StatsCard
          title="Maintenance"
          value={stats.maintenanceUnits}
          icon={AlertTriangle}
          color="red"
          subtitle="Needs service"
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
                placeholder="Search units..."
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as UnitType | '')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="fire_rescue">Fire Rescue</option>
              <option value="medical">Medical</option>
              <option value="water_rescue">Water Rescue</option>
              <option value="evacuation">Evacuation</option>
              <option value="search_rescue">Search & Rescue</option>
              <option value="police">Police</option>
              <option value="emergency_services">Emergency Services</option>
              <option value="volunteer">Volunteer</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UnitStatus | '')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="en_route">En Route</option>
              <option value="on_scene">On Scene</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showAvailableOnly}
                onChange={(e) => setShowAvailableOnly(e.target.checked)}
                className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Available only</span>
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
              <h2 className="text-lg font-semibold text-gray-900">Unit Locations</h2>
              <div className="text-sm text-gray-500">
                Showing {filteredUnits.length} of {rescueUnits.length} units
              </div>
            </div>
            
            <MapContainer
              rescueUnits={filteredUnits}
              onRescueUnitClick={handleUnitClick}
              selectedRescueUnit={selectedUnit}
              height="500px"
              showControls={true}
            />
          </div>
        </motion.div>

        {/* Unit List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rescue Units ({filteredUnits.length})
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredUnits.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No units match your filters</p>
                </div>
              ) : (
                filteredUnits.map((unit) => (
                  <motion.div
                    key={unit.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedUnit?.id === unit.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${unit.needs_maintenance ? 'ring-2 ring-red-200' : ''}`}
                    onClick={() => handleUnitClick(unit)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">{getUnitTypeIcon(unit.unit_type)}</span>
                          <h4 className="font-medium text-gray-900 text-sm">
                            {unit.unit_name}
                          </h4>
                          {unit.call_sign && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {unit.call_sign}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(unit.status)}`}>
                            <span className="w-1.5 h-1.5 bg-current rounded-full mr-1"></span>
                            {unit.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getUnitTypeDisplayName(unit.unit_type)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                          <div className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            <span>Team: {unit.team_size}</span>
                          </div>
                          <div>
                            <span className="font-medium">Capacity:</span>
                            <span className="ml-1">{unit.capacity}</span>
                          </div>
                        </div>
                        
                        {unit.team_leader && (
                          <div className="text-xs text-gray-600 mb-2">
                            <span className="font-medium">Leader:</span>
                            <span className="ml-1">{unit.team_leader}</span>
                          </div>
                        )}
                        
                        {unit.current_address && (
                          <div className="flex items-center text-xs text-gray-500 mb-2">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{unit.current_address}</span>
                          </div>
                        )}
                        
                        {unit.fuel_level !== null && unit.fuel_level !== undefined && (
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center">
                              <Fuel className="w-3 h-3 mr-1" />
                              <span>Fuel: {unit.fuel_level}%</span>
                            </div>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  unit.fuel_level > 50 ? 'bg-green-500' :
                                  unit.fuel_level > 25 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${unit.fuel_level}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 text-xs text-gray-500">
                          Last update: {format(new Date(unit.last_location_update), 'HH:mm')}
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
                          {unit.status === 'offline' && (
                            <button className="p-1 text-gray-400 hover:text-red-600 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Alerts */}
                    {unit.needs_maintenance && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        ⚠️ Maintenance required
                      </div>
                    )}
                    
                    {!unit.is_active && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                        🚨 Unit offline
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Selected Unit Details */}
          {selectedUnit && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Unit Details
              </h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedUnit.unit_name}</h4>
                  <p className="text-sm text-gray-600">
                    {getUnitTypeDisplayName(selectedUnit.unit_type)} Unit
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-1">{selectedUnit.status.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="font-medium">Call Sign:</span>
                    <span className="ml-1">{selectedUnit.call_sign || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Team Size:</span>
                    <span className="ml-1">{selectedUnit.team_size}</span>
                  </div>
                  <div>
                    <span className="font-medium">Capacity:</span>
                    <span className="ml-1">{selectedUnit.capacity}</span>
                  </div>
                </div>
                
                {selectedUnit.team_leader && (
                  <div className="text-sm">
                    <span className="font-medium">Team Leader:</span>
                    <span className="ml-1">{selectedUnit.team_leader}</span>
                  </div>
                )}
                
                {selectedUnit.contact_number && (
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 mr-2" />
                    <span className="font-medium">Contact:</span>
                    <span className="ml-1">{selectedUnit.contact_number}</span>
                  </div>
                )}
                
                {selectedUnit.radio_frequency && (
                  <div className="flex items-center text-sm">
                    <Radio className="w-4 h-4 mr-2" />
                    <span className="font-medium">Radio:</span>
                    <span className="ml-1">{selectedUnit.radio_frequency}</span>
                  </div>
                )}
                
                {selectedUnit.current_address && (
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="font-medium">Location:</span>
                    <span className="ml-1">{selectedUnit.current_address}</span>
                  </div>
                )}
                
                <div className="text-sm">
                  <span className="font-medium">Last Update:</span>
                  <span className="ml-1">
                    {format(new Date(selectedUnit.last_location_update), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
                
                {canManage && (
                  <div className="pt-3 border-t border-gray-200 space-y-2">
                    {selectedUnit.status === 'available' && (
                      <button className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                        Assign to Incident
                      </button>
                    )}
                    
                    {selectedUnit.status === 'busy' && (
                      <button className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors">
                        Mark Available
                      </button>
                    )}
                    
                    <button className="w-full px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors">
                      Update Status
                    </button>
                    
                    <button className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors">
                      Update Location
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Maintenance Alerts */}
      {stats.maintenanceUnits > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900">
                  {stats.maintenanceUnits} Unit{stats.maintenanceUnits > 1 ? 's' : ''} Need{stats.maintenanceUnits === 1 ? 's' : ''} Maintenance
                </h3>
                <p className="text-sm text-yellow-700">
                  These units require maintenance attention to remain operational.
                </p>
              </div>
            </div>
            
            {canManage && (
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors">
                  Schedule Maintenance
                </button>
                <button className="px-4 py-2 bg-white text-yellow-600 border border-yellow-600 text-sm font-medium rounded-md hover:bg-yellow-50 transition-colors">
                  View All
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Offline Units Alert */}
      {stats.offlineUnits > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-red-50 border border-red-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  {stats.offlineUnits} Unit{stats.offlineUnits > 1 ? 's' : ''} Offline
                </h3>
                <p className="text-sm text-red-700">
                  These units are not operational and need immediate attention.
                </p>
              </div>
            </div>
            
            {canManage && (
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors">
                  Investigate
                </button>
                <button className="px-4 py-2 bg-white text-red-600 border border-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors">
                  View Offline Units
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}