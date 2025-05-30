import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Icon, LatLngBounds, LatLng } from 'leaflet';
import { motion } from 'framer-motion';
import { MapPin, Zap, AlertTriangle, Activity } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Import marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { Incident, RescueUnit, FloodZone, MapCenter } from '../../types';
import IncidentMarker from './IncidentMarker';
import RescueUnitMarker from './RescueUnitMarker';
import FloodZoneLayer from './FloodZoneLayer';

// Fix Leaflet default markers
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapContainerProps {
  incidents?: Incident[];
  rescueUnits?: RescueUnit[];
  floodZones?: FloodZone[];
  center?: MapCenter;
  onMapClick?: (lat: number, lng: number) => void;
  onIncidentClick?: (incident: Incident) => void;
  onRescueUnitClick?: (unit: RescueUnit) => void;
  onFloodZoneClick?: (zone: FloodZone) => void;
  selectedIncident?: Incident | null;
  selectedRescueUnit?: RescueUnit | null;
  selectedFloodZone?: FloodZone | null;
  height?: string;
  className?: string;
  showControls?: boolean;
}

// Default center (Madurai, Tamil Nadu)
const DEFAULT_CENTER: MapCenter = {
  lat: 9.9252,
  lng: 78.1198,
  zoom: 12,
};

// Map event handler component
function MapEventHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Auto-fit bounds component
function AutoFitBounds({ incidents, rescueUnits }: { incidents?: Incident[]; rescueUnits?: RescueUnit[] }) {
  const map = useMap();

  useEffect(() => {
    const points: LatLng[] = [];

    // Add incident points
    incidents?.forEach((incident) => {
      if (incident.latitude && incident.longitude) {
        points.push(new LatLng(incident.latitude, incident.longitude));
      }
    });

    // Add rescue unit points
    rescueUnits?.forEach((unit) => {
      if (unit.latitude && unit.longitude) {
        points.push(new LatLng(unit.latitude, unit.longitude));
      }
    });

    // Fit bounds if we have points
    if (points.length > 0) {
      const bounds = new LatLngBounds(points);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, incidents, rescueUnits]);

  return null;
}

// Map controls component
function MapControls({ 
  onToggleIncidents, 
  onToggleRescueUnits, 
  onToggleFloodZones,
  showIncidents,
  showRescueUnits,
  showFloodZones 
}: {
  onToggleIncidents?: () => void;
  onToggleRescueUnits?: () => void;
  onToggleFloodZones?: () => void;
  showIncidents?: boolean;
  showRescueUnits?: boolean;
  showFloodZones?: boolean;
}) {
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2 space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 px-2">Map Layers</h3>
      
      <button
        onClick={onToggleIncidents}
        className={`flex items-center w-full px-3 py-2 text-sm rounded transition-colors ${
          showIncidents
            ? 'bg-red-100 text-red-800 border border-red-200'
            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
        }`}
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Incidents
      </button>

      <button
        onClick={onToggleRescueUnits}
        className={`flex items-center w-full px-3 py-2 text-sm rounded transition-colors ${
          showRescueUnits
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Activity className="w-4 h-4 mr-2" />
        Rescue Units
      </button>

      <button
        onClick={onToggleFloodZones}
        className={`flex items-center w-full px-3 py-2 text-sm rounded transition-colors ${
          showFloodZones
            ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Zap className="w-4 h-4 mr-2" />
        Flood Zones
      </button>
    </div>
  );
}

export default function EmergencyMapContainer({
  incidents = [],
  rescueUnits = [],
  floodZones = [],
  center = DEFAULT_CENTER,
  onMapClick,
  onIncidentClick,
  onRescueUnitClick,
  onFloodZoneClick,
  selectedIncident,
  selectedRescueUnit,
  selectedFloodZone,
  height = '500px',
  className = '',
  showControls = true,
}: MapContainerProps) {
  const [showIncidents, setShowIncidents] = useState(true);
  const [showRescueUnits, setShowRescueUnits] = useState(true);
  const [showFloodZones, setShowFloodZones] = useState(true);
  const mapRef = useRef<any>(null);

  // Auto-fit bounds when data changes
  const shouldAutoFit = incidents.length > 0 || rescueUnits.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative ${className}`}
      style={{ height }}
    >
      <MapContainer
        ref={mapRef}
        center={[center.lat, center.lng]}
        zoom={center.zoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg shadow-lg"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* Base tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Map event handlers */}
        <MapEventHandler onMapClick={onMapClick} />

        {/* Auto-fit bounds */}
        {shouldAutoFit && (
          <AutoFitBounds incidents={incidents} rescueUnits={rescueUnits} />
        )}

        {/* Flood zones layer */}
        {showFloodZones && floodZones.length > 0 && (
          <FloodZoneLayer zones={floodZones} onZoneClick={onFloodZoneClick} />
        )}

        {/* Incident markers */}
        {showIncidents &&
          incidents.map((incident) => (
            <IncidentMarker
              key={incident.id}
              incident={incident}
              onClick={onIncidentClick}
              isSelected={selectedIncident?.id === incident.id}
            />
          ))}

        {/* Rescue unit markers */}
        {showRescueUnits &&
          rescueUnits.map((unit) => (
            <RescueUnitMarker
              key={unit.id}
              unit={unit}
              onClick={onRescueUnitClick}
              isSelected={selectedRescueUnit?.id === unit.id}
            />
          ))}
      </MapContainer>

      {/* Map controls */}
      {showControls && (
        <MapControls
          onToggleIncidents={() => setShowIncidents(!showIncidents)}
          onToggleRescueUnits={() => setShowRescueUnits(!showRescueUnits)}
          onToggleFloodZones={() => setShowFloodZones(!showFloodZones)}
          showIncidents={showIncidents}
          showRescueUnits={showRescueUnits}
          showFloodZones={showFloodZones}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 max-w-xs">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>Critical Incidents</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <span>High Priority</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Available Units</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
            <span>Busy Units</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}