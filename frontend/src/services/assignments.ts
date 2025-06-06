// src/services/assignments.ts
import { apiService } from './api';

export interface AssignmentRequest {
  incident_id: number;
  unit_id: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_arrival?: number; // minutes
  notes?: string;
}

export interface AssignmentResponse {
  id: number;
  incident_id: number;
  unit_id: number;
  assigned_at: string;
  estimated_arrival?: number;
  actual_arrival?: string;
  status: 'assigned' | 'en_route' | 'arrived' | 'completed' | 'cancelled';
  notes?: string;
  assigned_by: number;
  created_at: string;
  updated_at?: string;
  // Additional fields for enhanced functionality
  incident?: {
    id: number;
    title: string;
    severity: string;
    incident_type: string;
  };
  unit?: {
    id: number;
    unit_name: string;
    unit_type: string;
    call_sign?: string;
  };
  assigned_by_user?: {
    id: number;
    full_name: string;
    role: string;
  };
}

export interface AssignmentRecommendation {
  unit_id: number;
  unit_name: string;
  unit_type: string;
  suitability_score: number;
  distance_km: number;
  estimated_arrival_minutes: number;
  reasons: string[];
  availability_status: 'available' | 'busy' | 'maintenance';
}

export interface AssignmentStats {
  total_assignments: number;
  active_assignments: number;
  completed_assignments: number;
  cancelled_assignments: number;
  average_response_time: number; // minutes
  average_resolution_time: number; // hours
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_unit_type: Record<string, number>;
  success_rate: number; // percentage
}

export interface AutoAssignRequest {
  incident_ids: number[];
  priority_threshold?: 'medium' | 'high' | 'critical';
  max_distance_km?: number;
  consider_unit_type?: boolean;
}

export class AssignmentService {
  // Assign a unit to an incident
  async assignUnit(assignmentData: AssignmentRequest): Promise<AssignmentResponse> {
    try {
      console.log('🚨 Assigning unit:', assignmentData);
      
      // Validate input data
      this.validateAssignmentRequest(assignmentData);
      
      const response = await apiService.post<AssignmentResponse>('/incidents/assign-unit', assignmentData);
      
      console.log('✅ Unit assigned successfully:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Assignment failed:', error);
      throw this.handleAssignmentError(error);
    }
  }

  // Get assignments for an incident
  async getIncidentAssignments(incidentId: number): Promise<AssignmentResponse[]> {
    try {
      return await apiService.get<AssignmentResponse[]>(`/incidents/${incidentId}/assignments`);
    } catch (error: any) {
      console.error('Failed to fetch incident assignments:', error);
      throw new Error('Failed to load incident assignments');
    }
  }

  // Get assignments for a unit
  async getUnitAssignments(unitId: number): Promise<AssignmentResponse[]> {
    try {
      return await apiService.get<AssignmentResponse[]>(`/rescue-units/${unitId}/assignments`);
    } catch (error: any) {
      console.error('Failed to fetch unit assignments:', error);
      throw new Error('Failed to load unit assignments');
    }
  }

  // Get a specific assignment by ID
  async getAssignmentById(assignmentId: number): Promise<AssignmentResponse> {
    try {
      return await apiService.get<AssignmentResponse>(`/assignments/${assignmentId}`);
    } catch (error: any) {
      console.error('Failed to fetch assignment:', error);
      throw new Error('Failed to load assignment details');
    }
  }

  // Update assignment status
  async updateAssignmentStatus(
    assignmentId: number, 
    status: 'assigned' | 'en_route' | 'arrived' | 'completed',
    notes?: string
  ): Promise<AssignmentResponse> {
    try {
      console.log('🔄 Updating assignment status:', { assignmentId, status, notes });
      
      const response = await apiService.patch<AssignmentResponse>(`/assignments/${assignmentId}/status`, {
        status,
        notes,
        updated_at: new Date().toISOString(),
      });
      
      console.log('✅ Assignment status updated:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Failed to update assignment status:', error);
      throw this.handleAssignmentError(error);
    }
  }

  // Cancel an assignment
  async cancelAssignment(assignmentId: number, reason?: string): Promise<void> {
    try {
      console.log('❌ Canceling assignment:', { assignmentId, reason });
      
      await apiService.delete(`/assignments/${assignmentId}`, {
        data: { 
          reason,
          cancelled_at: new Date().toISOString(),
        }
      });
      
      console.log('✅ Assignment cancelled successfully');
    } catch (error: any) {
      console.error('❌ Failed to cancel assignment:', error);
      throw this.handleAssignmentError(error);
    }
  }

