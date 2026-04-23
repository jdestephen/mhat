'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/ui/input-with-voice';
import { Combobox } from '@/components/ui/Combobox';
import { Select } from '@/components/ui/select';
import api from '@/lib/api';
import { 
  PatientProfile, 
  Allergy, 
  Condition,
  AllergySeverity,
  AllergySource,
  AllergyStatus,
  ConditionStatus,
  ConditionSource,
  AllergyType
} from '@/types';
import { X, Plus, Pencil } from 'lucide-react';

interface PatientHealthHistoryProps {
  profile: PatientProfile;
  onRefresh: () => void;
  apiPrefix?: string;
}

type FormMode = 'view' | 'add' | 'edit';

export function PatientHealthHistory({
  profile,
  onRefresh,
  apiPrefix = '/profiles/patient',
}: PatientHealthHistoryProps) {
  const capitalize = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const [options, setOptions] = useState<Record<string, unknown> | null>(null);
  
  // --- Condition state ---
  const [condMode, setCondMode] = useState<FormMode>('view');
  const [editingCondition, setEditingCondition] = useState<Condition | null>(null);
  const [newCondition, setNewCondition] = useState<Partial<Condition>>({
      status: ConditionStatus.ACTIVE,
      source: ConditionSource.SUSPECTED,
      since_year: ''
  });
  const [savingCond, setSavingCond] = useState(false);
  const [condError, setCondError] = useState<string | null>(null);

  // --- Allergy state ---
  const [allergyMode, setAllergyMode] = useState<FormMode>('view');
  const [editingAllergy, setEditingAllergy] = useState<Allergy | null>(null);
  const [newAllergy, setNewAllergy] = useState<Partial<Allergy>>({
      type: AllergyType.OTHER,
      severity: AllergySeverity.UNKNOWN,
      source: AllergySource.NOT_SURE,
      status: AllergyStatus.UNVERIFIED
  });
  const [savingAllergy, setSavingAllergy] = useState(false);
  const [allergyError, setAllergyError] = useState<string | null>(null);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await api.get('/catalog/options');
      setOptions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Condition handlers ---
  const handleAddCondition = () => {
    setCondMode('add');
    setCondError(null);
    setNewCondition({
      status: ConditionStatus.ACTIVE,
      source: ConditionSource.SUSPECTED,
      since_year: '',
      name: '',
    });
  };

  const handleEditCondition = (cond: Condition) => {
    setCondMode('edit');
    setCondError(null);
    setEditingCondition(cond);
    setNewCondition(cond);
  };

  const handleCancelCondition = () => {
    setCondMode('view');
    setCondError(null);
    setEditingCondition(null);
    setNewCondition({
      status: ConditionStatus.ACTIVE,
      source: ConditionSource.SUSPECTED,
      since_year: '',
    });
  };

  const handleSaveCondition = async () => {
    if (!newCondition.name) {
      setCondError('Por favor ingresa el nombre de la condición.');
      return;
    }
    setCondError(null);

    setSavingCond(true);
    try {
      if (condMode === 'add') {
        await api.post(`${apiPrefix}/conditions`, newCondition);
      } else if (condMode === 'edit' && editingCondition) {
        await api.patch(`${apiPrefix}/conditions/${editingCondition.id}`, newCondition);
      }
      handleCancelCondition();
      onRefresh();
    } catch (error) {
      console.error(error);
      setCondError('Error al guardar condición. Intenta de nuevo.');
    } finally {
      setSavingCond(false);
    }
  };

  const handleDeleteCondition = async (condId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta condición?')) return;
    try {
      await api.delete(`${apiPrefix}/conditions/${condId}`);
      onRefresh();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar condición');
    }
  };

  // --- Allergy handlers ---
  const handleAddAllergy = () => {
    setAllergyMode('add');
    setAllergyError(null);
    setNewAllergy({
      type: AllergyType.OTHER,
      severity: AllergySeverity.UNKNOWN,
      source: AllergySource.NOT_SURE,
      status: AllergyStatus.UNVERIFIED,
      allergen: '',
    });
  };

  const handleEditAllergy = (allergy: Allergy) => {
    setAllergyMode('edit');
    setAllergyError(null);
    setEditingAllergy(allergy);
    setNewAllergy(allergy);
  };

  const handleCancelAllergy = () => {
    setAllergyMode('view');
    setAllergyError(null);
    setEditingAllergy(null);
    setNewAllergy({
      type: AllergyType.OTHER,
      severity: AllergySeverity.UNKNOWN,
      source: AllergySource.NOT_SURE,
      status: AllergyStatus.UNVERIFIED,
    });
  };

  const handleSaveAllergy = async () => {
    if (!newAllergy.allergen) {
      setAllergyError('Por favor ingresa el nombre del alérgeno.');
      return;
    }
    setAllergyError(null);

    setSavingAllergy(true);
    try {
      if (allergyMode === 'add') {
        await api.post(`${apiPrefix}/allergies`, newAllergy);
      } else if (allergyMode === 'edit' && editingAllergy) {
        await api.patch(`${apiPrefix}/allergies/${editingAllergy.id}`, newAllergy);
      }
      handleCancelAllergy();
      onRefresh();
    } catch (error) {
      console.error(error);
      setAllergyError('Error al guardar alergia. Intenta de nuevo.');
    } finally {
      setSavingAllergy(false);
    }
  };

  const handleDeleteAllergy = async (allergyId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta alergia?')) return;
    try {
      await api.delete(`${apiPrefix}/allergies/${allergyId}`);
      onRefresh();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar alergia');
    }
  };

  // --- Status helpers ---
  const getConditionStatusLabel = (status: ConditionStatus) => {
    const labels: Record<string, string> = {
      [ConditionStatus.ACTIVE]: 'Activa',
      [ConditionStatus.CONTROLLED]: 'Controlada',
      [ConditionStatus.RESOLVED]: 'Resuelta',
      [ConditionStatus.UNKNOWN]: 'Desconocido',
    };
    return labels[status] || capitalize(status);
  };

  const getConditionStatusColor = (status: ConditionStatus) => {
    switch (status) {
      case ConditionStatus.ACTIVE: return 'bg-amber-100 text-amber-800';
      case ConditionStatus.CONTROLLED: return 'bg-blue-100 text-blue-800';
      case ConditionStatus.RESOLVED: return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getAllergySeverityLabel = (severity: AllergySeverity) => {
    const labels: Record<string, string> = {
      [AllergySeverity.MILD]: 'Leve',
      [AllergySeverity.MODERATE]: 'Moderada',
      [AllergySeverity.SEVERE]: 'Grave',
      [AllergySeverity.UNKNOWN]: 'Desconocida',
    };
    return labels[severity] || capitalize(severity);
  };

  return (
    <div className="space-y-8">
      {/* Conditions Section */}
      <div className="border border-[var(--border-light)] rounded-lg p-3 sm:p-4">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
          <h2 className="text-lg font-semibold text-emerald-900">Condiciones</h2>
          {condMode === 'view' && (
            <Button variant="outline" size="sm" onClick={handleAddCondition}>
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Agregar Condición</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
          )}
        </div>

        {/* Condition Form (Add / Edit) */}
        {(condMode === 'add' || condMode === 'edit') && (
          <div className="mb-6 p-3 sm:p-4 bg-slate-50 rounded-md border border-[var(--border-light)]">
            <h3 className="text-md font-semibold mb-4 text-emerald-900">
              {condMode === 'add' ? 'Agregar Condición' : 'Editar Condición'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1">Condición *</label>
                <Combobox
                  endpoint="/catalog/conditions"
                  placeholder="Buscar condición (ej. Asma)"
                  value={newCondition.name}
                  onValueChange={(val, option) => {
                    setNewCondition({
                      ...newCondition,
                      name: val,
                      code: option?.code ?? undefined,
                      code_system: option?.code_system ?? undefined,
                    });
                    if (condError) setCondError(null);
                  }}
                  creatable
                />
                {!newCondition.code && newCondition.name && (
                  <p className="text-xs text-slate-400 mt-1">Valor personalizado (sin código estándar)</p>
                )}
                {condError && (
                  <p className="text-xs text-red-600 mt-1">{condError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <Select
                  options={[
                    { value: ConditionStatus.ACTIVE, label: 'Activa' },
                    { value: ConditionStatus.CONTROLLED, label: 'Controlada' },
                    { value: ConditionStatus.RESOLVED, label: 'Resuelta' },
                    { value: ConditionStatus.UNKNOWN, label: 'No sé' }
                  ]}
                  value={newCondition.status}
                  onChange={(val) => setNewCondition({ ...newCondition, status: val as ConditionStatus })}
                  placeholder="Selecciona estado..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Desde (Año)</label>
                <Input
                  placeholder="ej. 2015"
                  value={newCondition.since_year || ''}
                  onChange={(e) => setNewCondition({ ...newCondition, since_year: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-row w-full gap-2 justify-end">
              <Button onClick={handleSaveCondition} disabled={savingCond} className="bg-emerald-900 hover:bg-emerald-800 w-full sm:w-auto">
                {savingCond ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button onClick={handleCancelCondition} variant="outline" className="w-full sm:w-auto">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Conditions List */}
        {condMode === 'view' && (
          <div className="space-y-2">
            {profile.conditions?.length === 0 && <p className="text-slate-500 italic">No hay condiciones registradas.</p>}
            {profile.conditions?.map((cond) => (
              <div key={cond.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{cond.name}</p>
                  <p className="text-xs text-slate-500">
                    Desde: {cond.since_year || 'Desconocido'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 text-xs rounded ${getConditionStatusColor(cond.status)}`}>
                    {getConditionStatusLabel(cond.status)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCondition(cond)}
                    className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCondition(cond.id)}
                    className="text-red-600 hover:text-red-900 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Allergies Section */}
      <div className="border border-[var(--border-light)] rounded-lg p-3 sm:p-4">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
           <h2 className="text-lg font-semibold text-emerald-900">Alergias</h2>
           {allergyMode === 'view' && (
             <Button variant="outline" size="sm" onClick={handleAddAllergy}>
               <Plus className="w-4 h-4 mr-1" />
               <span className="hidden sm:inline">Agregar Alergia</span>
               <span className="sm:hidden">Agregar</span>
             </Button>
           )}
        </div>

        {/* Allergy Form (Add / Edit) */}
        {(allergyMode === 'add' || allergyMode === 'edit') && (
          <div className="mb-6 p-3 sm:p-4 bg-slate-50 rounded-md border border-[var(--border-light)]">
            <h3 className="text-md font-semibold mb-4 text-emerald-900">
              {allergyMode === 'add' ? 'Agregar Alergia' : 'Editar Alergia'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Álergeno *</label>
                <Combobox
                  endpoint="/catalog/allergies"
                  placeholder="Buscar alergia (ej. Maní)"
                  value={newAllergy.allergen}
                  onValueChange={(val, option) => {
                    setNewAllergy({
                      ...newAllergy,
                      allergen: val,
                      code: option?.code ?? undefined,
                      code_system: option?.code_system ?? undefined,
                    });
                    if (allergyError) setAllergyError(null);
                  }}
                  creatable
                />
                {!newAllergy.code && newAllergy.allergen && (
                  <p className="text-xs text-slate-400 mt-1">Valor personalizado (sin código estándar)</p>
                )}
                {allergyError && (
                  <p className="text-xs text-red-600 mt-1">{allergyError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Severidad</label>
                <Select
                  options={[
                    { value: AllergySeverity.MILD, label: 'Leve' },
                    { value: AllergySeverity.MODERATE, label: 'Moderada' },
                    { value: AllergySeverity.SEVERE, label: 'Grave' },
                    { value: AllergySeverity.UNKNOWN, label: 'No sé' }
                  ]}
                  value={newAllergy.severity}
                  onChange={(val) => setNewAllergy({...newAllergy, severity: val as AllergySeverity})}
                  placeholder="Selecciona severidad..."
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1">Reacción</label>
                <InputWithVoice 
                  placeholder="ej. Ronchas"
                  value={newAllergy.reaction || ''}
                  onChange={(e) => setNewAllergy({...newAllergy, reaction: e.target.value})}
                  language="es-ES"
                  mode="append"
                />
              </div>
            </div>
            <div className="flex flex-row w-full gap-2 justify-end">
              <Button onClick={handleSaveAllergy} disabled={savingAllergy} className="bg-emerald-900 hover:bg-emerald-800 w-full sm:w-auto">
                {savingAllergy ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button onClick={handleCancelAllergy} variant="outline" className="w-full sm:w-auto">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Allergies List */}
        {allergyMode === 'view' && (
          <div className="space-y-2">
            {profile.allergies?.length === 0 && <p className="text-slate-500 italic">No hay alergias registradas.</p>}
            {profile.allergies?.map((allergy) => (
              <div key={allergy.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{allergy.allergen}</p>
                  <p className="text-xs text-slate-500">
                    {getAllergySeverityLabel(allergy.severity)} • {allergy.reaction || 'Sin reacción especificada'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-700">
                    {capitalize(allergy.status)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditAllergy(allergy)}
                    className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAllergy(allergy.id)}
                    className="text-red-600 hover:text-red-900 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
