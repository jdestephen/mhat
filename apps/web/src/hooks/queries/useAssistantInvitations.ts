import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

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

export function useAssistantInvitations() {
  return useQuery({
    queryKey: ['doctor', 'assistants', 'invitations'],
    queryFn: async () => {
      const res = await api.get<AssistantInvitation[]>('/doctor/assistants/invitations');
      return res.data;
    },
  });
}
