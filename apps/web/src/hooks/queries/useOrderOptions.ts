import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';
import { OrderItem } from '@/types';

export interface OrderOptionGroup {
  group: string;
  options: OrderItem[];
}

export interface OrderTypeOptions {
  label: string;
  code_system: string;
  groups: OrderOptionGroup[];
}

export type OrderOptionsMap = Record<string, OrderTypeOptions>;

export function useOrderOptions() {
  return useQuery({
    queryKey: ['clinical-order-options'],
    queryFn: async () => {
      const res = await api.get<OrderOptionsMap>('/catalog/clinical-orders');
      return res.data;
    },
    staleTime: Infinity,
  });
}
