import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DoctorAccessInfo } from '@/types';

export function useMyDoctors(profileId?: string | null) {
  return useQuery({
    queryKey: ['my-doctors', profileId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (profileId) params.append('profile_id', profileId);
      const res = await api.get<DoctorAccessInfo[]>(`/profiles/me/doctors${params.toString() ? '?' + params.toString() : ''}`);
      return res.data;
    },
  });
}
