import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface VerifyRecordPayload {
  recordId: string;
  notes?: string;
}

export function useVerifyRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, notes }: VerifyRecordPayload) => {
      const res = await api.put(`/doctor/records/${recordId}/verify`, { notes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor'] });
    },
  });
}
