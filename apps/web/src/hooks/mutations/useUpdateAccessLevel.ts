import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface UpdateAccessLevelParams {
  doctorId: string;
  accessLevel: 'READ_ONLY' | 'WRITE';
}

export function useUpdateAccessLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ doctorId, accessLevel }: UpdateAccessLevelParams) => {
      const res = await api.post('/profiles/me/doctor-access', null, {
        params: {
          doctor_id: doctorId,
          access_level: accessLevel,
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-doctors'] });
    },
  });
}
