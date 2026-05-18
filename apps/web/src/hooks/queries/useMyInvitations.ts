import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { AccessInvitation } from '@/types';

export function useMyInvitations(profileId?: string | null) {
  return useQuery({
    queryKey: ['invitations', profileId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (profileId) params.append('profile_id', profileId);
      const res = await api.get<AccessInvitation[]>(`/profiles/me/invitations${params.toString() ? '?' + params.toString() : ''}`);
      return res.data;
    },
  });
}
