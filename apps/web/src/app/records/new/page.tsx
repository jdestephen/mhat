'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/ui/input-with-voice';
import { TextareaWithVoice } from '@/components/ui/textarea-with-voice';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Select, SelectOption } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { DiagnosisRank, DiagnosisStatus, MedicalDiagnosis, UserRole } from '@/types';
import { UploadCloud, FileText, X, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useCategories } from '@/hooks/queries/useCategories';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useCreateMedicalRecord } from '@/hooks/mutations/useCreateMedicalRecord';
import { useUploadDocument } from '@/hooks/mutations/useUploadDocument';


export default function NewRecordPage() {
  const router = useRouter();
  
  // React Query hooks
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const createRecord = useCreateMedicalRecord();
  const uploadDocument = useUploadDocument();
  
  // Record Details
  const [motive, setMotive] = useState('');
  const [diagnoses, setDiagnoses] = useState<MedicalDiagnosis[]>([]);
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  
  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Uploads
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string>('');
  
  // Derived state
  const isPatient = user?.role === UserRole.PATIENT;
  const selectedCategory = categories.find(c => c.id === parseInt(categoryId));
  const showDiagnosis = selectedCategory?.has_diagnosis ?? false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removeFile = (idx: number) => {
      setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const val = tagInput.trim();
          if (val && !tags.includes(val)) {
              setTags(prev => [...prev, val]);
              setTagInput('');
          }
      } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
          setTags(prev => prev.slice(0, -1));
      }
  };

  const removeTag = (idx: number) => {
      setTags(prev => prev.filter((_, i) => i !== idx));
  };

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

  const updateDiagnosis = (idx: number, field: keyof MedicalDiagnosis, value: any) => {
    setDiagnoses(prev => prev.map((d, i) => 
      i === idx ? { ...d, [field]: value } : d
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionStatus('Creando registro...');

    try {
      // 1. Create Record using mutation hook
      const payload: any = {
        motive,
        notes,
        tags,
        diagnoses: diagnoses
          .filter(d => d.diagnosis.trim())
          .map(d => ({
            diagnosis: d.diagnosis,
            diagnosis_code: d.diagnosis_code || undefined,
            diagnosis_code_system: d.diagnosis_code_system || undefined,
            rank: d.rank,
            status: d.status,
            notes: d.notes || undefined,
          }))
      };
      if (categoryId) payload.category_id = parseInt(categoryId);

      const record = await createRecord.mutateAsync(payload);
      const recordId = record.id;

      // 2. Upload Files using mutation hook
      if (files.length > 0) {
          setSubmissionStatus('Subiendo archivos...');
          
          await Promise.all(files.map(async (file) => {
             try {
                await uploadDocument.mutateAsync({
                  recordId,
                  file,
                  onProgress: (percent) => {
                    setUploadProgress(prev => ({ ...prev, [file.name]: percent }));
                  }
                });
             } catch (err) {
                 console.error(`Failed to upload ${file.name}`, err);
             }
          }));
      }

      setSubmissionStatus('¡Listo! Redirigiendo...');
      setTimeout(() => router.push('/dashboard'), 500);

    } catch (error) {
      console.error(error);
      alert('Error al crear registro');
      setIsSubmitting(false);
      setSubmissionStatus('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-4">
         <h1 className="text-3xl font-bold text-emerald-950">Nuevo Registro Médico</h1>
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


                {/* Diagnoses Section - Conditional based on category */}
                {showDiagnosis ? (
                  <div className="col-span-2 space-y-4">
                    <label className="block text-sm font-medium">
                      Diagnósticos
                    </label>

                    {isPatient ? (
                      /* PATIENT UI: Inline multi-select with chips */
                      <MultiSelect
                        endpoint="/catalog/conditions"
                        placeholder="Buscar y seleccionar condiciones..."
                        selectedItems={diagnoses.map(d => ({
                          id: d.diagnosis_code || d.diagnosis, // Use code as ID if available
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
                      /* DOCTOR UI: Comprehensive form (existing) */
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
                          <div
                            key={idx}
                            className="border rounded-lg p-4 space-y-3 bg-gray-50"
                          >
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

                              {!isPatient && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Importancia
                                    </label>
                                    <Select
                                      value={diag.rank.toString()}
                                      onChange={(val) => updateDiagnosis(idx, 'rank', parseInt(val as string))}
                                      options={[
                                        { value: '1', label: 'Principal' },
                                        { value: '2', label: 'Secundario' },
                                        { value: '3', label: 'Terciario' },
                                        { value: '4', label: 'Cuaternario' },
                                        { value: '5', label: 'Quinario' },
                                      ]}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Estado
                                    </label>
                                    <Select
                                      value={diag.status}
                                      onChange={(val) => updateDiagnosis(idx, 'status', val as DiagnosisStatus)}
                                      options={[
                                        { value: DiagnosisStatus.CONFIRMED, label: 'Confirmado' },
                                        { value: DiagnosisStatus.PROVISIONAL, label: 'Provisional' },
                                        { value: DiagnosisStatus.DIFFERENTIAL, label: 'Diferencial' },
                                        { value: DiagnosisStatus.REFUTED, label: 'Descartado' },
                                      ]}
                                    />
                                  </div>
                                </div>
                              )}

                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    {isPatient ? "Notas (opcional)" : "Notas específicas (opcional)"}
                                  </label>
                                  <textarea
                                    value={diag.notes || ''}
                                    onChange={(e) => updateDiagnosis(idx, 'notes', e.target.value)}
                                    placeholder={isPatient ? "Información adicional sobre esta condición..." : "Detalles específicos de este diagnóstico..."}
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
                    <p className="text-xs text-gray-500 mt-1">
                      Para observaciones generales del encuentro, plan de tratamiento, etc.
                    </p>
                 </div>
            </div>
        </div>

        {/* File Upload Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
            <h2 className="text-lg font-semibold text-emerald-900 mb-4 border-b pb-2">Documentos</h2>
            
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                 onClick={() => document.getElementById('file-upload')?.click()}
            >
                 <UploadCloud className="h-10 w-10 mb-2 text-emerald-600" />
                 <p className="text-sm font-medium text-slate-700">Haz clic para subir archivos</p>
                 <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG soportados</p>
                 <Input 
                   type="file" 
                   multiple 
                   onChange={handleFileChange} 
                   className="hidden" 
                   id="file-upload"
                 />
            </div>

            {files.length > 0 && (
                <div className="mt-6 space-y-3">
                    {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-100">
                            <FileText className="h-5 w-5 text-slate-400" />
                            <div className="flex-1 min-w-0">
                               <p className="text-sm font-medium truncate">{file.name}</p>
                               <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            
                            {/* Upload Progress Bar for this file */}
                            {isSubmitting && uploadProgress[file.name] !== undefined && (
                                <div className="w-24">
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 transition-all duration-300"
                                            style={{ width: `${uploadProgress[file.name]}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {!isSubmitting && (
                                <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <div className="flex items-center gap-4">
                {submissionStatus && <span className="text-sm text-emerald-700 font-medium">{submissionStatus}</span>}
                <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                    {isSubmitting ? 'Guardando...' : 'Crear Registro'}
                </Button>
            </div>
        </div>

      </form>
    </div>
  );
}
