import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api, { toPaginatedResult } from '@/lib/api';
import { DoctorMedicalRecord } from '@/types';

export function usePatientRecords(patientId: string | undefined) {
  return useQuery({
    queryKey: ['doctor', 'patients', patientId, 'records'],
    queryFn: async () => {
      const res = await api.get<DoctorMedicalRecord[]>(`/doctor/patients/${patientId}/records`);
      return res.data;
    },
    enabled: !!patientId,
  });
}

interface UsePaginatedPatientRecordsOptions {
  patientId: string | undefined;
  page: number;
  pageSize: number;
  categoryId?: number;
}

export function usePaginatedPatientRecords({
  patientId,
  page,
  pageSize,
  categoryId,
}: UsePaginatedPatientRecordsOptions) {
  return useQuery({
    queryKey: [
      'doctor',
      'patients',
      patientId,
      'records',
      { page, pageSize, categoryId, includeDocuments: false },
    ],
    queryFn: async () => {
      const response = await api.get<DoctorMedicalRecord[]>(
        `/doctor/patients/${patientId}/records`,
        {
          params: {
            skip: (page - 1) * pageSize,
            limit: pageSize,
            category_id: categoryId,
            include_documents: false,
          },
        },
      );
      return toPaginatedResult(response);
    },
    placeholderData: keepPreviousData,
    enabled: !!patientId,
  });
}

export function usePatientRecord(recordId: string | undefined) {
  return useQuery({
    queryKey: ['doctor', 'records', recordId],
    queryFn: async () => {
      const response = await api.get<DoctorMedicalRecord>(`/doctor/records/${recordId}`);
      return response.data;
    },
    enabled: !!recordId,
  });
}
