import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { AlertTriangle, Clock, MapPin, Users } from 'lucide-react';
import { Incident } from '../../types';

interface RecentIncidentsProps {
  incidents: Incident[];
}

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

export default function RecentIncidents({ incidents }: RecentIncidentsProps) {
  if (incidents.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-blue-600" />
          Recent Incidents
        </h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-gray-500">No recent incidents</p>
          <p className="text-sm text-gray-400 mt-1">All quiet in the last 24 hours</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-blue-600" />
          Recent Incidents
        </h3>
        <span className="text-sm text-gray-500">Last 24 hours</span>
      </div>

      <div className="space-y-3">
        {incidents.map((incident, index) => (
          <motion.div
            key={incident.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-start space-x-3">
              {/* Severity indicator */}
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                <span className="mr-1">{getSeverityIcon(incident.severity)}</span>
                {incident.severity}
              </div>

              {/* Incident details */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {incident.title}
                </h4>
                
                {incident.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {incident.description}
                  </p>
                )}

                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  {/* Time */}
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>{format(new Date(incident.created_at), 'HH:mm')}</span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">
                      {incident.address || incident.landmark || 'Location pending'}
                    </span>
                  </div>

                  {/* Affected people */}
                  {incident.affected_people_count > 0 && (
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      <span>{incident.affected_people_count} affected</span>
                    </div>
                  )}
                </div>

                {/* Status indicator */}
                <div className="flex items-center justify-between mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    incident.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    incident.status === 'assigned' ? 'bg-purple-100 text-purple-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {incident.status.replace('_', ' ')}
                  </span>

                  {incident.is_critical && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-1 animate-pulse"></span>
                      Critical
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* View all link */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
          View all incidents →
        </button>
      </div>
    </div>
  );
}