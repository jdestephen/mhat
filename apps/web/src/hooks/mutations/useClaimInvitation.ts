import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface ClaimResult {
  message: string;
  patient_name?: string;
  access_level?: string;
  access_type?: string;
}

export function useClaimInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post<ClaimResult>('/doctor/claim-access', { code });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'patients'] });
    },
  });
}
