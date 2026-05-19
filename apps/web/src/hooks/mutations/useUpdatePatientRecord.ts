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

export function useUpdatePatientRecord(profileId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, ...payload }: UpdatePatientRecordPayload) => {
      const params = new URLSearchParams();
      if (profileId) params.append('profile_id', profileId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.put(`/hx/${recordId}${qs}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      queryClient.invalidateQueries({ queryKey: ['medical-record'] });
    },
  });
}
