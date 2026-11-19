import { keepPreviousData, useQuery } from '@tanstack/react-query';

import api, { getPaginationMeta } from '@/lib/api';
import type { PaginatedResult } from '@/types/pagination';

export interface ShareLink {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  is_revoked: boolean;
  is_single_use: boolean;
  record_count: number;
  access_count: number;
  recipient_name?: string;
  recipient_email?: string;
  purpose?: string;
  share_type?: string;
}

export type ShareStatus = 'active' | 'expired' | 'all';

interface UseSharedLinksOptions {
  page: number;
  pageSize: number;
  status: ShareStatus;
  profileId?: string | null;
}

export function useSharedLinks({
  page,
  pageSize,
  status,
  profileId,
}: UseSharedLinksOptions) {
  return useQuery({
    queryKey: ['shared-links', { page, pageSize, status, profileId }],
    queryFn: async (): Promise<PaginatedResult<ShareLink>> => {
      const response = await api.get<{ shares: ShareLink[] }>('/hx/shares', {
        params: {
          skip: (page - 1) * pageSize,
          limit: pageSize,
          status,
          profile_id: profileId || undefined,
        },
      });
      const pagination = getPaginationMeta(response);
      if (!pagination) {
        throw new Error('La respuesta de enlaces no incluye metadata de paginación válida.');
      }
      return { items: response.data.shares, pagination };
    },
    placeholderData: keepPreviousData,
  });
}
