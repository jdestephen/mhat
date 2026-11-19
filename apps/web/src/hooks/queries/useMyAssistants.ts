import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api, { toPaginatedResult } from '@/lib/api';

export interface AssistantAssignment {
  id: string;
  doctor_id: string;
  assistant_id: string;
  assistant_email: string;
  assistant_first_name: string | null;
  assistant_last_name: string | null;
  health_center_id: string;
  health_center_name: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  deactivated_at: string | null;
}

export function useMyAssistants(enabled = true) {
  return useQuery({
    queryKey: ['doctor', 'assistants'],
    enabled,
    queryFn: async () => {
      const res = await api.get<AssistantAssignment[]>('/doctor/assistants');
      return res.data;
    },
  });
}

interface UsePaginatedAssistantsOptions {
  page: number;
  pageSize: number;
  query?: string;
  isActive?: boolean;
  enabled?: boolean;
}

export function usePaginatedAssistants({
  page,
  pageSize,
  query,
  isActive,
  enabled = true,
}: UsePaginatedAssistantsOptions) {
  const normalizedQuery = query?.trim() || undefined;

  return useQuery({
    queryKey: [
      'doctor',
      'assistants',
      'paginated',
      { page, pageSize, query: normalizedQuery, isActive },
    ],
    enabled,
    queryFn: async () => {
      const response = await api.get<AssistantAssignment[]>('/doctor/assistants', {
        params: {
          skip: (page - 1) * pageSize,
          limit: pageSize,
          q: normalizedQuery,
          is_active: isActive,
        },
      });
      return toPaginatedResult(response);
    },
    placeholderData: keepPreviousData,
  });
}
