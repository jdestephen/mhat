import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DoctorMedicalRecord, OrderType, OrderUrgency, DiagnosisStatus } from '@/types';

interface PrescriptionInput {
  medication_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  quantity?: string;
  instructions?: string;
}

interface OrderInput {
  order_type: OrderType;
  description: string;
  urgency?: OrderUrgency;
  reason?: string;
  referral_to?: string;
}

interface DiagnosisInput {
  diagnosis: string;
  diagnosis_code?: string;
  diagnosis_code_system?: string;
  rank: number;
  status: DiagnosisStatus;
  notes?: string;
}

export interface CreateDoctorRecordPayload {
  patientId: string;
  motive: string;
  notes?: string;
  category_id?: number;
  tags?: string[];
  // Doctor-specific fields
  brief_history?: string;
  has_red_flags?: boolean;
  red_flags?: string[];
  key_finding?: string;
  clinical_impression?: string;
  actions_today?: string[];
  plan_bullets?: string[];
  follow_up_interval?: string;
  follow_up_with?: string;
  patient_instructions?: string;
  // Nested data
  diagnoses?: DiagnosisInput[];
  prescriptions?: PrescriptionInput[];
  orders?: OrderInput[];
}

export function useCreateDoctorRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, ...payload }: CreateDoctorRecordPayload) => {
      const res = await api.post<DoctorMedicalRecord>(`/doctor/patients/${patientId}/records`, payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'patients', variables.patientId, 'records'] });
    },
  });
}
