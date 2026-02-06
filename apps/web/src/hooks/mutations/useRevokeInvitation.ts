import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await api.delete(`/profiles/me/invitations/${invitationId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}
