import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { AccessLevel, AccessInvitation } from '@/types';

interface CreateInvitationPayload {
  access_level: AccessLevel;
  access_type: 'PERMANENT' | 'TEMPORARY';
  expires_in_days?: number;
  profile_id?: string;
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInvitationPayload) => {
      const { profile_id, ...body } = payload;
      const params = new URLSearchParams();
      if (profile_id) params.append('profile_id', profile_id);
      const res = await api.post<AccessInvitation>(
        `/profiles/me/invitations${params.toString() ? '?' + params.toString() : ''}`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}
