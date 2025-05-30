import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiService } from '../services/api';
import { Incident, CreateIncidentData, IncidentStats } from '../types';
import toast from 'react-hot-toast';

// Fetch incidents
export function useIncidents(options?: { refetchInterval?: number }) {
  return useQuery<Incident[]>(
    'incidents',
    () => apiService.get('/incidents/'),
    {
      refetchInterval: options?.refetchInterval,
      staleTime: 30000, // 30 seconds
      onError: (error: any) => {
        console.error('Error fetching incidents:', error);
        toast.error('Failed to load incidents');
      },
    }
  );
}

// Fetch single incident
export function useIncident(id: number) {
  return useQuery<Incident>(
    ['incident', id],
    () => apiService.get(`/incidents/${id}`),
    {
      enabled: !!id,
      onError: (error: any) => {
        console.error('Error fetching incident:', error);
        toast.error('Failed to load incident details');
      },
    }
  );
}

// Fetch incident statistics
export function useIncidentStats() {
  return useQuery<IncidentStats>(
    'incident-stats',
    () => apiService.get('/incidents/stats/overview'),
    {
      staleTime: 60000, // 1 minute
      onError: (error: any) => {
        console.error('Error fetching incident stats:', error);
      },
    }
  );
}

// Create incident mutation
export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation<Incident, Error, CreateIncidentData>(
    (data) => apiService.post('/incidents/', data),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('incidents');
        queryClient.invalidateQueries('incident-stats');
        toast.success('Incident reported successfully');
      },
      onError: (error: any) => {
        console.error('Error creating incident:', error);
        toast.error('Failed to report incident');
      },
    }
  );
}

// Update incident mutation
export function useUpdateIncident() {
  const queryClient = useQueryClient();

  return useMutation<Incident, Error, { id: number; data: Partial<Incident> }>(
    ({ id, data }) => apiService.put(`/incidents/${id}`, data),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('incidents');
        queryClient.invalidateQueries(['incident', data.id]);
        queryClient.invalidateQueries('incident-stats');
        toast.success('Incident updated successfully');
      },
      onError: (error: any) => {
        console.error('Error updating incident:', error);
        toast.error('Failed to update incident');
      },
    }
  );
}

// Delete incident mutation
export function useDeleteIncident() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>(
    (id) => apiService.delete(`/incidents/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('incidents');
        queryClient.invalidateQueries('incident-stats');
        toast.success('Incident deleted successfully');
      },
      onError: (error: any) => {
        console.error('Error deleting incident:', error);
        toast.error('Failed to delete incident');
      },
    }
  );
}

// Fetch nearby incidents
export function useNearbyIncidents(lat: number, lng: number, radius: number = 10) {
  return useQuery<Incident[]>(
    ['nearby-incidents', lat, lng, radius],
    () => apiService.post('/incidents/nearby', {
      latitude: lat,
      longitude: lng,
      radius_km: radius,
    }),
    {
      enabled: !!(lat && lng),
      staleTime: 30000,
      onError: (error: any) => {
        console.error('Error fetching nearby incidents:', error);
      },
    }
  );
}

// Fetch incidents as GeoJSON
export function useIncidentsGeoJSON() {
  return useQuery(
    'incidents-geojson',
    () => apiService.get('/incidents/geojson/all'),
    {
      staleTime: 30000,
      onError: (error: any) => {
        console.error('Error fetching incidents GeoJSON:', error);
      },
    }
  );
}