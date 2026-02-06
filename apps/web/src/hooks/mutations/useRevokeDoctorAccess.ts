import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useRevokeDoctorAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accessId: string) => {
      const res = await api.delete(`/profiles/me/doctors/${accessId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-doctors'] });
    },
  });
}
