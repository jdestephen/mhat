'use client';

import React, { useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/ui/input-with-voice';
import { TextareaWithVoice } from '@/components/ui/textarea-with-voice';
import { TagInput } from '@/components/ui/tag-input';
import { Select } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CatalogSearchSelect } from '@/components/ui/catalog-search-select';
import { VitalSignsForm } from '@/components/clinical/VitalSignsForm';
import {
  useMedicalRecordForm,
  ACTIONS_OPTIONS,
  FOLLOW_UP_OPTIONS,
} from '@/hooks/useMedicalRecordForm';
import {
  DOSAGE_QUANTITIES,
  DOSAGE_UNITS,
  FREQUENCY_OPTIONS,
  ROUTE_OPTIONS,
  DURATION_QUANTITIES,
  DURATION_UNITS,
} from '@/lib/prescriptionOptions';
import {
  UserRole,
  DiagnosisStatus,
  OrderType,
  OrderUrgency,
  MedicalRecord,
} from '@/types';

import {
  ArrowLeft,
  Plus,
  Trash2,
  HeartPulse,
  Stethoscope,
  ClipboardList,
  Pill,
  FileText,
  Eye,
  Check,
  AlertTriangle,
} from 'lucide-react';

const TABS = [
  { id: 'vitals', label: 'Signos Vitales', icon: HeartPulse },
  { id: 'eval', label: 'Evaluación', icon: Stethoscope },
  { id: 'plan', label: 'Plan', icon: ClipboardList },
  { id: 'rx', label: 'Recetas', icon: Pill },
  { id: 'orders', label: 'Órdenes', icon: FileText },
  { id: 'summary', label: 'Resumen', icon: Eye },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function NewTabbedRecordPage({
  params,
  initialData,
}: {
  params: Promise<{ id: string }>;
  initialData?: MedicalRecord;
}) {
  const { id: patientId } = use(params);
  const router = useRouter();
  const form = useMedicalRecordForm(patientId, { initialData });
  const [activeTab, setActiveTab] = useState<TabId>('vitals');

  // Redirect non-doctors
  if (!form.userLoading && form.user?.role !== UserRole.DOCTOR) {
    router.push('/dashboard');
    return null;
  }

  // Tab completion indicators
  const tabCompletion = useMemo(() => {
    const hasVitals = Object.values(form.vitalSignsData).some(v => v !== undefined && v !== '');
    const hasEval = !!(form.motive || form.briefHistory || form.keyFinding || form.clinicalImpression || form.redFlags.length > 0 || form.diagnoses.length > 0);
    const hasPlan = !!(form.planBullets.some(b => b.trim()) || form.followUpInterval || form.patientInstructions || form.actionsToday.length > 0);
    const hasRx = form.prescriptions.length > 0;
    const hasOrders = form.orders.length > 0;

    return {
      vitals: hasVitals,
      eval: hasEval,
      plan: hasPlan,
      rx: hasRx,
      orders: hasOrders,
      summary: false, // never shows completed
    };
  }, [form.vitalSignsData, form.motive, form.briefHistory, form.keyFinding, form.clinicalImpression, form.redFlags, form.diagnoses, form.planBullets, form.followUpInterval, form.patientInstructions, form.actionsToday, form.prescriptions, form.orders]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await form.handleSubmit();
    if (success) {
      router.push(`/doctor/patients/${patientId}`);
    } else {
      alert('Error al crear registro');
    }
  };

  const goToNextTab = () => {
    const currentIdx = TABS.findIndex(t => t.id === activeTab);
    if (currentIdx < TABS.length - 1) {
      setActiveTab(TABS[currentIdx + 1].id);
    }
  };

  const goToPrevTab = () => {
    const currentIdx = TABS.findIndex(t => t.id === activeTab);
    if (currentIdx > 0) {
      setActiveTab(TABS[currentIdx - 1].id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
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
          <h1 className="text-2xl font-bold text-emerald-950">
            {form.isEditMode ? 'Editar Registro Clínico' : 'Nuevo Registro Clínico'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleFormSubmit}>
        {/* Tab Bar */}
        <div className="bg-white rounded-t-lg border border-gray-200 border-b-0">
          <div className="flex items-center overflow-x-auto">
            {TABS.map((tab, idx) => {
              const isActive = activeTab === tab.id;
              const isCompleted = tabCompletion[tab.id];
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2
                    ${isActive
                      ? 'border-emerald-600 text-emerald-900 bg-emerald-50/40'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  {/* Step number with completion indicator */}
                  <span className={`
                    flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold shrink-0
                    ${isCompleted
                      ? 'bg-emerald-100 text-emerald-700'
                      : isActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }
                  `}>
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg border border-gray-200 min-h-[500px]">
          <div className="p-6">
            {/* === VITAL SIGNS TAB === */}
            {activeTab === 'vitals' && (
              <div>
                <h2 className="text-lg font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-rose-500" />
                  Signos Vitales
                </h2>
                <VitalSignsForm data={form.vitalSignsData} onChange={form.setVitalSignsData} />
              </div>
            )}

            {/* === EVALUATION TAB === */}
            {activeTab === 'eval' && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-emerald-900 mb-4">Evaluación Clínica</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2 flex flex-row gap-4">
                    <div className="w-1/3">
                      <label className="block text-sm font-medium mb-1">Categoría</label>
                      <Select
                        options={form.categories.map(c => ({ value: c.id, label: c.name }))}
                        value={form.categoryId}
                        onChange={(val) => form.setCategoryId(val.toString())}
                        placeholder="Seleccionar categoría..."
                      />
                    </div>
                    <div className="w-2/3">
                      <label className="block text-sm font-medium mb-1">
                        Motivo de Consulta <span className="text-red-500">*</span>
                      </label>
                      <InputWithVoice
                        value={form.motive}
                        onChange={(e) => form.setMotive(e.target.value)}
                        placeholder="Motivo principal de la visita"
                        required
                        language="es-ES"
                        mode="append"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Historia de la enfermedad
                      <span className="text-xs text-gray-400 ml-2">({form.briefHistory.length}/1100)</span>
                    </label>
                    <TextareaWithVoice
                      value={form.briefHistory}
                      onChange={(e) => form.setBriefHistory(e.target.value.slice(0, 1100))}
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
                      value={form.redFlags}
                      onChange={form.setRedFlags}
                      variant="red"
                      placeholder="Escriba un signo de alerta y presione Enter"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Examen Físico</label>
                    <InputWithVoice
                      value={form.keyFinding}
                      onChange={(e) => form.setKeyFinding(e.target.value)}
                      placeholder="Hallazgos relevantes del examen físico"
                      maxLength={250}
                      language="es-ES"
                      mode="append"
                    />
                  </div>

                  {/* Diagnoses */}
                  <div className="col-span-2 mb-1">
                    <label className="block text-sm font-medium mb-2">Diagnósticos</label>
                    <div className="space-y-3">
                      {form.diagnoses.map((d, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="flex-1">
                            <CatalogSearchSelect
                              endpoint="/catalog/conditions"
                              value={d.diagnosis ? { id: d.diagnosis_code || d.diagnosis, display: d.diagnosis, code: d.diagnosis_code ?? undefined, code_system: d.diagnosis_code_system ?? undefined } : null}
                              onChange={(item) => {
                                form.setDiagnoses((prev) =>
                                  prev.map((diag, i) =>
                                    i === idx
                                      ? { ...diag, diagnosis: item.display, diagnosis_code: item.code || null, diagnosis_code_system: item.code_system || null }
                                      : diag,
                                  ),
                                );
                              }}
                              placeholder="Buscar diagnóstico..."
                              disabled={!form.showDiagnosis}
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
                                form.setDiagnoses((prev) =>
                                  prev.map((diag, i) =>
                                    i === idx ? { ...diag, status: val as DiagnosisStatus } : diag,
                                  ),
                                );
                              }}
                              disabled={!form.showDiagnosis}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => form.setDiagnoses((prev) => prev.filter((_, i) => i !== idx))}
                            className="mt-2.5 text-gray-400 hover:text-red-500 transition-colors"
                            disabled={!form.showDiagnosis}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {form.diagnoses.length < 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={!form.showDiagnosis}
                          onClick={() =>
                            form.setDiagnoses((prev) => [
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
                      value={form.clinicalImpression}
                      onChange={(e) => form.setClinicalImpression(e.target.value)}
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
                            form.setActionsToday(prev =>
                              prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${form.actionsToday.includes(action)
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
            )}

            {/* === PLAN TAB === */}
            {activeTab === 'plan' && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-emerald-900 mb-4">Plan para el Paciente</h2>

                <div>
                  <label className="block text-sm font-medium mb-1">Puntos del Plan (máx 3)</label>
                  {form.planBullets.map((bullet, idx) => (
                    <InputWithVoice
                      key={idx}
                      value={bullet}
                      onChange={(e) => {
                        form.setPlanBullets(prev => prev.map((b, i) => i === idx ? e.target.value : b));
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
                      value={form.followUpInterval}
                      onChange={(val) => form.setFollowUpInterval(val.toString())}
                      placeholder="Intervalo de seguimiento"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Seguimiento Con</label>
                    <InputWithVoice
                      value={form.followUpWith}
                      onChange={(e) => form.setFollowUpWith(e.target.value)}
                      placeholder="Clínica o especialista"
                      language="es-ES"
                      mode="append"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Instrucciones para Paciente</label>
                  <TextareaWithVoice
                    value={form.patientInstructions}
                    onChange={(e) => form.setPatientInstructions(e.target.value.slice(0, 350))}
                    placeholder="Instrucciones que el paciente podrá ver..."
                    language="es-ES"
                    mode="append"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">{form.patientInstructions.length}/350 caracteres</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notas Adicionales</label>
                  <TextareaWithVoice
                    value={form.notes}
                    onChange={(e) => form.setNotes(e.target.value)}
                    placeholder="Notas internas adicionales..."
                    language="es-ES"
                    mode="append"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* === PRESCRIPTIONS TAB === */}
            {activeTab === 'rx' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                    <Pill className="h-5 w-5 text-emerald-600" />
                    Recetas ({form.prescriptions.length})
                  </h2>
                  <Button type="button" variant="outline" onClick={form.addPrescription} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                {form.prescriptions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Pill className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Sin recetas agregadas</p>
                    <Button type="button" variant="outline" onClick={form.addPrescription} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Receta
                    </Button>
                  </div>
                ) : (
                  form.prescriptions.map((rx, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg relative">
                      <button
                        type="button"
                        onClick={() => form.removePrescription(idx)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium mb-1">Medicamento</label>
                          <InputWithVoice
                            value={rx.medication_name}
                            onChange={(e) => form.updatePrescription(idx, 'medication_name', e.target.value)}
                            placeholder="Nombre del medicamento"
                            language="es-ES"
                            mode="append"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Dosis</label>
                          <div className="flex gap-2">
                            <SearchableSelect
                              options={DOSAGE_QUANTITIES.map((q) => ({ value: q, label: q }))}
                              value={rx.dosage.split(' ')[0] || ''}
                              onChange={(val) => {
                                const unit = rx.dosage.split(' ').slice(1).join(' ') || '';
                                form.updatePrescription(idx, 'dosage', unit ? `${val} ${unit}` : String(val));
                              }}
                              placeholder="Cant."
                              searchPlaceholder="Buscar..."
                              className="w-[45%]"
                            />
                            <SearchableSelect
                              options={DOSAGE_UNITS}
                              value={rx.dosage.split(' ').slice(1).join(' ') || ''}
                              onChange={(val) => {
                                const qty = rx.dosage.split(' ')[0] || '';
                                form.updatePrescription(idx, 'dosage', qty ? `${qty} ${val}` : String(val));
                              }}
                              placeholder="Unidad"
                              searchPlaceholder="Buscar unidad..."
                              className="w-[55%]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Frecuencia</label>
                          <SearchableSelect
                            groups={FREQUENCY_OPTIONS}
                            value={rx.frequency}
                            onChange={(val) => form.updatePrescription(idx, 'frequency', String(val))}
                            placeholder="Seleccionar frecuencia..."
                            searchPlaceholder="Buscar frecuencia..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Vía</label>
                          <SearchableSelect
                            options={ROUTE_OPTIONS}
                            value={rx.route}
                            onChange={(val) => form.updatePrescription(idx, 'route', String(val))}
                            placeholder="Seleccionar vía..."
                            searchPlaceholder="Buscar vía..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Duración</label>
                          <div className="flex gap-2">
                            <SearchableSelect
                              options={DURATION_QUANTITIES.map((q) => ({ value: q, label: q }))}
                              value={rx.duration.split(' ')[0] || ''}
                              onChange={(val) => {
                                const unit = rx.duration.split(' ').slice(1).join(' ') || '';
                                form.updatePrescription(idx, 'duration', unit ? `${val} ${unit}` : String(val));
                              }}
                              placeholder="Cant."
                              searchPlaceholder="Buscar..."
                              className="w-[40%]"
                            />
                            <SearchableSelect
                              options={DURATION_UNITS}
                              value={rx.duration.split(' ').slice(1).join(' ') || ''}
                              onChange={(val) => {
                                const qty = rx.duration.split(' ')[0] || '';
                                form.updatePrescription(idx, 'duration', qty ? `${qty} ${val}` : String(val));
                              }}
                              placeholder="Unidad"
                              searchPlaceholder="Buscar..."
                              className="w-[60%]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Cantidad</label>
                          <InputWithVoice
                            value={rx.quantity}
                            onChange={(e) => form.updatePrescription(idx, 'quantity', e.target.value)}
                            placeholder="ej. 21 tabletas"
                            language="es-ES"
                            mode="append"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium mb-1">Instrucciones</label>
                          <InputWithVoice
                            value={rx.instructions}
                            onChange={(e) => form.updatePrescription(idx, 'instructions', e.target.value)}
                            placeholder="Instrucciones adicionales"
                            language="es-ES"
                            mode="append"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* === ORDERS TAB === */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Órdenes ({form.orders.length})
                  </h2>
                  <Button type="button" variant="outline" onClick={form.addOrder} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                {form.orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Sin órdenes agregadas</p>
                    <Button type="button" variant="outline" onClick={form.addOrder} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Orden
                    </Button>
                  </div>
                ) : (
                  form.orders.map((order, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg relative">
                      <button
                        type="button"
                        onClick={() => form.removeOrder(idx)}
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
                            onChange={(val) => form.updateOrder(idx, 'order_type', val.toString())}
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
                            onChange={(val) => form.updateOrder(idx, 'urgency', val.toString())}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium mb-1">Descripción</label>
                          <InputWithVoice
                            value={order.description}
                            onChange={(e) => form.updateOrder(idx, 'description', e.target.value)}
                            placeholder="¿Qué se está ordenando?"
                            language="es-ES"
                            mode="append"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium mb-1">Razón</label>
                          <InputWithVoice
                            value={order.reason}
                            onChange={(e) => form.updateOrder(idx, 'reason', e.target.value)}
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
                              onChange={(e) => form.updateOrder(idx, 'referral_to', e.target.value)}
                              placeholder="Especialista o clínica"
                              language="es-ES"
                              mode="append"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* === SUMMARY TAB === */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Resumen del Registro
                </h2>

                {/* Completion overview */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {TABS.filter(t => t.id !== 'summary').map(tab => {
                    const isComplete = tabCompletion[tab.id];
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${
                          isComplete
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-gray-50 text-gray-400'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {tab.label}
                        {isComplete && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>

                {/* Summary details */}
                <div className="space-y-4">
                  {/* Vitals summary */}
                  {tabCompletion.vitals && (
                    <SummarySection title="Signos Vitales">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {form.vitalSignsData.heart_rate && <SummaryItem label="FC" value={`${form.vitalSignsData.heart_rate} lpm`} />}
                        {form.vitalSignsData.systolic_bp && <SummaryItem label="PA" value={`${form.vitalSignsData.systolic_bp}/${form.vitalSignsData.diastolic_bp || '?'} mmHg`} />}
                        {form.vitalSignsData.temperature && <SummaryItem label="Temp" value={`${form.vitalSignsData.temperature} °C`} />}
                        {form.vitalSignsData.respiratory_rate && <SummaryItem label="FR" value={`${form.vitalSignsData.respiratory_rate} rpm`} />}
                        {form.vitalSignsData.oxygen_saturation && <SummaryItem label="SpO₂" value={`${form.vitalSignsData.oxygen_saturation}%`} />}
                        {form.vitalSignsData.weight && <SummaryItem label="Peso" value={`${form.vitalSignsData.weight} kg`} />}
                        {form.vitalSignsData.height && <SummaryItem label="Talla" value={`${form.vitalSignsData.height} cm`} />}
                      </div>
                    </SummarySection>
                  )}

                  {/* Eval summary */}
                  {tabCompletion.eval && (
                    <SummarySection title="Evaluación Clínica">
                      {form.motive && <SummaryItem label="Motivo" value={form.motive} />}
                      {form.briefHistory && <SummaryItem label="Historia" value={form.briefHistory} />}
                      {form.redFlags.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-700">{form.redFlags.join(', ')}</span>
                        </div>
                      )}
                      {form.keyFinding && <SummaryItem label="Examen Físico" value={form.keyFinding} />}
                      {form.diagnoses.length > 0 && (
                        <SummaryItem
                          label="Diagnósticos"
                          value={form.diagnoses.map(d => `${d.diagnosis} (${d.status})`).join(', ')}
                        />
                      )}
                      {form.clinicalImpression && <SummaryItem label="Impresión Clínica" value={form.clinicalImpression} />}
                    </SummarySection>
                  )}

                  {/* Plan summary */}
                  {tabCompletion.plan && (
                    <SummarySection title="Plan">
                      {form.planBullets.filter(b => b.trim()).map((b, i) => (
                        <p key={i} className="text-sm text-gray-700">• {b}</p>
                      ))}
                      {form.followUpInterval && <SummaryItem label="Seguimiento" value={form.followUpInterval} />}
                      {form.patientInstructions && <SummaryItem label="Instrucciones" value={form.patientInstructions} />}
                    </SummarySection>
                  )}

                  {/* Rx summary */}
                  {tabCompletion.rx && (
                    <SummarySection title={`Recetas (${form.prescriptions.length})`}>
                      {form.prescriptions.map((rx, i) => (
                        <p key={i} className="text-sm text-gray-700">
                          • <span className="font-medium">{rx.medication_name}</span>
                          {rx.dosage && ` — ${rx.dosage}`}
                          {rx.frequency && `, ${rx.frequency}`}
                        </p>
                      ))}
                    </SummarySection>
                  )}

                  {/* Orders summary */}
                  {tabCompletion.orders && (
                    <SummarySection title={`Órdenes (${form.orders.length})`}>
                      {form.orders.map((o, i) => (
                        <p key={i} className="text-sm text-gray-700">
                          • <span className="font-medium">{o.description}</span> ({o.order_type})
                        </p>
                      ))}
                    </SummarySection>
                  )}

                  {/* Empty state */}
                  {!tabCompletion.vitals && !tabCompletion.eval && !tabCompletion.plan && !tabCompletion.rx && !tabCompletion.orders && (
                    <div className="text-center py-12 text-gray-400">
                      <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>Completa las secciones para ver el resumen aquí</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-b-lg px-6 py-4 flex items-center justify-between mt-0 shadow-lg">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            {activeTab !== 'vitals' && (
              <Button type="button" variant="ghost" onClick={goToPrevTab}>
                ← Anterior
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeTab !== 'summary' && (
              <Button type="button" variant="ghost" onClick={goToNextTab}>
                Siguiente →
              </Button>
            )}
            <Button type="submit" disabled={form.isSubmitting} className="min-w-[150px]">
              {form.isSubmitting ? 'Guardando...' : form.isEditMode ? 'Guardar Cambios' : 'Guardar Registro'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// --- Helper components ---

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-100 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-emerald-800 mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-gray-500">{label}: </span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}
