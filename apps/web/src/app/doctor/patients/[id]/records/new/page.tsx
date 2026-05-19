'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useCreateDoctorRecord } from '@/hooks/mutations/useCreateDoctorRecord';
import { useUpdateDoctorRecord } from '@/hooks/mutations/useUpdateDoctorRecord';
import { useCategories } from '@/hooks/queries/useCategories';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useMyPatients } from '@/hooks/queries/useMyPatients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/ui/input-with-voice';
import { TextareaWithVoice } from '@/components/ui/textarea-with-voice';
import { TagInput } from '@/components/ui/tag-input';
import { Select } from '@/components/ui/select';
import { Combobox } from '@/components/ui/Combobox';
import { VitalSignsForm, VitalSignsFormData } from '@/components/clinical/VitalSignsForm';
import { PrescriptionForm, PrescriptionFormData } from '@/components/clinical/PrescriptionForm';
import { PatientInfoBanner } from '@/components/doctor/PatientInfoBanner';
import { 
  UserRole, 
  DiagnosisStatus, 
  OrderType, 
  OrderUrgency,
  MedicalDiagnosis,
  MedicalRecord,
} from '@/types';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  AlertTriangle,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  XIcon,
  CalendarDays,
} from 'lucide-react';


interface OrderForm {
  order_type: OrderType;
  description: string;
  urgency: OrderUrgency;
  reason: string;
  referral_to: string;
}



const ACTIONS_OPTIONS = [
  'Consejería',
  'Receta',
  'Laboratorio',
  'Imagen',
  'Referencia',
  'Procedimiento',
  'Seguimiento',
];

const FOLLOW_UP_OPTIONS = [
  { value: '24-48h', label: '24-48 horas' },
  { value: '7d', label: '1 semana' },
  { value: '14d', label: '2 semanas' },
  { value: '1m', label: '1 mes' },
  { value: '3m', label: '3 meses' },
  { value: 'PRN', label: 'Según necesidad' },
];

