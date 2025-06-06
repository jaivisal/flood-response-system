import { useQuery, useMutation, useQueryClient } from 'react-query';
import { assignmentService, AssignmentRequest, AssignmentResponse } from '../services/assignments';
import toast from 'react-hot-toast';

// Hook for fetching incident assignments
export function useIncidentAssignments(incidentId: number) {
  return useQuery<AssignmentResponse[]>(
    ['incident-assignments', incidentId],
    () => assignmentService.getIncidentAssignments(incidentId),
    {
      enabled: !!incidentId,
      staleTime: 30000,
      onError: (error: any) => {
        console.error('Error fetching incident assignments:', error);
      },
    }
  );
}

// Hook for fetching unit assignments
export function useUnitAssignments(unitId: number) {
  return useQuery<AssignmentResponse[]>(
    ['unit-assignments', unitId],
    () => assignmentService.getUnitAssignments(unitId),
    {
      enabled: !!unitId,
      staleTime: 30000,
      onError: (error: any) => {
        console.error('Error fetching unit assignments:', error);
      },
    }
  );
}

// Hook for fetching all active assignments
export function useActiveAssignments() {
  return useQuery<AssignmentResponse[]>(
    'active-assignments',
    () => assignmentService.getActiveAssignments(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 15000,
      onError: (error: any) => {
        console.error('Error fetching active assignments:', error);
      },
    }
  );
}

// Hook for assignment statistics
export function useAssignmentStats() {
  return useQuery(
    'assignment-stats',
    () => assignmentService.getAssignmentStats(),
    {
      staleTime: 60000, // 1 minute
      onError: (error: any) => {
        console.error('Error fetching assignment stats:', error);
      },
    }
  );
}

// Mutation hook for assigning units
export function useAssignUnit() {
  const queryClient = useQueryClient();

  return useMutation<AssignmentResponse, Error, AssignmentRequest>(
    (assignmentData) => assignmentService.assignUnit(assignmentData),
    {
      onMutate: () => {
        // Optimistic update - show loading state
        toast.loading('Assigning unit...', { id: 'unit-assignment' });
      },
      onSuccess: (data, variables) => {
        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries('incidents');
        queryClient.invalidateQueries('rescue-units');
        queryClient.invalidateQueries('active-assignments');
        queryClient.invalidateQueries(['incident-assignments', variables.incident_id]);
        queryClient.invalidateQueries(['unit-assignments', variables.unit_id]);
        queryClient.invalidateQueries('assignment-stats');
        queryClient.invalidateQueries('incident-stats');
        queryClient.invalidateQueries('rescue-unit-stats');
        
        toast.success('Unit assigned successfully!', { id: 'unit-assignment' });
      },
      onError: (error: any) => {
        console.error('Assignment failed:', error);
        toast.error(
          error.message || 'Failed to assign unit. Please try again.',
          { id: 'unit-assignment' }
        );
      },
    }
  );
}

// Mutation hook for updating assignment status
export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();

  return useMutation<AssignmentResponse, Error, {
    assignmentId: number;
    status: 'assigned' | 'en_route' | 'arrived' | 'completed';
    notes?: string;
  }>(
    ({ assignmentId, status, notes }) => 
      assignmentService.updateAssignmentStatus(assignmentId, status, notes),
    {
      onMutate: () => {
        toast.loading('Updating assignment status...', { id: 'status-update' });
      },
      onSuccess: (data) => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries('incidents');
        queryClient.invalidateQueries('rescue-units');
        queryClient.invalidateQueries('active-assignments');
        queryClient.invalidateQueries(['incident-assignments', data.incident_id]);
        queryClient.invalidateQueries(['unit-assignments', data.unit_id]);
        queryClient.invalidateQueries('assignment-stats');
        
        toast.success('Assignment status updated successfully!', { id: 'status-update' });
      },
      onError: (error: any) => {
        console.error('Failed to update assignment status:', error);
        toast.error(
          error.message || 'Failed to update assignment status',
          { id: 'status-update' }
        );
      },
    }
  );
}

// Mutation hook for canceling assignments
export function useCancelAssignment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { assignmentId: number; reason?: string }>(
    ({ assignmentId, reason }) => assignmentService.cancelAssignment(assignmentId, reason),
    {
      onMutate: () => {
        toast.loading('Canceling assignment...', { id: 'cancel-assignment' });
      },
      onSuccess: () => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries('incidents');
        queryClient.invalidateQueries('rescue-units');
        queryClient.invalidateQueries('active-assignments');
        queryClient.invalidateQueries('assignment-stats');
        
        toast.success('Assignment canceled successfully!', { id: 'cancel-assignment' });
      },
      onError: (error: any) => {
        console.error('Failed to cancel assignment:', error);
        toast.error(
          error.message || 'Failed to cancel assignment',
          { id: 'cancel-assignment' }
        );
      },
    }
  );
}

