import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ClaimRequestSummary {
  id: string;
  user_id: string;
  patient_profile_id: string;
  status: string;
  requested_at: string;
  resolved_at: string | null;
  patient_name: string;
  patient_email: string | null;
  requesting_user_name: string | null;
  requesting_user_email: string | null;
  doctor_name: string | null;
}

export function usePatientClaimRequests() {
  return useQuery<ClaimRequestSummary[]>({
    queryKey: ['patient', 'claim-requests'],
    queryFn: async () => {
      const res = await api.get<ClaimRequestSummary[]>('/patient/claim-requests');
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useDoctorClaimRequests() {
  return useQuery<ClaimRequestSummary[]>({
    queryKey: ['doctor', 'claim-requests'],
    queryFn: async () => {
      const res = await api.get<ClaimRequestSummary[]>('/doctor/claim-requests');
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });
}
