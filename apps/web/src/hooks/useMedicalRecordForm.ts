import { useState } from 'react';
import { useCreateDoctorRecord } from '@/hooks/mutations/useCreateDoctorRecord';
import { useCategories } from '@/hooks/queries/useCategories';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { VitalSignsFormData } from '@/components/clinical/VitalSignsForm';
import { OrderType, OrderUrgency, MedicalDiagnosis } from '@/types';

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

export function useMedicalRecordForm(patientId: string) {
  const { data: categories = [] } = useCategories();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const createRecord = useCreateDoctorRecord();

  // Core fields
  const [motive, setMotive] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [diagnoses, setDiagnoses] = useState<MedicalDiagnosis[]>([]);

  // Doctor-specific fields
  const [briefHistory, setBriefHistory] = useState('');
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [keyFinding, setKeyFinding] = useState('');
  const [clinicalImpression, setClinicalImpression] = useState('');
  const [actionsToday, setActionsToday] = useState<string[]>([]);
  const [planBullets, setPlanBullets] = useState<string[]>(['', '', '']);
  const [followUpInterval, setFollowUpInterval] = useState('');
  const [followUpWith, setFollowUpWith] = useState('');
  const [patientInstructions, setPatientInstructions] = useState('');

  // Prescriptions & Orders
  const [prescriptions, setPrescriptions] = useState<PrescriptionForm[]>([]);
  const [orders, setOrders] = useState<OrderForm[]>([]);

  // Vital Signs
  const [vitalSignsData, setVitalSignsData] = useState<VitalSignsFormData>({});

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
      await createRecord.mutateAsync(buildPayload());
      return true;
    } catch (error) {
      console.error('Error creating record:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
    // Derived
    hasRedFlags,
    selectedCategory,
    showDiagnosis,
    // Submit
    isSubmitting,
    handleSubmit,
  };
}