// Mutation hook for auto-assigning units
export function useAutoAssignUnits() {
  const queryClient = useQueryClient();

  return useMutation<AssignmentResponse[], Error, number[]>(
    (incidentIds) => assignmentService.autoAssignUnits(incidentIds),
    {
      onMutate: () => {
        toast.loading('Auto-assigning units to critical incidents...', { id: 'auto-assign' });
      },
      onSuccess: (data) => {
        // Invalidate all relevant queries
        queryClient.invalidateQueries('incidents');
        queryClient.invalidateQueries('rescue-units');
        queryClient.invalidateQueries('active-assignments');
        queryClient.invalidateQueries('assignment-stats');
        queryClient.invalidateQueries('incident-stats');
        queryClient.invalidateQueries('rescue-unit-stats');
        
        // Success message with details
        const successMessage = data.length > 0 
          ? `Successfully auto-assigned ${data.length} unit${data.length > 1 ? 's' : ''} to critical incidents!`
          : 'Auto-assignment completed. No suitable units were available.';
          
        toast.success(successMessage, { 
          id: 'auto-assign',
          duration: 5000 
        });
      },
      onError: (error: any) => {
        console.error('Auto-assignment failed:', error);
        toast.error(
          error.message || 'Auto-assignment failed. Please try manual assignment.',
          { 
            id: 'auto-assign',
            duration: 5000 
          }
        );
      },
    }
  );
}

// Hook for bulk assignment operations
export function useBulkAssignUnits() {
  const queryClient = useQueryClient();

  return useMutation<AssignmentResponse[], Error, {
    assignments: { incident_id: number; unit_id: number; priority?: string; notes?: string }[];
  }>(
    async ({ assignments }) => {
      // Process assignments sequentially to avoid conflicts
      const results: AssignmentResponse[] = [];
      for (const assignment of assignments) {
        try {
          const result = await assignmentService.assignUnit({
            incident_id: assignment.incident_id,
            unit_id: assignment.unit_id,
            priority: (assignment.priority as any) || 'medium',
            notes: assignment.notes,
          });
          results.push(result);
        } catch (error) {
          console.error('Failed to assign unit in bulk operation:', error);
          // Continue with other assignments even if one fails
        }
      }
      return results;
    },
    {
      onMutate: () => {
        toast.loading('Processing bulk assignments...', { id: 'bulk-assign' });
      },
      onSuccess: (data, variables) => {
        // Invalidate queries
        queryClient.invalidateQueries('incidents');
        queryClient.invalidateQueries('rescue-units');
        queryClient.invalidateQueries('active-assignments');
        queryClient.invalidateQueries('assignment-stats');
        
        const successCount = data.length;
        const totalCount = variables.assignments.length;
        
        if (successCount === totalCount) {
          toast.success(
            `Successfully assigned all ${successCount} units!`,
            { id: 'bulk-assign' }
          );
        } else {
          toast.success(
            `Assigned ${successCount} of ${totalCount} units. Some assignments failed.`,
            { id: 'bulk-assign' }
          );
        }
      },
      onError: (error: any) => {
        console.error('Bulk assignment failed:', error);
        toast.error(
          error.message || 'Bulk assignment failed',
          { id: 'bulk-assign' }
        );
      },
    }
  );
}

// Hook for getting assignment recommendations
export function useAssignmentRecommendations(incidentId: number) {
  return useQuery(
    ['assignment-recommendations', incidentId],
    async () => {
      try {
        return await assignmentService.getAssignmentRecommendations?.(incidentId) || [];
      } catch (error) {
        console.error('Failed to fetch assignment recommendations:', error);
        return [];
      }
    },
    {
      enabled: !!incidentId,
      staleTime: 60000, // 1 minute
      onError: (error: any) => {
        console.error('Error fetching assignment recommendations:', error);
      },
    }
  );
}

// Hook for real-time assignment tracking
export function useAssignmentTracking(assignmentId: number) {
  return useQuery<AssignmentResponse>(
    ['assignment-tracking', assignmentId],
    () => assignmentService.getAssignmentById?.(assignmentId),
    {
      enabled: !!assignmentId,
      refetchInterval: 10000, // Refetch every 10 seconds for real-time tracking
      staleTime: 5000,
      onError: (error: any) => {
        console.error('Error tracking assignment:', error);
      },
    }
  );
}