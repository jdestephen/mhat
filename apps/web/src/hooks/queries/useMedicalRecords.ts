import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api, { toPaginatedResult } from '@/lib/api';
import type { MedicalRecord } from '@/types';

interface UseMedicalRecordsOptions {
  page: number;
  pageSize: number;
  profileId?: string | null;
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  hasPrescriptions?: boolean;
  hasOrders?: boolean;
  enabled?: boolean;
}

export function useMedicalRecords({
  page,
  pageSize,
  profileId,
  query,
  dateFrom,
  dateTo,
  hasPrescriptions,
  hasOrders,
  enabled = true,
}: UseMedicalRecordsOptions) {
  const normalizedQuery = query?.trim() || undefined;

  return useQuery({
    queryKey: [
      'medical-records',
      {
        page,
        pageSize,
        profileId,
        query: normalizedQuery,
        dateFrom,
        dateTo,
        hasPrescriptions,
        hasOrders,
      },
    ],
    queryFn: async () => {
      const response = await api.get<MedicalRecord[]>('/hx/', {
        params: {
          skip: (page - 1) * pageSize,
          limit: pageSize,
          profile_id: profileId || undefined,
          q: normalizedQuery,
          date_from: dateFrom,
          date_to: dateTo,
          has_prescriptions: hasPrescriptions || undefined,
          has_orders: hasOrders || undefined,
        },
      });
      return toPaginatedResult(response);
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}
