import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PatientProfile } from '@/types';

export function usePatientProfile() {
  return useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: async () => {
      const res = await api.get<PatientProfile>('/profiles/patient');
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
