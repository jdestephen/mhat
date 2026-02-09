'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateDoctorRecord } from '@/hooks/mutations/useCreateDoctorRecord';
import { useCategories } from '@/hooks/queries/useCategories';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/ui/input-with-voice';
import { TextareaWithVoice } from '@/components/ui/textarea-with-voice';
import { TagInput } from '@/components/ui/tag-input';
import { Select } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { 
  UserRole, 
  DiagnosisStatus, 
  OrderType, 
  OrderUrgency,
  MedicalDiagnosis 
} from '@/types';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  AlertTriangle,
  Pill,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface PrescriptionForm {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: string;
  instructions: string;
}

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

export default function NewDoctorRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = use(params);
  const router = useRouter();
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
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClinicalAssessment, setShowClinicalAssessment] = useState(true);
  const [showPlan, setShowPlan] = useState(true);
  const [showPrescriptions, setShowPrescriptions] = useState(false);
  const [showOrders, setShowOrders] = useState(false);

  // Derived state
  const hasRedFlags = redFlags.length > 0;

  // Redirect non-doctors
  if (!userLoading && user?.role !== UserRole.DOCTOR) {
    router.push('/dashboard');
    return null;
  }

  const selectedCategory = categories.find(c => c.id === parseInt(categoryId));
  const showDiagnosis = selectedCategory?.has_diagnosis ?? false;

  const addPrescription = () => {
    setPrescriptions([...prescriptions, {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createRecord.mutateAsync({
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
      });

      router.push(`/doctor/patients/${patientId}`);
    } catch (error) {
      console.error('Error creating record:', error);
      alert('Error al crear registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col justify-start">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 hover:cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </button>
        </div>
        <div className="mb-5">
          <h1 className="text-3xl font-bold text-emerald-950">Nuevo Registro Clínico</h1>
        </div>
      </div>
      <div className="flex flex-col mt-0 ps-0 pr-30">
        <form onSubmit={handleSubmit} className="space-y-6">
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

                <div className="w-2/3">
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
              </div>  

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Historia Breve
                  <span className="text-xs text-gray-400 ml-2">({briefHistory.length}/280)</span>
                </label>
                <TextareaWithVoice
                  value={briefHistory}
                  onChange={(e) => setBriefHistory(e.target.value.slice(0, 280))}
                  placeholder="Contexto clínico relevante (max 280 caracteres)"
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
                  placeholder="Escriba una alerta y presione Enter..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Hallazgo Clave</label>
                <InputWithVoice
                  value={keyFinding}
                  onChange={(e) => setKeyFinding(e.target.value)}
                  placeholder="Principal hallazgo del examen físico"
                  maxLength={250}
                  language="es-ES"
                  mode="append"
                />
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

              {/* Diagnoses (if category has diagnosis) */}
              {showDiagnosis && (
                <div className="col-span-2 mb-1">
                  <label className="block text-sm font-medium mb-1">Diagnósticos</label>
                  <MultiSelect
                    endpoint="/catalog/conditions"
                    placeholder="Buscar y seleccionar diagnósticos..."
                    selectedItems={diagnoses.map(d => ({
                      id: d.diagnosis_code || d.diagnosis,
                      display: d.diagnosis,
                      code: d.diagnosis_code,
                      code_system: d.diagnosis_code_system,
                    }))}
                    onItemsChange={(items) => {
                      setDiagnoses(items.map((item, idx) => ({
                        diagnosis: item.display,
                        rank: idx + 1,
                        status: DiagnosisStatus.PROVISIONAL,
                        diagnosis_code: item.code || null,
                        diagnosis_code_system: item.code_system || null,
                        notes: null,
                      })));
                    }}
                    maxItems={5}
                  />
                </div>
              )}

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
            <button
              type="button"
              onClick={() => setShowPlan(!showPlan)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-t-lg"
            >
              <span className="text-lg font-semibold text-emerald-900">Plan</span>
              {showPlan ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>

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
                      placeholder={`Punto ${idx + 1}`}
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <button
              type="button"
              onClick={() => setShowPrescriptions(!showPrescriptions)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <Pill className="h-5 w-5 text-emerald-600" />
                <span className="font-medium">Recetas ({prescriptions.length})</span>
              </div>
              {showPrescriptions ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>

            {showPrescriptions && (
              <div className="p-4 border-t border-gray-100 space-y-4">
                {prescriptions.map((rx, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg relative">
                    <button
                      type="button"
                      onClick={() => removePrescription(idx)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1">Medicamento</label>
                        <InputWithVoice
                          value={rx.medication_name}
                          onChange={(e) => updatePrescription(idx, 'medication_name', e.target.value)}
                          placeholder="Nombre del medicamento"
                          language="es-ES"
                          mode="append"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Dosis</label>
                        <InputWithVoice
                          value={rx.dosage}
                          onChange={(e) => updatePrescription(idx, 'dosage', e.target.value)}
                          placeholder="ej. 500mg"
                          language="es-ES"
                          mode="append"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Frecuencia</label>
                        <InputWithVoice
                          value={rx.frequency}
                          onChange={(e) => updatePrescription(idx, 'frequency', e.target.value)}
                          placeholder="ej. cada 8 horas"
                          language="es-ES"
                          mode="append"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Duración</label>
                        <InputWithVoice
                          value={rx.duration}
                          onChange={(e) => updatePrescription(idx, 'duration', e.target.value)}
                          placeholder="ej. 7 días"
                          language="es-ES"
                          mode="append"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Cantidad</label>
                        <InputWithVoice
                          value={rx.quantity}
                          onChange={(e) => updatePrescription(idx, 'quantity', e.target.value)}
                          placeholder="ej. 21 tabletas"
                          language="es-ES"
                          mode="append"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1">Instrucciones</label>
                        <InputWithVoice
                          value={rx.instructions}
                          onChange={(e) => updatePrescription(idx, 'instructions', e.target.value)}
                          placeholder="Instrucciones adicionales"
                          language="es-ES"
                          mode="append"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addPrescription} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Receta
                </Button>
              </div>
            )}
          </div>

          {/* Orders Accordion */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <button
              type="button"
              onClick={() => setShowOrders(!showOrders)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Órdenes ({orders.length})</span>
              </div>
              {showOrders ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>

            {showOrders && (
              <div className="p-4 border-t border-gray-100 space-y-4">
                {orders.map((order, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg relative">
                    <button
                      type="button"
                      onClick={() => removeOrder(idx)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

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
              {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
            </Button>
          </div>
        </form>
      </div>        
    </div>
  );
}
