import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

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

export function useMyAssistants() {
  return useQuery({
    queryKey: ['doctor', 'assistants'],
    queryFn: async () => {
      const res = await api.get<AssistantAssignment[]>('/doctor/assistants');
      return res.data;
    },
  });
}
