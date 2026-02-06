import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DoctorAccessInfo } from '@/types';

export function useMyDoctors() {
  return useQuery({
    queryKey: ['my-doctors'],
    queryFn: async () => {
      const res = await api.get<DoctorAccessInfo[]>('/profiles/me/doctors');
      return res.data;
    },
  });
}
