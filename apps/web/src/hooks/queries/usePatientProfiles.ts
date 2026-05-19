import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCurrentUser } from './useCurrentUser';
import { UserRole } from '@/types';

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
  profile_color: string | null;
}

export function usePatientProfiles() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const isPatient = user?.role === UserRole.PATIENT;

  return useQuery<PatientProfileSummary[]>({
    queryKey: ['patient', 'profiles'],
    queryFn: async () => {
      const res = await api.get<PatientProfileSummary[]>('/patient/profiles');
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    /** Only fetch profiles after we confirm the user is a patient */
    enabled: !userLoading && isPatient,
  });
}
