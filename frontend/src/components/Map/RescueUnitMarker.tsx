import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { format } from 'date-fns';
import { Activity, Phone, Radio, Users, Fuel, MapPin, Clock } from 'lucide-react';

import { RescueUnit } from '../../types';

interface RescueUnitMarkerProps {
  unit: RescueUnit;
  onClick?: (unit: RescueUnit) => void;
  isSelected?: boolean;
}

// Create custom rescue unit icons based on type and status
const createRescueUnitIcon = (unit: RescueUnit, isSelected: boolean = false): DivIcon => {
  const statusColors = {
    available: '#22c55e',
    busy: '#f59e0b',
    en_route: '#3b82f6',
    on_scene: '#8b5cf6',
    offline: '#6b7280',
    maintenance: '#dc2626',
  };

  const typeIcons = {
    fire_rescue: '🚒',
    medical: '🚑',
    water_rescue: '🚤',
    evacuation: '🚐',
    search_rescue: '🚁',
    police: '🚓',
    emergency_services: '🚨',
    volunteer: '👥',
  };

  const color = statusColors[unit.status];
  const icon = typeIcons[unit.unit_type] || '🚨';
  const size = isSelected ? 50 : 40;
  const pulseClass = unit.status === 'en_route' || unit.status === 'on_scene' ? 'animate-pulse' : '';

  const iconHtml = `
    <div class="relative flex items-center justify-center">
      <!-- Background circle -->
      <div class="absolute w-${size === 50 ? 12 : 10} h-${size === 50 ? 12 : 10} rounded-full ${pulseClass}" 
           style="background-color: ${color}; opacity: 0.3;"></div>
      
      <!-- Main icon background -->
      <div class="relative w-${size === 50 ? 8 : 7} h-${size === 50 ? 8 : 7} rounded-full border-2 border-white shadow-lg flex items-center justify-center ${pulseClass}"
           style="background-color: ${color};">
        <span style="font-size: ${size === 50 ? '18px' : '16px'};">${icon}</span>
      </div>
      
      <!-- Selection indicator -->
      ${isSelected ? `
        <div class="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
      ` : ''}
      
      <!-- Status indicator -->
      <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white"
           style="background-color: ${color};"></div>
    </div>
  `;

  return new DivIcon({
    html: iconHtml,
    className: 'custom-rescue-unit-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Get status badge color
const getStatusBadgeColor = (status: string) => {
  const colors = {
    available: 'bg-green-100 text-green-800',
    busy: 'bg-yellow-100 text-yellow-800',
    en_route: 'bg-blue-100 text-blue-800',
    on_scene: 'bg-purple-100 text-purple-800',
    offline: 'bg-gray-100 text-gray-800',
    maintenance: 'bg-red-100 text-red-800',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

// Get unit type display name
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

export default function RescueUnitMarker({ unit, onClick, isSelected = false }: RescueUnitMarkerProps) {
  const position: [number, number] = [unit.latitude, unit.longitude];
  const icon = createRescueUnitIcon(unit, isSelected);

  const handleMarkerClick = () => {
    if (onClick) {
      onClick(unit);
    }
  };

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: handleMarkerClick,
      }}
    >
      <Popup className="custom-popup" maxWidth={320}>
        <div className="p-2">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center">
              <span className="text-2xl mr-2">{unit.type_icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                  {unit.unit_name}
                </h3>
                {unit.call_sign && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    Call Sign: {unit.call_sign}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status and Type */}
          <div className="flex items-center space-x-2 mb-3">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(unit.status)}`}>
              <span className="w-1.5 h-1.5 bg-current rounded-full mr-1"></span>
              {unit.status.replace('_', ' ')}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {getUnitTypeDisplayName(unit.unit_type)}
            </span>
          </div>

          {/* Unit Details */}
          <div className="space-y-2 text-sm">
            {/* Team Information */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center text-gray-600">
                <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Team: {unit.team_size}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <span className="font-medium">Capacity:</span>
                <span className="ml-1">{unit.capacity}</span>
              </div>
            </div>

            {/* Team Leader */}
            {unit.team_leader && (
              <div className="text-gray-600">
                <span className="font-medium">Leader:</span>
                <span className="ml-1">{unit.team_leader}</span>
              </div>
            )}

            {/* Location */}
            {unit.current_address && (
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{unit.current_address}</span>
              </div>
            )}

            {/* Contact Information */}
            {unit.contact_number && (
              <div className="flex items-center text-gray-600">
                <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{unit.contact_number}</span>
              </div>
            )}

            {/* Radio Frequency */}
            {unit.radio_frequency && (
              <div className="flex items-center text-gray-600">
                <Radio className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Radio: {unit.radio_frequency}</span>
              </div>
            )}

            {/* Fuel Level */}
            {unit.fuel_level !== null && unit.fuel_level !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-gray-600">
                  <div className="flex items-center">
                    <Fuel className="w-4 h-4 mr-2" />
                    <span>Fuel Level</span>
                  </div>
                  <span className="font-medium">{unit.fuel_level}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
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

            {/* Last Update */}
            <div className="flex items-center text-gray-500 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              <span>
                Last update: {format(new Date(unit.last_location_update), 'MMM d, HH:mm')}
              </span>
            </div>
          </div>

          {/* Availability Status */}
          <div className="mt-3 p-2 rounded-md">
            {unit.is_available ? (
              <div className="flex items-center text-green-700 bg-green-50">
                <Activity className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Available for deployment</span>
              </div>
            ) : (
              <div className="flex items-center text-gray-700 bg-gray-50">
                <Activity className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">
                  {unit.status === 'busy' ? 'Currently assigned' :
                   unit.status === 'en_route' ? 'En route to incident' :
                   unit.status === 'on_scene' ? 'On scene' :
                   unit.status === 'maintenance' ? 'Under maintenance' :
                   'Not available'}
                </span>
              </div>
            )}
          </div>

          {/* Maintenance Alert */}
          {unit.needs_maintenance && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ Maintenance required
            </div>
          )}

          {/* Critical Status Alert */}
          {!unit.is_active && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              🚨 Unit offline - immediate attention required
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleMarkerClick}
                className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                View Details
              </button>
              <button
                className="px-3 py-2 bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  if (unit.contact_number) {
                    window.open(`tel:${unit.contact_number}`);
                  }
                }}
              >
                Contact Unit
              </button>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}