  // Get all active assignments
  async getActiveAssignments(): Promise<AssignmentResponse[]> {
    try {
      return await apiService.get<AssignmentResponse[]>('/assignments/active');
    } catch (error: any) {
      console.error('Failed to fetch active assignments:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  // Auto-assign units to critical incidents
  async autoAssignUnits(incidentIds: number[]): Promise<AssignmentResponse[]> {
    try {
      console.log('🤖 Auto-assigning units to incidents:', incidentIds);
      
      if (!incidentIds || incidentIds.length === 0) {
        throw new Error('No incidents provided for auto-assignment');
      }

      const requestData: AutoAssignRequest = {
        incident_ids: incidentIds,
        priority_threshold: 'high', // Only auto-assign high and critical
        max_distance_km: 50, // Limit to units within 50km
        consider_unit_type: true, // Match unit types to incident types
      };
      
      const response = await apiService.post<AssignmentResponse[]>('/incidents/auto-assign', requestData);
      
      console.log('✅ Auto-assignment completed:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Auto-assignment failed:', error);
      throw this.handleAssignmentError(error);
    }
  }

  // Get assignment recommendations for an incident
  async getAssignmentRecommendations(incidentId: number): Promise<AssignmentRecommendation[]> {
    try {
      return await apiService.get<AssignmentRecommendation[]>(`/incidents/${incidentId}/recommendations`);
    } catch (error: any) {
      console.error('Failed to fetch assignment recommendations:', error);
      // Return empty array if recommendations service is not available
      return [];
    }
  }

  // Get assignment statistics
  async getAssignmentStats(): Promise<AssignmentStats> {
    try {
      return await apiService.get<AssignmentStats>('/assignments/stats');
    } catch (error: any) {
      console.error('Failed to fetch assignment stats:', error);
      // Return default stats structure
      return {
        total_assignments: 0,
        active_assignments: 0,
        completed_assignments: 0,
        cancelled_assignments: 0,
        average_response_time: 0,
        average_resolution_time: 0,
        by_status: {},
        by_priority: {},
        by_unit_type: {},
        success_rate: 0,
      };
    }
  }

  // Get assignments history with pagination
  async getAssignmentsHistory(
    page: number = 1, 
    limit: number = 50,
    filters?: {
      status?: string;
      priority?: string;
      unit_type?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<{
    assignments: AssignmentResponse[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });

      return await apiService.get(`/assignments/history?${params.toString()}`);
    } catch (error: any) {
      console.error('Failed to fetch assignments history:', error);
      throw new Error('Failed to load assignments history');
    }
  }

  // Bulk assign units to multiple incidents
  async bulkAssignUnits(assignments: {
    incident_id: number;
    unit_id: number;
    priority?: string;
    notes?: string;
  }[]): Promise<AssignmentResponse[]> {
    try {
      console.log('📦 Bulk assigning units:', assignments);
      
      const response = await apiService.post<AssignmentResponse[]>('/assignments/bulk', {
        assignments: assignments.map(a => ({
          ...a,
          priority: a.priority || 'medium',
        })),
      });
      
      console.log('✅ Bulk assignment completed:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Bulk assignment failed:', error);
      throw this.handleAssignmentError(error);
    }
  }

  // Get assignment metrics for dashboard
  async getAssignmentMetrics(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<{
    assignments_count: number;
    success_rate: number;
    average_response_time: number;
    units_utilization: number;
    critical_assignments: number;
  }> {
    try {
      return await apiService.get(`/assignments/metrics?timeframe=${timeframe}`);
    } catch (error: any) {
      console.error('Failed to fetch assignment metrics:', error);
      return {
        assignments_count: 0,
        success_rate: 0,
        average_response_time: 0,
        units_utilization: 0,
        critical_assignments: 0,
      };
    }
  }

  // Private helper methods
  private validateAssignmentRequest(data: AssignmentRequest): void {
    if (!data.incident_id || !data.unit_id) {
      throw new Error('Incident ID and Unit ID are required');
    }

    if (!['low', 'medium', 'high', 'critical'].includes(data.priority)) {
      throw new Error('Invalid priority level');
    }

    if (data.estimated_arrival && (data.estimated_arrival < 1 || data.estimated_arrival > 1440)) {
      throw new Error('Estimated arrival must be between 1 and 1440 minutes');
    }

    if (data.notes && data.notes.length > 500) {
      throw new Error('Notes cannot exceed 500 characters');
    }
  }

  private handleAssignmentError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(data?.detail || 'Invalid assignment request');
        case 404:
          return new Error('Incident or unit not found');
        case 409:
          return new Error('Unit is no longer available or already assigned');
        case 422:
          if (data?.detail && Array.isArray(data.detail)) {
            const errorMessage = data.detail.map((err: any) => 
              `${err.loc?.join('.')}: ${err.msg}`
            ).join(', ');
            return new Error(`Validation Error: ${errorMessage}`);
          }
          return new Error('Invalid assignment data');
        case 429:
          return new Error('Too many assignment requests. Please wait and try again.');
        case 500:
          return new Error('Server error. Please try again later.');
        default:
          return new Error(data?.detail || 'Assignment failed. Please try again.');
      }
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    } else {
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

// Export singleton instance
export const assignmentService = new AssignmentService();

// Export default
export default assignmentService;