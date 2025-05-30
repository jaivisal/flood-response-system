import React from 'react';
import { Circle, Popup } from 'react-leaflet';
import { format } from 'date-fns';
import { MapPin, Users, AlertTriangle, Activity, Calendar } from 'lucide-react';
import { FloodZone } from '../../types';

interface FloodZoneLayerProps {
  zones: FloodZone[];
  onZoneClick?: (zone: FloodZone) => void;
}

// Get risk level color
const getRiskLevelColor = (riskLevel: string) => {
  const colors = {
    very_low: '#10b981',    // Green
    low: '#22c55e',         // Light Green
    medium: '#f59e0b',      // Yellow
    high: '#f97316',        // Orange
    very_high: '#dc2626',   // Red
    extreme: '#7c2d12'      // Dark Red
  };
  return colors[riskLevel as keyof typeof colors] || '#6b7280';
};

// Get risk level opacity
const getRiskLevelOpacity = (riskLevel: string) => {
  const opacities = {
    very_low: 0.2,
    low: 0.3,
    medium: 0.4,
    high: 0.6,
    very_high: 0.8,
    extreme: 0.9
  };
  return opacities[riskLevel as keyof typeof opacities] || 0.5;
};

// Get zone type icon
const getZoneTypeIcon = (zoneType: string) => {
  const icons = {
    residential: '🏘️',
    commercial: '🏢',
    industrial: '🏭',
    agricultural: '🌾',
    natural: '🌳',
    mixed: '🏙️'
  };
  return icons[zoneType as keyof typeof icons] || '📍';
};

// Get zone type display name
const getZoneTypeDisplayName = (zoneType: string) => {
  const names = {
    residential: 'Residential',
    commercial: 'Commercial',
    industrial: 'Industrial',
    agricultural: 'Agricultural',
    natural: 'Natural',
    mixed: 'Mixed Use'
  };
  return names[zoneType as keyof typeof names] || zoneType.replace('_', ' ');
};

// Get risk level display name
const getRiskLevelDisplayName = (riskLevel: string) => {
  const names = {
    very_low: 'Very Low',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    very_high: 'Very High',
    extreme: 'Extreme'
  };
  return names[riskLevel as keyof typeof names] || riskLevel.replace('_', ' ');
};

// Calculate approximate radius from area (for circle representation)
const getRadiusFromArea = (areaSqKm: number) => {
  // Convert area to radius in meters (approximate)
  // Area = π * r²  =>  r = √(Area / π)
  const radiusKm = Math.sqrt(areaSqKm / Math.PI);
  return radiusKm * 1000; // Convert to meters
};

