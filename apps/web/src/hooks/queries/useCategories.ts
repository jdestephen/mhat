import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Category {
  id: number;
  name: string;
  has_diagnosis: boolean;
  order: number;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/hx/categories');
      return res.data;
    },
  });
}
