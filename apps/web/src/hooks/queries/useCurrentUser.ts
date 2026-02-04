import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { User } from '@/types';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - user info changes infrequently
  });
}
