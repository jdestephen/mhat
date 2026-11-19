import { keepPreviousData, useQuery } from '@tanstack/react-query';

import api, { toPaginatedResult } from '@/lib/api';
import { DoctorApprovalStatus } from '@/types';

export interface DoctorApplication {
  profile_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  college_number: string | null;
  verification_phone: string | null;
  approval_status: DoctorApprovalStatus;
  registered_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  identity_document_url: string | null;
  college_document_url: string | null;
  ocr_extracted_data: {
    identity?: {
      extracted_dni?: string | null;
      extracted_name?: string | null;
      confidence?: number;
      raw_text?: string;
    };
    college?: {
      extracted_college_number?: string | null;
      extracted_name?: string | null;
      confidence?: number;
      raw_text?: string;
    };
  } | null;
  ocr_processed: boolean;
  verification_notes: string | null;
}

interface UseDoctorApplicationsOptions {
  page: number;
  pageSize: number;
  status?: DoctorApprovalStatus;
  query?: string;
  enabled?: boolean;
}

export function useDoctorApplications({
  page,
  pageSize,
  status,
  query,
  enabled = true,
}: UseDoctorApplicationsOptions) {
  const normalizedQuery = query?.trim() || undefined;

  return useQuery({
    queryKey: [
      'admin',
      'doctor-applications',
      { page, pageSize, status, query: normalizedQuery },
    ],
    queryFn: async () => {
      const response = await api.get<DoctorApplication[]>('/admin/doctors', {
        params: {
          skip: (page - 1) * pageSize,
          limit: pageSize,
          status,
          q: normalizedQuery,
        },
      });
      return toPaginatedResult(response);
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}
