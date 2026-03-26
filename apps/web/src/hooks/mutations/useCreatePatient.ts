import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface CreatePatientData {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  sex?: string;
  email?: string;
  phone?: string;
  dni?: string;
}

interface CreatePatientResult {
  patient_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  activation_email_sent: boolean;
  message: string;
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePatientData) => {
      const res = await api.post<CreatePatientResult>('/doctor/patients/create', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'patients'] });
    },
  });
}
