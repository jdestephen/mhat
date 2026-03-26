import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface PatientProfileSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  relationship_type: string;
  access_level: string;
  is_self: boolean;
  has_records: boolean;
  created_by_doctor_name: string | null;
}

export function usePatientProfiles() {
  return useQuery<PatientProfileSummary[]>({
    queryKey: ['patient', 'profiles'],
    queryFn: async () => {
      const res = await api.get<PatientProfileSummary[]>('/patient/profiles');
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
