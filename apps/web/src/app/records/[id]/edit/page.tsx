'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { InputWithVoice } from '@/components/ui/input-with-voice';
import { TextareaWithVoice } from '@/components/ui/textarea-with-voice';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Select } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { DiagnosisRank, DiagnosisStatus, MedicalDiagnosis, MedicalRecord, UserRole } from '@/types';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useCategories } from '@/hooks/queries/useCategories';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useUpdatePatientRecord } from '@/hooks/mutations/useUpdatePatientRecord';
import api from '@/lib/api';

export default function EditRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: recordId } = use(params);
  const router = useRouter();

  // Fetch existing record
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: categories = [] } = useCategories();
  const { data: user } = useCurrentUser();
  const updateRecord = useUpdatePatientRecord();

  // Form state
  const [motive, setMotive] = useState('');
  const [diagnoses, setDiagnoses] = useState<MedicalDiagnosis[]>([]);
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string>('');

  // Derived state
  const isPatient = user?.role === UserRole.PATIENT;
  const selectedCategory = categories.find(c => c.id === parseInt(categoryId));
  const showDiagnosis = selectedCategory?.has_diagnosis ?? false;

  // Fetch record on mount
  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await api.get(`/hx/${recordId}`);
        const data: MedicalRecord = res.data;
        setRecord(data);
        // Pre-populate form
        setMotive(data.motive || '');
        setNotes(data.notes || '');
        setCategoryId(data.category?.id?.toString() || data.category_id?.toString() || '');
        setDiagnoses(
          data.diagnoses?.map(d => ({
            diagnosis: d.diagnosis,
            rank: d.rank,
            status: d.status,
            diagnosis_code: d.diagnosis_code ?? null,
            diagnosis_code_system: d.diagnosis_code_system ?? null,
            notes: d.notes ?? null,
          })) || []
        );
      } catch (err) {
        console.error('Failed to load record', err);
        setError('No se pudo cargar el registro médico.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [recordId]);

  const addDiagnosis = () => {
    const nextRank = diagnoses.length + 1;
    setDiagnoses(prev => [...prev, {
      diagnosis: '',
      rank: nextRank <= 5 ? nextRank : DiagnosisRank.QUINARY,
      status: DiagnosisStatus.PROVISIONAL,
      diagnosis_code: null,
      diagnosis_code_system: null,
      notes: null,
    }]);
  };

  const removeDiagnosis = (idx: number) => {
    if (diagnoses.length === 1) return;
    setDiagnoses(prev => prev.filter((_, i) => i !== idx));
  };

  const updateDiagnosis = (idx: number, field: keyof MedicalDiagnosis, value: unknown) => {
    setDiagnoses(prev => prev.map((d, i) =>
      i === idx ? { ...d, [field]: value } : d
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionStatus('Guardando cambios...');

    try {
      await updateRecord.mutateAsync({
        recordId,
        motive,
        notes,
        category_id: categoryId ? parseInt(categoryId) : undefined,
        diagnoses: diagnoses
          .filter(d => d.diagnosis.trim())
          .map(d => ({
            diagnosis: d.diagnosis,
            diagnosis_code: d.diagnosis_code || undefined,
            diagnosis_code_system: d.diagnosis_code_system || undefined,
            rank: d.rank,
            status: d.status,
            notes: d.notes || undefined,
          })),
      });

      setSubmissionStatus('¡Listo! Redirigiendo...');
      setTimeout(() => router.push('/dashboard'), 500);
    } catch (err) {
      console.error(err);
      alert('Error al actualizar registro');
      setIsSubmitting(false);
      setSubmissionStatus('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="max-w-3xl mx-auto pb-12">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
          <p className="text-red-600">{error || 'Error al cargar el registro.'}</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-emerald-700 hover:underline">
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-emerald-950">Editar Registro Médico</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Main Details Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
          <h2 className="text-lg font-semibold text-emerald-900 mb-4 border-b pb-2">Detalles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Categoría</label>
              <Select
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                value={categoryId}
                onChange={(val) => setCategoryId(val.toString())}
                placeholder="Selecciona una categoría..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Motivo<span className="text-red-500">*</span></label>
              <InputWithVoice
                value={motive}
                onChange={(e) => setMotive(e.target.value)}
                placeholder="ej. Chequeo Anual, Consulta por Dolor de Rodilla"
                required
                onKeyDown={handleKeyDown}
                language="es-ES"
                mode="append"
              />
            </div>
            {/* Diagnoses Section */}
            {showDiagnosis ? (
              <div className="col-span-2 space-y-4">
                <label className="block text-sm font-medium">Diagnósticos</label>

                {isPatient ? (
                  <MultiSelect
                    endpoint="/catalog/conditions"
                    placeholder="Buscar y seleccionar condiciones..."
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
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Agregar hasta 5 diagnósticos</span>
                      <Button
                        type="button"
                        onClick={addDiagnosis}
                        variant="outline"
                        size="sm"
                        disabled={diagnoses.length >= 5}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar Diagnóstico
                      </Button>
                    </div>

                    {diagnoses.map((diag, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-2 cursor-move">
                            <GripVertical className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Diagnóstico {idx + 1}
                              </label>
                              <Autocomplete
                                endpoint="/catalog/conditions"
                                placeholder="Buscar diagnóstico (ej., Diabetes)"
                                value={diag.diagnosis}
                                onSelect={(opt) => {
                                  updateDiagnosis(idx, 'diagnosis', opt.display);
                                  updateDiagnosis(idx, 'diagnosis_code', opt.code);
                                  updateDiagnosis(idx, 'diagnosis_code_system', opt.code_system);
                                }}
                                onChange={(val) => {
                                  updateDiagnosis(idx, 'diagnosis', val);
                                  if (!val.trim()) {
                                    updateDiagnosis(idx, 'diagnosis_code', null);
                                    updateDiagnosis(idx, 'diagnosis_code_system', null);
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Notas (opcional)
                              </label>
                              <textarea
                                value={diag.notes || ''}
                                onChange={(e) => updateDiagnosis(idx, 'notes', e.target.value)}
                                placeholder="Información adicional sobre esta condición..."
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                rows={2}
                              />
                            </div>
                          </div>
                          {diagnoses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDiagnosis(idx)}
                              className="text-red-500 hover:text-red-700 mt-2"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ) : categoryId ? (
              <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-800">
                  Esta categoría no requiere diagnóstico específico
                </p>
              </div>
            ) : null}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Notas Generales de la Consulta</label>
              <TextareaWithVoice
                className="min-h-[120px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones generales del encuentro, plan de tratamiento..."
                language="es-ES"
                mode="append"
                rows={5}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          <div className="flex items-center gap-4">
            {submissionStatus && <span className="text-sm text-emerald-700 font-medium">{submissionStatus}</span>}
            <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
