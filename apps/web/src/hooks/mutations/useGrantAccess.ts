import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { AccessLevel } from '@/types';

interface GrantAccessPayload {
  patientProfileId: string;
  accessLevel?: AccessLevel;
}

export function useGrantAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientProfileId, accessLevel = AccessLevel.WRITE }: GrantAccessPayload) => {
      const res = await api.post(`/doctor/patients/${patientProfileId}/access`, null, {
        params: { access_level: accessLevel },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'patients'] });
    },
  });
}
