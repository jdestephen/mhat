import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useCreateDoctorRecord } from '@/hooks/mutations/useCreateDoctorRecord';
import { useUpdateDoctorRecord } from '@/hooks/mutations/useUpdateDoctorRecord';
import { useCategories } from '@/hooks/queries/useCategories';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { VitalSignsFormData } from '@/components/clinical/VitalSignsForm';
import { OrderType, OrderUrgency, MedicalDiagnosis, MedicalRecord, DiagnosisStatus } from '@/types';

export interface PrescriptionForm {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: string;
  instructions: string;
}

export interface OrderForm {
  order_type: OrderType;
  description: string;
  urgency: OrderUrgency;
  reason: string;
  referral_to: string;
}

export const ACTIONS_OPTIONS = [
  'Consejería',
  'Receta',
  'Laboratorio',
  'Imagen',
  'Referencia',
  'Procedimiento',
  'Seguimiento',
];

export const FOLLOW_UP_OPTIONS = [
  { value: '24-48h', label: '24-48 horas' },
  { value: '7d', label: '1 semana' },
  { value: '14d', label: '2 semanas' },
  { value: '1m', label: '1 mes' },
  { value: '3m', label: '3 meses' },
  { value: 'PRN', label: 'Según necesidad' },
];

interface UseMedicalRecordFormOptions {
  /** Existing record data for edit mode */
  initialData?: MedicalRecord;
}

