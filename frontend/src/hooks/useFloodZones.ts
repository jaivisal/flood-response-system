import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiService } from '../services/api';
import { FloodZone, CreateFloodZoneData, FloodZoneStats } from '../types';
import toast from 'react-hot-toast';

// Define missing types
interface CreateFloodZoneData {
  name: string;
  description?: string;
  zone_code: string;
  risk_level: string;
  zone_type: string;
  center_latitude: number;
  center_longitude: number;
  area_sqkm?: number;
  population_estimate: number;
  residential_units: number;
  commercial_units: number;
  critical_infrastructure?: string[];
  district?: string;
  municipality?: string;
  responsible_officer?: string;
  emergency_contact?: string;
}

interface FloodZoneStats {
  total_zones: number;
  by_risk_level: Record<string, number>;
  by_zone_type: Record<string, number>;
  currently_flooded: number;
  evacuation_recommended: number;
  evacuation_mandatory: number;
  high_risk_zones: number;
  population_at_risk: number;
}

// Fetch flood zones
export function useFloodZones(options?: { refetchInterval?: number }) {
  return useQuery<FloodZone[]>(
    'flood-zones',
    () => apiService.get('/floodzones/'),
    {
      refetchInterval: options?.refetchInterval,
      staleTime: 30000, // 30 seconds
      onError: (error: any) => {
        console.error('Error fetching flood zones:', error);
        toast.error('Failed to load flood zones');
      },
    }
  );
}

// Fetch single flood zone
export function useFloodZone(id: number) {
  return useQuery<FloodZone>(
    ['flood-zone', id],
    () => apiService.get(`/floodzones/${id}`),
    {
      enabled: !!id,
      onError: (error: any) => {
        console.error('Error fetching flood zone:', error);
        toast.error('Failed to load flood zone details');
      },
    }
  );
}

// Fetch flood zone statistics
export function useFloodZoneStats() {
  return useQuery<FloodZoneStats>(
    'flood-zone-stats',
    () => apiService.get('/floodzones/stats/overview'),
    {
      staleTime: 60000, // 1 minute
      onError: (error: any) => {
        console.error('Error fetching flood zone stats:', error);
      },
    }
  );
}

// Create flood zone mutation
export function useCreateFloodZone() {
  const queryClient = useQueryClient();

  return useMutation<FloodZone, Error, CreateFloodZoneData>(
    (data) => apiService.post('/floodzones/', data),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('flood-zones');
        queryClient.invalidateQueries('flood-zone-stats');
        toast.success('Flood zone created successfully');
      },
      onError: (error: any) => {
        console.error('Error creating flood zone:', error);
        toast.error('Failed to create flood zone');
      },
    }
  );
}

// Update flood zone mutation
export function useUpdateFloodZone() {
  const queryClient = useQueryClient();

  return useMutation<FloodZone, Error, { id: number; data: Partial<FloodZone> }>(
    ({ id, data }) => apiService.put(`/floodzones/${id}`, data),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('flood-zones');
        queryClient.invalidateQueries(['flood-zone', data.id]);
        queryClient.invalidateQueries('flood-zone-stats');
        toast.success('Flood zone updated successfully');
      },
      onError: (error: any) => {
        console.error('Error updating flood zone:', error);
        toast.error('Failed to update flood zone');
      },
    }
  );
}

// Delete flood zone mutation
export function useDeleteFloodZone() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>(
    (id) => apiService.delete(`/floodzones/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('flood-zones');
        queryClient.invalidateQueries('flood-zone-stats');
        toast.success('Flood zone deleted successfully');
      },
      onError: (error: any) => {
        console.error('Error deleting flood zone:', error);
        toast.error('Failed to delete flood zone');
      },
    }
  );
}