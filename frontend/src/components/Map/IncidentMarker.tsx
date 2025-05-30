import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import { format } from 'date-fns';
import { AlertTriangle, Users, Droplets, MapPin, Clock } from 'lucide-react';

import { Incident } from '../../types';

interface IncidentMarkerProps {
  incident: Incident;
  onClick?: (incident: Incident) => void;
  isSelected?: boolean;
}

// Create custom incident icons based on severity
const createIncidentIcon = (incident: Incident, isSelected: boolean = false): DivIcon => {
  const severityColors = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#dc2626',
  };

  const color = severityColors[incident.severity];
  const size = isSelected ? 40 : 30;
  const pulseClass = incident.severity === 'critical' ? 'animate-pulse' : '';

  const iconHtml = `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-${size === 40 ? 10 : 8} h-${size === 40 ? 10 : 8} rounded-full ${pulseClass}" 
           style="background-color: ${color}; opacity: 0.3;"></div>
      <div class="relative w-${size === 40 ? 6 : 5} h-${size === 40 ? 6 : 5} rounded-full border-2 border-white shadow-lg ${pulseClass}"
           style="background-color: ${color};"></div>
      ${isSelected ? `
        <div class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
      ` : ''}
    </div>
  `;

  return new DivIcon({
    html: iconHtml,
    className: 'custom-incident-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Get incident type icon
const getIncidentTypeIcon = (type: string) => {
  const icons = {
    flood: '🌊',
    rescue_needed: '🆘',
    infrastructure_damage: '🏗️',
    road_closure: '🚧',
    power_outage: '⚡',
    water_contamination: '💧',
    evacuation_required: '🚨',
    medical_emergency: '🏥',
    other: '❗',
  };
  return icons[type as keyof typeof icons] || '❗';
};

// Get status badge color
const getStatusBadgeColor = (status: string) => {
  const colors = {
    reported: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-orange-100 text-orange-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export default function IncidentMarker({ incident, onClick, isSelected = false }: IncidentMarkerProps) {
  const position: [number, number] = [incident.latitude, incident.longitude];
  const icon = createIncidentIcon(incident, isSelected);

  const handleMarkerClick = () => {
    if (onClick) {
      onClick(incident);
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
              <span className="text-2xl mr-2">{getIncidentTypeIcon(incident.incident_type)}</span>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                  {incident.title}
                </h3>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(incident.status)}`}>
                    {incident.status.replace('_', ' ')}
                  </span>
                  <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${incident.severity === 'critical' ? 'red' : incident.severity === 'high' ? 'orange' : incident.severity === 'medium' ? 'yellow' : 'green'}-100 text-${incident.severity === 'critical' ? 'red' : incident.severity === 'high' ? 'orange' : incident.severity === 'medium' ? 'yellow' : 'green'}-800`}>
                    {incident.severity}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {incident.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {incident.description}
            </p>
          )}

          {/* Details */}
          <div className="space-y-2 text-sm">
            {/* Location */}
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">
                {incident.address || incident.landmark || `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`}
              </span>
            </div>

            {/* Affected people */}
            {incident.affected_people_count > 0 && (
              <div className="flex items-center text-gray-600">
                <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{incident.affected_people_count} people affected</span>
              </div>
            )}

            {/* Water level */}
            {incident.water_level && (
              <div className="flex items-center text-gray-600">
                <Droplets className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Water level: {incident.water_level}m</span>
              </div>
            )}

            {/* Time */}
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>
                Reported {format(new Date(incident.created_at), 'MMM d, HH:mm')}
              </span>
            </div>
          </div>

          {/* Image */}
          {incident.image_url && (
            <div className="mt-3">
              <img
                src={incident.image_url}
                alt="Incident"
                className="w-full h-32 object-cover rounded-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Critical alert */}
          {incident.is_critical && (
            <div className="mt-3 flex items-center p-2 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-800">
                Critical incident requiring immediate attention
              </span>
            </div>
          )}

          {/* Action button */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={handleMarkerClick}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}