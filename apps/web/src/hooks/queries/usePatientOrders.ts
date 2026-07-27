import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';
import { ClinicalOrder } from '@/types';

export function usePatientOrders(patientId: string, orderType?: string) {
  return useQuery({
    queryKey: ['patient-orders', patientId, orderType],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (orderType) params.order_type = orderType;
      const res = await api.get<ClinicalOrder[]>(
        `/doctor/patients/${patientId}/orders`,
        { params },
      );
      return res.data;
    },
    enabled: !!patientId,
  });
}
