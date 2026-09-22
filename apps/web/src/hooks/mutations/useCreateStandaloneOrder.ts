import { useMutation, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';
import { ClinicalOrder, OrderType, OrderUrgency, OrderItem } from '@/types';

export interface CreateStandaloneOrderPayload {
  patientId: string;
  order_type: OrderType;
  items: OrderItem[];
  description: string;
  urgency?: OrderUrgency;
  reason?: string;
  notes?: string;
  referral_to?: string;
}

export function useCreateStandaloneOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, ...payload }: CreateStandaloneOrderPayload) => {
      const res = await api.post<ClinicalOrder>(
        `/doctor/patients/${patientId}/orders`,
        payload,
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-orders', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['doctor', 'patients', variables.patientId, 'records'] });
    },
  });
}
