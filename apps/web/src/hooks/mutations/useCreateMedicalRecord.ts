import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MedicalRecord } from '@/types';

interface CreateRecordPayload {
  motive: string;
  record_date?: string;
  notes?: string;
  tags?: string[];
  category_id?: number;
  diagnoses?: Array<{
    diagnosis: string;
    diagnosis_code?: string;
    diagnosis_code_system?: string;
    rank: number;
    status: string;
    notes?: string;
  }>;
  prescriptions?: Array<{
    medication_name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    route?: string;
    quantity?: string;
    instructions?: string;
  }>;
}

export function useCreateMedicalRecord(profileId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRecordPayload) => {
      const params = new URLSearchParams();
      if (profileId) params.append('profile_id', profileId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.post<MedicalRecord>(`/hx/${qs}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-records'] });
    },
  });
}
