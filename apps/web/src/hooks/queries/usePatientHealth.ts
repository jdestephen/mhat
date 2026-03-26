import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { HealthHabit, FamilyHistoryCondition } from '@/types';

interface PatientHealthProfile {
  medications: Array<{
    id: number;
    name: string;
    dosage?: string;
    frequency?: string;
    instructions?: string;
  }>;
  allergies: Array<{
    id: number;
    allergen: string;
    reaction?: string;
    severity?: string;
  }>;
  conditions: Array<{
    id: number;
    name: string;
    status?: string;
    since_year?: string;
  }>;
  health_habit: HealthHabit | null;
  family_history: FamilyHistoryCondition[];
}

export function usePatientHealth(patientId: string) {
  return useQuery<PatientHealthProfile>({
    queryKey: ['patient-health', patientId],
    queryFn: async () => {
      const { data } = await api.get(`/doctor/patients/${patientId}/health`);
      return data;
    },
    enabled: !!patientId,
  });
}
