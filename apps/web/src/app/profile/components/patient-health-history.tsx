'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/ui/input-with-voice';
import { Autocomplete } from '@/components/ui/autocomplete';
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
    setNewCondition({
      status: ConditionStatus.ACTIVE,
      source: ConditionSource.SUSPECTED,
      since_year: '',
      name: '',
    });
  };

  const handleEditCondition = (cond: Condition) => {
    setCondMode('edit');
    setEditingCondition(cond);
    setNewCondition(cond);
  };

  const handleCancelCondition = () => {
    setCondMode('view');
    setEditingCondition(null);
    setNewCondition({
      status: ConditionStatus.ACTIVE,
      source: ConditionSource.SUSPECTED,
      since_year: '',
    });
  };

  const handleSaveCondition = async () => {
    if (!newCondition.name) return;
    if (condMode === 'add' && (!newCondition.code || !newCondition.code_system)) {
      alert('Por favor selecciona una condición del menú desplegable para asegurar la codificación apropiada.');
      return;
    }

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
      alert('Error al guardar condición');
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
    setEditingAllergy(allergy);
    setNewAllergy(allergy);
  };

  const handleCancelAllergy = () => {
    setAllergyMode('view');
    setEditingAllergy(null);
    setNewAllergy({
      type: AllergyType.OTHER,
      severity: AllergySeverity.UNKNOWN,
      source: AllergySource.NOT_SURE,
      status: AllergyStatus.UNVERIFIED,
    });
  };

  const handleSaveAllergy = async () => {
    if (!newAllergy.allergen) return;
    if (allergyMode === 'add' && (!newAllergy.code || !newAllergy.code_system)) {
      alert('Por favor selecciona una alergia del menú desplegable para asegurar la codificación apropiada.');
      return;
    }

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
      alert('Error al guardar alergia');
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
      <div className="border border-[var(--border-light)] rounded-lg p-4">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
          <h2 className="text-lg font-semibold text-emerald-900">Condiciones</h2>
          {condMode === 'view' && (
            <Button variant="outline" size="sm" onClick={handleAddCondition}>
              <Plus className="w-4 h-4 mr-1" />
              Agregar Condición
            </Button>
          )}
        </div>

        {/* Condition Form (Add / Edit) */}
        {(condMode === 'add' || condMode === 'edit') && (
          <div className="mb-6 p-4 bg-slate-50 rounded-md border border-[var(--border-light)]">
            <h3 className="text-md font-semibold mb-4 text-emerald-900">
              {condMode === 'add' ? 'Agregar Condición' : 'Editar Condición'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Condición *</label>
                <Autocomplete
                  endpoint="/catalog/conditions"
                  placeholder="Buscar condición (ej. Asma)"
                  onSelect={(opt) => setNewCondition({ 
                    ...newCondition, 
                    name: opt.display,
                    code: opt.code,
                    code_system: opt.code_system
                  })}
                  onChange={(val) => {
                    if (val !== newCondition.name) {
                      setNewCondition({ ...newCondition, name: val, code: undefined, code_system: undefined });
                    }
                  }}
                  value={newCondition.name}
                />
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
            <div className="flex gap-2">
              <Button onClick={handleSaveCondition} disabled={savingCond} className="bg-emerald-900 hover:bg-emerald-800">
                {savingCond ? 'Guardando...' : 'Guardar Condición'}
              </Button>
              <Button onClick={handleCancelCondition} variant="outline">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Conditions Table */}
        {condMode === 'view' && (
          <div className="space-y-2">
            {profile.conditions?.length === 0 && <p className="text-slate-500 italic">No hay condiciones registradas.</p>}
            {profile.conditions?.map((cond) => (
              <div key={cond.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors">
                <div>
                  <p className="font-medium text-slate-800">{cond.name}</p>
                  <p className="text-xs text-slate-500">
                    Desde: {cond.since_year || 'Desconocido'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
      <div className="border border-[var(--border-light)] rounded-lg p-4">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
           <h2 className="text-lg font-semibold text-emerald-900">Alergias</h2>
           {allergyMode === 'view' && (
             <Button variant="outline" size="sm" onClick={handleAddAllergy}>
               <Plus className="w-4 h-4 mr-1" />
               Agregar Alergia
             </Button>
           )}
        </div>

        {/* Allergy Form (Add / Edit) */}
        {(allergyMode === 'add' || allergyMode === 'edit') && (
          <div className="mb-6 p-4 bg-slate-50 rounded-md border border-[var(--border-light)]">
            <h3 className="text-md font-semibold mb-4 text-emerald-900">
              {allergyMode === 'add' ? 'Agregar Alergia' : 'Editar Alergia'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Álergeno *</label>
                <Autocomplete 
                  endpoint="/catalog/allergies"
                  placeholder="Buscar alergia (ej. Maní)"
                  onSelect={(opt) => {
                    setNewAllergy({
                      ...newAllergy, 
                      allergen: opt.display,
                      code: opt.code,
                      code_system: opt.code_system
                    });
                  }}
                  onChange={(val) => {
                    if (val !== newAllergy.allergen) {
                      setNewAllergy({...newAllergy, allergen: val, code: undefined, code_system: undefined});
                    }
                  }}
                  value={newAllergy.allergen}
                />
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
              <div className="col-span-2">
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
            <div className="flex gap-2">
              <Button onClick={handleSaveAllergy} disabled={savingAllergy} className="bg-emerald-900 hover:bg-emerald-800">
                {savingAllergy ? 'Guardando...' : 'Guardar Alergia'}
              </Button>
              <Button onClick={handleCancelAllergy} variant="outline">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Allergies Table */}
        {allergyMode === 'view' && (
          <div className="space-y-2">
            {profile.allergies?.length === 0 && <p className="text-slate-500 italic">No hay alergias registradas.</p>}
            {profile.allergies?.map((allergy) => (
              <div key={allergy.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors">
                <div>
                  <p className="font-medium text-slate-800">{allergy.allergen}</p>
                  <p className="text-xs text-slate-500">
                    {getAllergySeverityLabel(allergy.severity)} • {allergy.reaction || 'Sin reacción especificada'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
