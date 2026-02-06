import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PatientAccess } from '@/types';

export function useMyPatients() {
  return useQuery({
    queryKey: ['doctor', 'patients'],
    queryFn: async () => {
      const res = await api.get<PatientAccess[]>('/doctor/patients');
      return res.data;
    },
  });
}
