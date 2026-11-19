import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api, { toPaginatedResult } from '@/lib/api';

export interface AssistantInvitation {
  id: string;
  doctor_id: string;
  health_center_id: string;
  health_center_name: string;
  email: string;
  first_name: string;
  last_name: string;
  permissions: string[];
  expires_at: string;
  claimed_at: string | null;
  is_revoked: boolean;
  created_at: string;
}

export function useAssistantInvitations(enabled = true) {
  return useQuery({
    queryKey: ['doctor', 'assistants', 'invitations'],
    enabled,
    queryFn: async () => {
      const res = await api.get<AssistantInvitation[]>('/doctor/assistants/invitations');
      return res.data;
    },
  });
}

interface UsePaginatedAssistantInvitationsOptions {
  page: number;
  pageSize: number;
  query?: string;
  enabled?: boolean;
}

export function usePaginatedAssistantInvitations({
  page,
  pageSize,
  query,
  enabled = true,
}: UsePaginatedAssistantInvitationsOptions) {
  const normalizedQuery = query?.trim() || undefined;

  return useQuery({
    queryKey: [
      'doctor',
      'assistants',
      'invitations',
      'paginated',
      { page, pageSize, query: normalizedQuery },
    ],
    enabled,
    queryFn: async () => {
      const response = await api.get<AssistantInvitation[]>(
        '/doctor/assistants/invitations',
        {
          params: {
            skip: (page - 1) * pageSize,
            limit: pageSize,
            q: normalizedQuery,
          },
        },
      );
      return toPaginatedResult(response);
    },
    placeholderData: keepPreviousData,
  });
}
