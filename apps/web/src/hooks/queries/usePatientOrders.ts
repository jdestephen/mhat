import { keepPreviousData, useQuery } from '@tanstack/react-query';

import api, { toPaginatedResult } from '@/lib/api';
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

interface UsePaginatedPatientOrdersOptions {
  patientId: string;
  page: number;
  pageSize: number;
  orderType?: string;
}

export function usePaginatedPatientOrders({
  patientId,
  page,
  pageSize,
  orderType,
}: UsePaginatedPatientOrdersOptions) {
  return useQuery({
    queryKey: ['patient-orders', patientId, { page, pageSize, orderType }],
    queryFn: async () => {
      const response = await api.get<ClinicalOrder[]>(
        `/doctor/patients/${patientId}/orders`,
        {
          params: {
            skip: (page - 1) * pageSize,
            limit: pageSize,
            order_type: orderType,
          },
        },
      );
      return toPaginatedResult(response);
    },
    placeholderData: keepPreviousData,
    enabled: !!patientId,
  });
}
