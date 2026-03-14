import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { CreateDoctorRecordPayload } from './useCreateDoctorRecord';

export interface UpdateDoctorRecordPayload extends Omit<CreateDoctorRecordPayload, 'patientId'> {
  recordId: string;
  patientId: string;
}

export function useUpdateDoctorRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, patientId, ...payload }: UpdateDoctorRecordPayload) => {
      const res = await api.put(`/doctor/records/${recordId}`, payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'patients', variables.patientId, 'records'] });
    },
  });
}
