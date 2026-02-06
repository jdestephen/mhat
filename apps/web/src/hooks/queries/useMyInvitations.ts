import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { AccessInvitation } from '@/types';

export function useMyInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const res = await api.get<AccessInvitation[]>('/profiles/me/invitations');
      return res.data;
    },
  });
}
