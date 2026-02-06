import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { AccessLevel, AccessInvitation } from '@/types';

interface CreateInvitationPayload {
  access_level: AccessLevel;
  access_type: 'PERMANENT' | 'TEMPORARY';
  expires_in_days?: number;
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInvitationPayload) => {
      const res = await api.post<AccessInvitation>('/profiles/me/invitations', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}
