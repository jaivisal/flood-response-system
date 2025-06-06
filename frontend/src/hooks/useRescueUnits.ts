import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiService } from '../services/api';
import { RescueUnit } from '../types';
import toast from 'react-hot-toast';

// Define interfaces locally since they may not be in the main types file
interface CreateRescueUnitData {
  unit_name: string;
  call_sign?: string;
  unit_type: string;
  capacity: number;
  team_size: number;
  team_leader?: string;
  contact_number?: string;
  radio_frequency?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    landmark?: string;
  };
  base_location?: {
    latitude: number;
    longitude: number;
    address?: string;
    landmark?: string;
  };
  equipment?: string[];
}

interface RescueUnitStats {
  total_units: number;
  available_units: number;
  busy_units: number;
  offline_units: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  average_response_time?: number;
  units_needing_maintenance: number;
}

// Fetch rescue units
export function useRescueUnits(options?: { refetchInterval?: number }) {
  return useQuery<RescueUnit[]>(
    'rescue-units',
    () => apiService.get('/rescue-units/'),
    {
      refetchInterval: options?.refetchInterval,
      staleTime: 30000, // 30 seconds
      onError: (error: any) => {
        console.error('Error fetching rescue units:', error);
        toast.error('Failed to load rescue units');
      },
    }
  );
}

// Fetch single rescue unit
export function useRescueUnit(id: number) {
  return useQuery<RescueUnit>(
    ['rescue-unit', id],
    () => apiService.get(`/rescue-units/${id}`),
    {
      enabled: !!id,
      onError: (error: any) => {
        console.error('Error fetching rescue unit:', error);
        toast.error('Failed to load rescue unit details');
      },
    }
  );
}

// Fetch rescue unit statistics
export function useRescueUnitStats() {
  return useQuery<RescueUnitStats>(
    'rescue-unit-stats',
    () => apiService.get('/rescue-units/stats/overview'),
    {
      staleTime: 60000, // 1 minute
      onError: (error: any) => {
        console.error('Error fetching rescue unit stats:', error);
      },
    }
  );
}

// Create rescue unit mutation
export function useCreateRescueUnit() {
  const queryClient = useQueryClient();

  return useMutation<RescueUnit, Error, CreateRescueUnitData>(
    (data) => apiService.post('/rescue-units/', data),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('rescue-units');
        queryClient.invalidateQueries('rescue-unit-stats');
        toast.success('Rescue unit created successfully');
      },
      onError: (error: any) => {
        console.error('Error creating rescue unit:', error);
        toast.error('Failed to create rescue unit');
      },
    }
  );
}

// Update rescue unit mutation
export function useUpdateRescueUnit() {
  const queryClient = useQueryClient();

  return useMutation<RescueUnit, Error, { id: number; data: Partial<RescueUnit> }>(
    ({ id, data }) => apiService.put(`/rescue-units/${id}`, data),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('rescue-units');
        queryClient.invalidateQueries(['rescue-unit', data.id]);
        queryClient.invalidateQueries('rescue-unit-stats');
        toast.success('Rescue unit updated successfully');
      },
      onError: (error: any) => {
        console.error('Error updating rescue unit:', error);
        toast.error('Failed to update rescue unit');
      },
    }
  );
}

// Delete rescue unit mutation
export function useDeleteRescueUnit() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>(
    (id) => apiService.delete(`/rescue-units/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('rescue-units');
        queryClient.invalidateQueries('rescue-unit-stats');
        toast.success('Rescue unit deleted successfully');
      },
      onError: (error: any) => {
        console.error('Error deleting rescue unit:', error);
        toast.error('Failed to delete rescue unit');
      },
    }
  );
}

// Update unit location mutation
export function useUpdateUnitLocation() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: number; location: { latitude: number; longitude: number; address?: string }; status?: string; fuel_level?: number }>(
    ({ id, location, status, fuel_level }) => 
      apiService.put(`/rescue-units/${id}/location`, {
        location,
        status,
        fuel_level,
      }),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries('rescue-units');
        queryClient.invalidateQueries(['rescue-unit', variables.id]);
        toast.success('Unit location updated successfully');
      },
      onError: (error: any) => {
        console.error('Error updating unit location:', error);
        toast.error('Failed to update unit location');
      },
    }
  );
}

// Update unit status mutation
export function useUpdateUnitStatus() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: number; status: string; notes?: string }>(
    ({ id, status, notes }) => 
      apiService.put(`/rescue-units/${id}/status`, {
        status,
        notes,
      }),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries('rescue-units');
        queryClient.invalidateQueries(['rescue-unit', variables.id]);
        queryClient.invalidateQueries('rescue-unit-stats');
        toast.success('Unit status updated successfully');
      },
      onError: (error: any) => {
        console.error('Error updating unit status:', error);
        toast.error('Failed to update unit status');
      },
    }
  );
}

// Fetch nearby rescue units
export function useNearbyRescueUnits(lat: number, lng: number, radius: number = 25) {
  return useQuery<RescueUnit[]>(
    ['nearby-rescue-units', lat, lng, radius],
    () => apiService.post('/rescue-units/nearby', {
      latitude: lat,
      longitude: lng,
      radius_km: radius,
      available_only: false,
      max_results: 20,
    }),
    {
      enabled: !!(lat && lng),
      staleTime: 30000,
      onError: (error: any) => {
        console.error('Error fetching nearby rescue units:', error);
      },
    }
  );
}

// Get available units by type
export function useAvailableUnitsByType() {
  return useQuery(
    'available-units-by-type',
    () => apiService.get('/rescue-units/available/by-type'),
    {
      staleTime: 30000,
      onError: (error: any) => {
        console.error('Error fetching available units by type:', error);
      },
    }
  );
}