import { keepPreviousData, useQuery } from '@tanstack/react-query';

import api, { toPaginatedResult } from '@/lib/api';
import type { PatientDocumentSummary, Prescription, VitalSigns } from '@/types';

interface PatientPageOptions {
  patientId: string;
  page: number;
  pageSize: number;
}

export function usePatientVitalSigns({ patientId, page, pageSize }: PatientPageOptions) {
  return useQuery({
    queryKey: ['patient-vital-signs', patientId, { page, pageSize }],
    queryFn: async () => {
      const response = await api.get<VitalSigns[]>(
        `/doctor/patients/${patientId}/vital-signs`,
        { params: { skip: (page - 1) * pageSize, limit: pageSize } },
      );
      return toPaginatedResult(response);
    },
    placeholderData: keepPreviousData,
    enabled: !!patientId,
  });
}

export function usePatientPrescriptions({ patientId, page, pageSize }: PatientPageOptions) {
  return useQuery({
    queryKey: ['patient-prescriptions', patientId, { page, pageSize }],
    queryFn: async () => {
      const response = await api.get<Prescription[]>(
        `/doctor/patients/${patientId}/prescriptions`,
        { params: { skip: (page - 1) * pageSize, limit: pageSize } },
      );
      return toPaginatedResult(response);
    },
    placeholderData: keepPreviousData,
    enabled: !!patientId,
  });
}

export function usePatientDocuments({ patientId, page, pageSize }: PatientPageOptions) {
  return useQuery({
    queryKey: ['patient-documents', patientId, { page, pageSize }],
    queryFn: async () => {
      const response = await api.get<PatientDocumentSummary[]>(
        `/doctor/patients/${patientId}/documents`,
        { params: { skip: (page - 1) * pageSize, limit: pageSize } },
      );
      return toPaginatedResult(response);
    },
    placeholderData: keepPreviousData,
    enabled: !!patientId,
  });
}