export function useMedicalRecordForm(patientId: string, options?: UseMedicalRecordFormOptions) {
  const { initialData } = options || {};
  const isEditMode = !!initialData;

  const { data: categories = [] } = useCategories();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const createRecord = useCreateDoctorRecord();
  const updateRecord = useUpdateDoctorRecord();

  // Core fields — pre-populated if editing
  const [motive, setMotive] = useState(initialData?.motive || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [categoryId, setCategoryId] = useState(
    initialData?.category_id?.toString() || initialData?.category?.id?.toString() || ''
  );
  const [diagnoses, setDiagnoses] = useState<MedicalDiagnosis[]>(
    initialData?.diagnoses?.map((d) => ({
      diagnosis: d.diagnosis,
      rank: d.rank,
      status: d.status,
      diagnosis_code: d.diagnosis_code ?? null,
      diagnosis_code_system: d.diagnosis_code_system ?? null,
      notes: d.notes ?? null,
    })) || []
  );

  // Doctor-specific fields
  const [briefHistory, setBriefHistory] = useState(initialData?.brief_history || '');
  const [redFlags, setRedFlags] = useState<string[]>(initialData?.red_flags || []);
  const [keyFinding, setKeyFinding] = useState(initialData?.key_finding || '');
  const [clinicalImpression, setClinicalImpression] = useState(initialData?.clinical_impression || '');
  const [actionsToday, setActionsToday] = useState<string[]>(initialData?.actions_today || []);
  const [planBullets, setPlanBullets] = useState<string[]>(
    initialData?.plan_bullets?.length ? initialData.plan_bullets : ['', '', '']
  );
  const [followUpInterval, setFollowUpInterval] = useState(initialData?.follow_up_interval || '');
  const [followUpWith, setFollowUpWith] = useState(initialData?.follow_up_with || '');
  const [patientInstructions, setPatientInstructions] = useState(initialData?.patient_instructions || '');

  // Prescriptions & Orders — pre-populated if editing
  const [prescriptions, setPrescriptions] = useState<PrescriptionForm[]>(
    initialData?.prescriptions?.map((p) => ({
      medication_name: p.medication_name,
      dosage: p.dosage || '',
      frequency: p.frequency || '',
      duration: p.duration || '',
      route: p.route || '',
      quantity: p.quantity || '',
      instructions: p.instructions || '',
    })) || []
  );
  const [orders, setOrders] = useState<OrderForm[]>(
    initialData?.clinical_orders?.map((o) => ({
      order_type: o.order_type,
      description: o.description,
      urgency: o.urgency,
      reason: o.reason || '',
      referral_to: o.referral_to || '',
    })) || []
  );

  // Vital Signs — pre-populated if editing
  const [vitalSignsData, setVitalSignsData] = useState<VitalSignsFormData>(
    initialData?.vital_signs
      ? {
          heart_rate: initialData.vital_signs.heart_rate ?? undefined,
          systolic_bp: initialData.vital_signs.systolic_bp ?? undefined,
          diastolic_bp: initialData.vital_signs.diastolic_bp ?? undefined,
          temperature: initialData.vital_signs.temperature ?? undefined,
          respiratory_rate: initialData.vital_signs.respiratory_rate ?? undefined,
          oxygen_saturation: initialData.vital_signs.oxygen_saturation ?? undefined,
          weight: initialData.vital_signs.weight ?? undefined,
          height: initialData.vital_signs.height ?? undefined,
          blood_glucose: initialData.vital_signs.blood_glucose ?? undefined,
          waist_circumference: initialData.vital_signs.waist_circumference ?? undefined,
          notes: initialData.vital_signs.notes ?? undefined,
        }
      : {}
  );
  const [recentVitalsInfo, setRecentVitalsInfo] = useState<string | null>(null);

  // Auto-load recent vital signs (<3h) when creating a new record
  useEffect(() => {
    if (isEditMode) return;
    api.get(`/doctor/patients/${patientId}/vital-signs/recent`)
      .then((res) => {
        if (res.data) {
          const v = res.data;
          setVitalSignsData({
            heart_rate: v.heart_rate ?? undefined,
            systolic_bp: v.systolic_bp ?? undefined,
            diastolic_bp: v.diastolic_bp ?? undefined,
            temperature: v.temperature ?? undefined,
            respiratory_rate: v.respiratory_rate ?? undefined,
            oxygen_saturation: v.oxygen_saturation ?? undefined,
            weight: v.weight ?? undefined,
            height: v.height ?? undefined,
            blood_glucose: v.blood_glucose ?? undefined,
            waist_circumference: v.waist_circumference ?? undefined,
            notes: v.notes ?? undefined,
          });
          const elapsed = Math.round(
            (Date.now() - new Date(v.measured_at).getTime()) / 60000
          );
          const timeStr = elapsed < 60
            ? `hace ${elapsed} min`
            : `hace ${Math.round(elapsed / 60)}h ${elapsed % 60}min`;
          setRecentVitalsInfo(`Signos vitales cargados automáticamente (${timeStr})`);
        }
      })
      .catch(() => {});
  }, [isEditMode, patientId]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived state
  const hasRedFlags = redFlags.length > 0;
  const selectedCategory = categories.find(c => c.id === parseInt(categoryId));
  const showDiagnosis = selectedCategory?.has_diagnosis ?? false;

  // Prescription helpers
  const addPrescription = () => {
    setPrescriptions(prev => [...prev, {
      medication_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      route: 'oral',
      quantity: '',
      instructions: '',
    }]);
  };

  const updatePrescription = (idx: number, field: keyof PrescriptionForm, value: string) => {
    setPrescriptions(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removePrescription = (idx: number) => {
    setPrescriptions(prev => prev.filter((_, i) => i !== idx));
  };

  // Order helpers
  const addOrder = () => {
    setOrders(prev => [...prev, {
      order_type: OrderType.LAB,
      description: '',
      urgency: OrderUrgency.ROUTINE,
      reason: '',
      referral_to: '',
    }]);
  };

  const updateOrder = (idx: number, field: keyof OrderForm, value: string) => {
    setOrders(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  };

  const removeOrder = (idx: number) => {
    setOrders(prev => prev.filter((_, i) => i !== idx));
  };

  // Build payload for API
  const buildPayload = () => ({
    patientId,
    motive,
    notes,
    category_id: categoryId ? parseInt(categoryId) : undefined,
    brief_history: briefHistory || undefined,
    has_red_flags: hasRedFlags,
    red_flags: redFlags.length > 0 ? redFlags : undefined,
    key_finding: keyFinding || undefined,
    clinical_impression: clinicalImpression || undefined,
    actions_today: actionsToday.length > 0 ? actionsToday : undefined,
    plan_bullets: planBullets.filter(b => b.trim()) || undefined,
    follow_up_interval: followUpInterval || undefined,
    follow_up_with: followUpWith || undefined,
    patient_instructions: patientInstructions || undefined,
    diagnoses: diagnoses.filter(d => d.diagnosis.trim()).map(d => ({
      diagnosis: d.diagnosis,
      diagnosis_code: d.diagnosis_code || undefined,
      diagnosis_code_system: d.diagnosis_code_system || undefined,
      rank: d.rank,
      status: d.status,
      notes: d.notes || undefined,
    })),
    prescriptions: prescriptions.filter(p => p.medication_name.trim()).map(p => ({
      medication_name: p.medication_name,
      dosage: p.dosage || undefined,
      frequency: p.frequency || undefined,
      duration: p.duration || undefined,
      route: p.route || undefined,
      quantity: p.quantity || undefined,
      instructions: p.instructions || undefined,
    })),
    orders: orders.filter(o => o.description.trim()).map(o => ({
      order_type: o.order_type,
      description: o.description,
      urgency: o.urgency,
      reason: o.reason || undefined,
      referral_to: o.referral_to || undefined,
    })),
    vital_signs: Object.values(vitalSignsData).some(v => v !== undefined && v !== '')
      ? vitalSignsData
      : undefined,
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isEditMode && initialData) {
        const payload = buildPayload();
        await updateRecord.mutateAsync({
          recordId: initialData.id,
          ...payload,
        });
      } else {
        await createRecord.mutateAsync(buildPayload());
      }
      return true;
    } catch (error) {
      console.error(isEditMode ? 'Error updating record:' : 'Error creating record:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    // Mode
    isEditMode,
    // Query data
    categories,
    user,
    userLoading,
    // Core fields
    motive, setMotive,
    notes, setNotes,
    categoryId, setCategoryId,
    diagnoses, setDiagnoses,
    // Doctor-specific
    briefHistory, setBriefHistory,
    redFlags, setRedFlags,
    keyFinding, setKeyFinding,
    clinicalImpression, setClinicalImpression,
    actionsToday, setActionsToday,
    planBullets, setPlanBullets,
    followUpInterval, setFollowUpInterval,
    followUpWith, setFollowUpWith,
    patientInstructions, setPatientInstructions,
    // Prescriptions
    prescriptions, addPrescription, updatePrescription, removePrescription,
    // Orders
    orders, addOrder, updateOrder, removeOrder,
    // Vital signs
    vitalSignsData, setVitalSignsData,
    recentVitalsInfo,
    // Derived
    hasRedFlags,
    selectedCategory,
    showDiagnosis,
    // Submit
    isSubmitting,
    handleSubmit,
  };
}
