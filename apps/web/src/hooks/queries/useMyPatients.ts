import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api, { toPaginatedResult } from '@/lib/api';
import { PatientAccess } from '@/types';

export type PatientSort = 'name_asc' | 'name_desc' | 'recent';

interface UseMyPatientsOptions {
  page: number;
  pageSize: number;
  query?: string;
  sort?: PatientSort;
}

export function useMyPatients() {
  return useQuery({
    queryKey: ['doctor', 'patients'],
    queryFn: async () => {
      const response = await api.get<PatientAccess[]>('/doctor/patients');
      return response.data;
    },
  });
}

export function usePaginatedPatients({
  page,
  pageSize,
  query,
  sort = 'name_asc',
}: UseMyPatientsOptions) {
  const normalizedQuery = query?.trim() || undefined;

  return useQuery({
    queryKey: [
      'doctor',
      'patients',
      'paginated',
      { page, pageSize, query: normalizedQuery, sort },
    ],
    queryFn: async () => {
      const response = await api.get<PatientAccess[]>('/doctor/patients', {
        params: {
          skip: (page - 1) * pageSize,
          limit: pageSize,
          q: normalizedQuery,
          sort,
        },
      });
      return toPaginatedResult(response);
    },
    placeholderData: keepPreviousData,
  });
}
