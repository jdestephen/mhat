import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MedicalRecord } from '@/types';

interface CreateRecordPayload {
  motive: string;
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
}

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRecordPayload) => {
      const res = await api.post<MedicalRecord>('/hx/', payload);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refetch records
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
    },
  });
}
