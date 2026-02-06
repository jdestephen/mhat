import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DoctorMedicalRecord } from '@/types';

export function usePatientRecords(patientId: string | undefined) {
  return useQuery({
    queryKey: ['doctor', 'patients', patientId, 'records'],
    queryFn: async () => {
      const res = await api.get<DoctorMedicalRecord[]>(`/doctor/patients/${patientId}/records`);
      return res.data;
    },
    enabled: !!patientId,
  });
}
