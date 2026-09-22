import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface HealthCenterMembership {
  health_center_id: string;
  health_center_name: string;
  health_center_type: string;
  is_primary: boolean;
  start_date: string;
}

export function useMyHealthCenters() {
  return useQuery({
    queryKey: ['doctor', 'health-centers', 'mine'],
    queryFn: async () => {
      const res = await api.get<HealthCenterMembership[]>('/health-centers/mine');
      return res.data;
    },
  });
}
