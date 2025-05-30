import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Activity, MapPin, Phone, Radio, Fuel } from 'lucide-react';
import { RescueUnit } from '../../types';

interface ActiveUnitsProps {
  units: RescueUnit[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'busy':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'en_route':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'on_scene':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'offline':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'maintenance':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
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

export default function ActiveUnits({ units }: ActiveUnitsProps) {
  const activeUnits = units.filter(unit => unit.status !== 'offline');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-600" />
          Active Units
        </h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>{activeUnits.length} active</span>
          <span>•</span>
          <span>{units.filter(u => u.status === 'available').length} available</span>
        </div>
      </div>

      {activeUnits.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Activity className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">No active units</p>
          <p className="text-sm text-gray-400 mt-1">All units are offline</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activeUnits.map((unit, index) => (
            <motion.div
              key={unit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {/* Unit type icon */}
                  <div className="flex-shrink-0">
                    <span className="text-2xl">{getUnitTypeIcon(unit.unit_type)}</span>
                  </div>

                  {/* Unit details */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {unit.unit_name}
                      </h4>
                      {unit.call_sign && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {unit.call_sign}
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(unit.status)}`}>
                        <span className="w-1.5 h-1.5 bg-current rounded-full mr-1"></span>
                        {unit.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {unit.unit_type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Unit info */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      {/* Team info */}
                      <div className="flex items-center">
                        <span className="font-medium">Team:</span>
                        <span className="ml-1">{unit.team_size} members</span>
                      </div>
                      
                      {/* Capacity */}
                      <div className="flex items-center">
                        <span className="font-medium">Capacity:</span>
                        <span className="ml-1">{unit.capacity}</span>
                      </div>

                      {/* Location */}
                      {unit.current_address && (
                        <div className="flex items-center col-span-2">
                          <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{unit.current_address}</span>
                        </div>
                      )}

                      {/* Contact */}
                      {unit.contact_number && (
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span>{unit.contact_number}</span>
                        </div>
                      )}

                      {/* Radio */}
                      {unit.radio_frequency && (
                        <div className="flex items-center">
                          <Radio className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span>{unit.radio_frequency}</span>
                        </div>
                      )}
                    </div>

                    {/* Team leader */}
                    {unit.team_leader && (
                      <div className="mt-2 text-xs text-gray-600">
                        <span className="font-medium">Leader:</span>
                        <span className="ml-1">{unit.team_leader}</span>
                      </div>
                    )}

                    {/* Last update */}
                    <div className="mt-2 text-xs text-gray-500">
                      Last update: {format(new Date(unit.last_location_update), 'HH:mm')}
                    </div>
                  </div>
                </div>

                {/* Fuel level indicator */}
                {unit.fuel_level && (
                  <div className="flex-shrink-0 ml-3">
                    <div className="flex items-center text-xs text-gray-600">
                      <Fuel className="w-3 h-3 mr-1" />
                      <span>{unit.fuel_level}%</span>
                    </div>
                    <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
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
              </div>

              {/* Maintenance warning */}
              {unit.needs_maintenance && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⚠️ Maintenance required
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-600">
              {units.filter(u => u.status === 'available').length}
            </div>
            <div className="text-xs text-gray-500">Available</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">
              {units.filter(u => ['en_route', 'on_scene'].includes(u.status)).length}
            </div>
            <div className="text-xs text-gray-500">Responding</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">
              {units.filter(u => u.status === 'busy').length}
            </div>
            <div className="text-xs text-gray-500">Busy</div>
          </div>
        </div>
      </div>
    </div>
  );
}