export default function NewDoctorRecordPage({
  params,
  initialData,
}: {
  params: Promise<{ id: string }>;
  initialData?: MedicalRecord;
}) {
  const { id: patientId } = use(params);
  const router = useRouter();
  const { data: categories = [] } = useCategories();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: patients = [] } = useMyPatients();
  const createRecord = useCreateDoctorRecord();
  const updateRecord = useUpdateDoctorRecord();
  const isEditMode = !!initialData;

  const patient = patients.find((p) => p.patient_id === patientId);

  // Core fields — pre-populated if editing
  const [motive, setMotive] = useState(initialData?.motive || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [categoryId, setCategoryId] = useState(
    initialData?.category_id?.toString() || initialData?.category?.id?.toString() || ''
  );
  const [recordDate, setRecordDate] = useState(
    initialData?.record_date || new Date().toISOString().split('T')[0]
  );
  const [diagnoses, setDiagnoses] = useState<MedicalDiagnosis[]>(
    initialData?.diagnoses?.map(d => ({
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
  const [prescriptions, setPrescriptions] = useState<PrescriptionFormData[]>(
    initialData?.prescriptions?.map(p => ({
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
    initialData?.clinical_orders?.map(o => ({
      order_type: o.order_type,
      description: o.description,
      urgency: o.urgency,
      reason: o.reason || '',
      referral_to: o.referral_to || '',
    })) || []
  );
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClinicalAssessment, setShowClinicalAssessment] = useState(true);
  const [showPlan, setShowPlan] = useState(true);
  const [showOrders, setShowOrders] = useState(
    initialData?.clinical_orders ? initialData.clinical_orders.length > 0 : false
  );
  const [showVitalSigns, setShowVitalSigns] = useState(false);
  
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
  const [recentVitalSignsId, setRecentVitalSignsId] = useState<string | null>(null);

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
          setRecentVitalSignsId(v.id);
          setShowVitalSigns(true);
          // Calculate time elapsed
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

  // Derived state
  const hasRedFlags = redFlags.length > 0;

  // Redirect non-doctors
  if (!userLoading && user?.role !== UserRole.DOCTOR) {
    router.push('/dashboard');
    return null;
  }

  const selectedCategory = categories.find(c => c.id === parseInt(categoryId));
  const showDiagnosis = selectedCategory?.has_diagnosis ?? false;


  const addOrder = () => {
    setOrders([...orders, {
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

  const buildPayload = () => ({
    patientId,
    motive,
    record_date: recordDate,
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
    existing_vital_signs_id: recentVitalSignsId || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = buildPayload();
      if (isEditMode && initialData) {
        await updateRecord.mutateAsync({
          recordId: initialData.id,
          ...payload,
        });
      } else {
        await createRecord.mutateAsync(payload);
      }

      router.push(`/doctor/patients/${patientId}`);
    } catch (error) {
      console.error(isEditMode ? 'Error updating record:' : 'Error creating record:', error);
      alert(isEditMode ? 'Error al actualizar registro' : 'Error al crear registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col justify-start lg:pr-30">
        <div className="flex justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-emerald-950">
              {isEditMode ? 'Editar Registro Clínico' : 'Nuevo Registro Clínico'}
            </h1>
          </div>  
          <div>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-3 text-gray-600 hover:text-gray-900 gap-2"
            >
              <XIcon className="h-8 w-8" />
            </Button>
          </div>
        </div>
        {patient && (
          <div className="mb-5">
            <PatientInfoBanner
              patient={patient}
              variant="extended"
              layout="row"
              collapsible
              defaultCollapsed
            />
          </div>
        )}
      </div>
      <div className="flex flex-col mt-0 ps-0 lg:pr-30">
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
          className="space-y-6"
        >
          {/* Vital Signs Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowVitalSigns(!showVitalSigns)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-t-lg h-auto"
            >
              <span className="flex items-center gap-2 text-lg font-semibold text-emerald-900">
                <HeartPulse className="h-5 w-5 text-rose-500" />
                Signos Vitales
              </span>
              {showVitalSigns ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>

            {showVitalSigns && (
              <div className="p-6 border-t border-gray-100">
                {recentVitalsInfo && (
                  <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700 flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 flex-shrink-0" />
                    {recentVitalsInfo}
                  </div>
                )}
                <VitalSignsForm data={vitalSignsData} onChange={setVitalSignsData} hideDateTimePicker />
              </div>
            )}
          </div>
          
          {/* Basic Info Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-emerald-900 mb-4 border-b pb-2">
              Evaluación Clínica
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-row gap-4">
                <div className="w-1/3">
                  <label className="block text-sm font-medium mb-1">Categoría</label>
                  <Select
                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                    value={categoryId}
                    onChange={(val) => setCategoryId(val.toString())}
                    placeholder="Seleccionar categoría..."
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">
                    Motivo de Consulta <span className="text-red-500">*</span>
                  </label>
                  <InputWithVoice
                    value={motive}
                    onChange={(e) => setMotive(e.target.value)}
                    placeholder="Motivo principal de la visita"
                    required
                    language="es-ES"
                    mode="append"
                  />
                </div>

                <div className="w-44">
                  <label className="block text-sm font-medium mb-1">
                    <CalendarDays className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                    Fecha
                  </label>
                  <Input
                    type="date"
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>  

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Historia de la enfermedad
                  <span className="text-xs text-gray-400 ml-2">({briefHistory.length}/1100)</span>
                </label>
                <TextareaWithVoice
                  value={briefHistory}
                  onChange={(e) => setBriefHistory(e.target.value.slice(0, 1100))}
                  placeholder="Contexto clínico relevante (max 1,100 caracteres)"
                  language="es-ES"
                  mode="append"
                />
              </div>

              <div className="col-span-2"> 
                <label className="block text-sm font-medium mb-1 text-red-800">
                  Signos de Alerta
                </label>
                <TagInput
                  value={redFlags}
                  onChange={setRedFlags}
                  variant="red"
                  placeholder="Escriba un signo de alerta y presione Enter (ej: Dolor en el pecho, Visión borrosa, Fatiga extrema, etc.)"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Examen Físico</label>
                <InputWithVoice
                  value={keyFinding}
                  onChange={(e) => setKeyFinding(e.target.value)}
                  placeholder="Hallazgos relevantes del examen físico"
                  maxLength={250}
                  language="es-ES"
                  mode="append"
                />
              </div>

              {/* Diagnoses (if category has diagnosis) */}
              <div className="col-span-2 mb-1">
                <label className="block text-sm font-medium mb-2">Diagnósticos</label>
                <div className="space-y-3">
                  {diagnoses.map((d, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Combobox
                          endpoint="/catalog/conditions"
                          value={d.diagnosis ? d.diagnosis : undefined}
                          onValueChange={(val, option) => {
                            setDiagnoses((prev) =>
                              prev.map((diag, i) =>
                                i === idx
                                  ? {
                                      ...diag,
                                      diagnosis: val,
                                      diagnosis_code: option?.code || null,
                                      diagnosis_code_system: option?.code_system || null,
                                    }
                                  : diag,
                              ),
                            );
                          }}
                          placeholder="Buscar diagnóstico..."
                          disabled={!showDiagnosis}
                          creatable
                        />
                      </div>
                      <div className="w-[160px]">
                        <Select
                          options={[
                            { value: DiagnosisStatus.PROVISIONAL, label: 'Provisional' },
                            { value: DiagnosisStatus.CONFIRMED, label: 'Confirmado' },
                            { value: DiagnosisStatus.DIFFERENTIAL, label: 'Diferencial' },
                            { value: DiagnosisStatus.REFUTED, label: 'Refutado' },
                          ]}
                          value={d.status}
                          onChange={(val) => {
                            setDiagnoses((prev) =>
                              prev.map((diag, i) =>
                                i === idx ? { ...diag, status: val as DiagnosisStatus } : diag,
                              ),
                            );
                          }}
                          disabled={!showDiagnosis}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="danger-ghost"
                        size="icon"
                        onClick={() => setDiagnoses((prev) => prev.filter((_, i) => i !== idx))}
                        className="mt-2.5 h-8 w-8"
                        disabled={!showDiagnosis}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {diagnoses.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={!showDiagnosis}
                      onClick={() =>
                        setDiagnoses((prev) => [
                          ...prev,
                          {
                            diagnosis: '',
                            rank: prev.length + 1,
                            status: DiagnosisStatus.PROVISIONAL,
                            diagnosis_code: null,
                            diagnosis_code_system: null,
                            notes: null,
                          },
                        ])
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Diagnóstico
                    </Button>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Impresión Clínica</label>
                <TextareaWithVoice
                  value={clinicalImpression}
                  onChange={(e) => setClinicalImpression(e.target.value)}
                  placeholder="Interpretación médica del cuadro clínico"
                  language="es-ES"
                  mode="append"
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Acciones de Hoy</label>
                <div className="flex flex-wrap gap-2">
                  {ACTIONS_OPTIONS.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => {
                        setActionsToday(prev =>
                          prev.includes(action)
                            ? prev.filter(a => a !== action)
                            : [...prev, action]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${actionsToday.includes(action)
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Plan Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowPlan(!showPlan)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-t-lg h-auto"
            >
              <span className="text-lg font-semibold text-emerald-900">Plan para el paciente</span>
              {showPlan ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>

            {showPlan && (
              <div className="p-6 border-t border-gray-100 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Puntos del Plan (máx 3)</label>
                  {planBullets.map((bullet, idx) => (
                    <InputWithVoice
                      key={idx}
                      value={bullet}
                      onChange={(e) => {
                        setPlanBullets(prev => prev.map((b, i) => i === idx ? e.target.value : b));
                      }}
                      placeholder="Ej: Realizar reposo y evitar esfuerzo físico"
                      className="mb-2"
                      language="es-ES"
                      mode="append"
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Seguimiento</label>
                    <Select
                      options={FOLLOW_UP_OPTIONS}
                      value={followUpInterval}
                      onChange={(val) => setFollowUpInterval(val.toString())}
                      placeholder="Intervalo de seguimiento"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Seguimiento Con</label>
                    <InputWithVoice
                      value={followUpWith}
                      onChange={(e) => setFollowUpWith(e.target.value)}
                      placeholder="Clínica o especialista"
                      language="es-ES"
                      mode="append"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Instrucciones para Paciente</label>
                  <TextareaWithVoice
                    value={patientInstructions}
                    onChange={(e) => setPatientInstructions(e.target.value.slice(0, 350))}
                    placeholder="Instrucciones que el paciente podrá ver..."
                    language="es-ES"
                    mode="append"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">{patientInstructions.length}/350 caracteres</p>
                </div>
              </div>
            )}
          </div>

          {/* Prescriptions Accordion */}
          {/* Prescriptions Accordion */}
          <PrescriptionForm
            prescriptions={prescriptions}
            onChange={setPrescriptions}
            defaultOpen={initialData?.prescriptions ? initialData.prescriptions.length > 0 : false}
          />

          {/* Orders Accordion */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowOrders(!showOrders)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 h-auto"
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Órdenes ({orders.length})</span>
              </div>
              {showOrders ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>

            {showOrders && (
              <div className="p-4 border-t border-gray-100 space-y-4">
                {orders.map((order, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg relative">
                    <Button
                      type="button"
                      variant="danger-ghost"
                      size="icon"
                      onClick={() => removeOrder(idx)}
                      className="absolute top-2 right-2 h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Tipo</label>
                        <Select
                          options={[
                            { value: OrderType.LAB, label: 'Laboratorio' },
                            { value: OrderType.IMAGING, label: 'Imagen' },
                            { value: OrderType.REFERRAL, label: 'Referencia' },
                            { value: OrderType.PROCEDURE, label: 'Procedimiento' },
                          ]}
                          value={order.order_type}
                          onChange={(val) => updateOrder(idx, 'order_type', val.toString())}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Urgencia</label>
                        <Select
                          options={[
                            { value: OrderUrgency.ROUTINE, label: 'Rutina' },
                            { value: OrderUrgency.URGENT, label: 'Urgente' },
                            { value: OrderUrgency.STAT, label: 'STAT' },
                          ]}
                          value={order.urgency}
                          onChange={(val) => updateOrder(idx, 'urgency', val.toString())}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1">Descripción</label>
                        <InputWithVoice
                          value={order.description}
                          onChange={(e) => updateOrder(idx, 'description', e.target.value)}
                          placeholder="¿Qué se está ordenando?"
                          language="es-ES"
                          mode="append"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1">Razón</label>
                        <InputWithVoice
                          value={order.reason}
                          onChange={(e) => updateOrder(idx, 'reason', e.target.value)}
                          placeholder="Justificación clínica"
                          language="es-ES"
                          mode="append"
                        />
                      </div>
                      {order.order_type === OrderType.REFERRAL && (
                        <div className="col-span-2">
                          <label className="block text-xs font-medium mb-1">Referir A</label>
                          <InputWithVoice
                            value={order.referral_to}
                            onChange={(e) => updateOrder(idx, 'referral_to', e.target.value)}
                            placeholder="Especialista o clínica"
                            language="es-ES"
                            mode="append"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addOrder} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Orden
                </Button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-emerald-900 mb-4 border-b pb-2">
              Notas Adicionales
            </h2>
            <TextareaWithVoice
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas adicionales..."
              language="es-ES"
              mode="append"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
              {isSubmitting ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Guardar Registro'}
            </Button>
          </div>
        </form>
      </div>        
    </div>
  );
}