export default function FloodZoneLayer({ zones, onZoneClick }: FloodZoneLayerProps) {
  const handleZoneClick = (zone: FloodZone) => {
    if (onZoneClick) {
      onZoneClick(zone);
    }
  };

  return (
    <>
      {zones.map((zone) => {
        // For this implementation, we'll use the center coordinates
        // In a real implementation, you'd have actual polygon coordinates
        const position: [number, number] = [9.9252, 78.1198]; // Default center
        const radius = zone.area_sqkm ? getRadiusFromArea(zone.area_sqkm) : 1000;
        const color = getRiskLevelColor(zone.risk_level);
        const opacity = getRiskLevelOpacity(zone.risk_level);

        return (
          <Circle
            key={zone.id}
            center={position}
            radius={radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: opacity,
              weight: zone.is_critical ? 3 : 2,
              opacity: 0.8,
              dashArray: zone.is_currently_flooded ? '10, 5' : undefined,
            }}
            eventHandlers={{
              click: () => handleZoneClick(zone),
            }}
          >
            <Popup className="custom-popup" maxWidth={350}>
              <div className="p-2">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{getZoneTypeIcon(zone.zone_type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                        {zone.name}
                      </h3>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Zone Code: {zone.zone_code}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {zone.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {zone.description}
                  </p>
                )}

                {/* Risk Level and Zone Type */}
                <div className="flex items-center space-x-2 mb-3">
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: color }}
                  >
                    <span className="w-1.5 h-1.5 bg-white rounded-full mr-1"></span>
                    {getRiskLevelDisplayName(zone.risk_level)} Risk
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {getZoneTypeDisplayName(zone.zone_type)}
                  </span>
                </div>

                {/* Zone Statistics */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  {/* Population */}
                  <div className="flex items-center text-gray-600">
                    <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{zone.population_estimate.toLocaleString()} people</span>
                  </div>

                  {/* Area */}
                  {zone.area_sqkm && (
                    <div className="text-gray-600">
                      <span className="font-medium">Area:</span>
                      <span className="ml-1">{zone.area_sqkm} km²</span>
                    </div>
                  )}

                  {/* Residential Units */}
                  {zone.residential_units > 0 && (
                    <div className="text-gray-600">
                      <span className="font-medium">Homes:</span>
                      <span className="ml-1">{zone.residential_units}</span>
                    </div>
                  )}

                  {/* Commercial Units */}
                  {zone.commercial_units > 0 && (
                    <div className="text-gray-600">
                      <span className="font-medium">Businesses:</span>
                      <span className="ml-1">{zone.commercial_units}</span>
                    </div>
                  )}
                </div>

                {/* Current Conditions */}
                <div className="space-y-2 mb-3">
                  {/* Current Water Level */}
                  {zone.current_water_level && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Current Water Level:</span>
                      <span className="ml-1">{zone.current_water_level}m</span>
                    </div>
                  )}

                  {/* Max Recorded Water Level */}
                  {zone.max_recorded_water_level && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Max Recorded:</span>
                      <span className="ml-1">{zone.max_recorded_water_level}m</span>
                    </div>
                  )}

                  {/* Priority Score */}
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Priority Score:</span>
                    <span className="ml-1">{zone.priority_score}/100</span>
                  </div>
                </div>

                {/* Administrative Information */}
                <div className="text-sm text-gray-600 space-y-1 mb-3">
                  {zone.district && (
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{zone.district}</span>
                      {zone.municipality && <span>, {zone.municipality}</span>}
                    </div>
                  )}

                  {zone.responsible_officer && (
                    <div>
                      <span className="font-medium">Officer:</span>
                      <span className="ml-1">{zone.responsible_officer}</span>
                    </div>
                  )}

                  {zone.emergency_contact && (
                    <div>
                      <span className="font-medium">Emergency:</span>
                      <span className="ml-1">{zone.emergency_contact}</span>
                    </div>
                  )}
                </div>

                {/* Status Alerts */}
                <div className="space-y-2">
                  {/* Currently Flooded */}
                  {zone.is_currently_flooded && (
                    <div className="flex items-center p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                      <Activity className="w-4 h-4 mr-2" />
                      <span className="font-medium">Currently experiencing flooding</span>
                    </div>
                  )}

                  {/* Evacuation Alerts */}
                  {zone.evacuation_mandatory && (
                    <div className="flex items-center p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      <span className="font-medium">MANDATORY EVACUATION ORDERED</span>
                    </div>
                  )}

                  {zone.evacuation_recommended && !zone.evacuation_mandatory && (
                    <div className="flex items-center p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      <span className="font-medium">Evacuation recommended</span>
                    </div>
                  )}

                  {/* Critical Zone Alert */}
                  {zone.is_critical && (
                    <div className="flex items-center p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      <span className="font-medium">Critical priority zone</span>
                    </div>
                  )}
                </div>

                {/* Last Assessment */}
                {zone.last_assessment && (
                  <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>
                        Last assessed: {format(new Date(zone.last_assessment), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleZoneClick(zone)}
                      className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      className="px-3 py-2 bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (zone.emergency_contact) {
                          window.open(`tel:${zone.emergency_contact}`);
                        }
                      }}
                    >
                      Emergency Contact
                    </button>
                  </div>
                </div>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}