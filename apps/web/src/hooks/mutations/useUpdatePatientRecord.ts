import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface UpdatePatientRecordPayload {
  recordId: string;
  motive?: string;
  notes?: string;
  category_id?: number;
  tags?: string[];
  diagnoses?: {
    diagnosis: string;
    diagnosis_code?: string;
    diagnosis_code_system?: string;
    rank: number;
    status: string;
    notes?: string;
  }[];
}

export function useUpdatePatientRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, ...payload }: UpdatePatientRecordPayload) => {
      const res = await api.put(`/hx/${recordId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalRecords'] });
    },
  });
}
