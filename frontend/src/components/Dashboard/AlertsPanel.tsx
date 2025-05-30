import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { AlertTriangle, Clock, MapPin, Users, Zap, Activity } from 'lucide-react';
import { Incident } from '../../types';

interface AlertsPanelProps {
  incidents: Incident[];
}

interface Alert {
  id: string;
  type: 'critical' | 'high' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  location?: string;
  actionRequired?: boolean;
  relatedIncident?: Incident;
}

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'critical':
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    case 'high':
      return <Zap className="w-5 h-5 text-orange-600" />;
    case 'warning':
      return <Activity className="w-5 h-5 text-yellow-600" />;
    case 'info':
      return <Users className="w-5 h-5 text-blue-600" />;
    default:
      return <AlertTriangle className="w-5 h-5 text-gray-600" />;
  }
};

const getAlertColor = (type: string) => {
  switch (type) {
    case 'critical':
      return 'bg-red-50 border-red-200 text-red-800';
    case 'high':
      return 'bg-orange-50 border-orange-200 text-orange-800';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

const generateAlertsFromIncidents = (incidents: Incident[]): Alert[] => {
  const alerts: Alert[] = [];
  
  // Critical incidents
  incidents
    .filter(incident => incident.severity === 'critical')
    .forEach(incident => {
      alerts.push({
        id: `critical-${incident.id}`,
        type: 'critical',
        title: 'Critical Emergency',
        message: incident.title,
        timestamp: new Date(incident.created_at),
        location: incident.address || incident.landmark,
        actionRequired: true,
        relatedIncident: incident,
      });
    });

  // High priority unassigned incidents
  incidents
    .filter(incident => 
      incident.severity === 'high' && 
      incident.status === 'reported' &&
      !incident.assigned_unit_id
    )
    .forEach(incident => {
      alerts.push({
        id: `unassigned-${incident.id}`,
        type: 'high',
        title: 'High Priority Incident Unassigned',
        message: `${incident.title} requires immediate attention`,
        timestamp: new Date(incident.created_at),
        location: incident.address || incident.landmark,
        actionRequired: true,
        relatedIncident: incident,
      });
    });

  // Mass casualty events
  incidents
    .filter(incident => incident.affected_people_count > 10)
    .forEach(incident => {
      alerts.push({
        id: `mass-casualty-${incident.id}`,
        type: 'warning',
        title: 'Mass Casualty Event',
        message: `${incident.affected_people_count} people affected in ${incident.incident_type.replace('_', ' ')}`,
        timestamp: new Date(incident.created_at),
        location: incident.address || incident.landmark,
        actionRequired: false,
        relatedIncident: incident,
      });
    });

  // Recent incidents (last 30 minutes)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  incidents
    .filter(incident => new Date(incident.created_at) > thirtyMinutesAgo)
    .slice(0, 3) // Limit to prevent spam
    .forEach(incident => {
      if (!alerts.some(alert => alert.relatedIncident?.id === incident.id)) {
        alerts.push({
          id: `recent-${incident.id}`,
          type: 'info',
          title: 'New Incident Reported',
          message: incident.title,
          timestamp: new Date(incident.created_at),
          location: incident.address || incident.landmark,
          actionRequired: false,
          relatedIncident: incident,
        });
      }
    });

  // Sort by timestamp (newest first) and type priority
  return alerts.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, warning: 2, info: 3 };
    const aPriority = priorityOrder[a.type as keyof typeof priorityOrder];
    const bPriority = priorityOrder[b.type as keyof typeof priorityOrder];
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    return b.timestamp.getTime() - a.timestamp.getTime();
  }).slice(0, 8); // Limit to 8 alerts
};

export default function AlertsPanel({ incidents }: AlertsPanelProps) {
  const alerts = generateAlertsFromIncidents(incidents);

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-green-600" />
          Active Alerts
        </h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-gray-500">No active alerts</p>
          <p className="text-sm text-gray-400 mt-1">All systems operating normally</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
          Active Alerts
        </h3>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {alerts.filter(a => a.type === 'critical').length} Critical
          </span>
          <span className="text-sm text-gray-500">
            {alerts.length} total
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-3 rounded-lg border-l-4 ${getAlertColor(alert.type)} transition-all duration-200 hover:shadow-sm cursor-pointer`}
          >
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getAlertIcon(alert.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium truncate">
                    {alert.title}
                  </h4>
                  {alert.actionRequired && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-600 text-white ml-2">
                      Action Required
                    </span>
                  )}
                </div>

                <p className="text-sm mt-1 line-clamp-2">
                  {alert.message}
                </p>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-3 text-xs">
                    {/* Time */}
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{format(alert.timestamp, 'HH:mm')}</span>
                    </div>

                    {/* Location */}
                    {alert.location && (
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="truncate max-w-32">{alert.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Related incident info */}
                  {alert.relatedIncident && (
                    <div className="text-xs text-gray-500">
                      ID: {alert.relatedIncident.id}
                    </div>
                  )}
                </div>

                {/* Quick actions for critical alerts */}
                {alert.type === 'critical' && alert.actionRequired && (
                  <div className="mt-3 flex space-x-2">
                    <button className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors">
                      Assign Unit
                    </button>
                    <button className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">
                      View Details
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pulse animation for critical alerts */}
            {alert.type === 'critical' && (
              <div className="absolute -inset-1 bg-red-400 rounded-lg opacity-25 animate-pulse pointer-events-none"></div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-red-600">
              {alerts.filter(a => a.actionRequired).length}
            </div>
            <div className="text-xs text-gray-500">Need Action</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-600">
              {alerts.filter(a => a.type === 'high').length}
            </div>
            <div className="text-xs text-gray-500">High Priority</div>
          </div>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-3 text-center">
        <div className="inline-flex items-center text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Auto-updating
        </div>
      </div>
    </div>
  );
}