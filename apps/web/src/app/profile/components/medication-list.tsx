'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/ui/input-with-voice';
import { Select } from '@/components/ui/select';
import api from '@/lib/api';
import { 
  PatientProfile, 
  Medication,
  MedicationStatus,
  MedicationSource,
} from '@/types';
import { X, Plus, Pill, Pencil } from 'lucide-react';

interface MedicationListProps {
  profile: PatientProfile;
  onRefresh: () => void;
}

type FormMode = 'view' | 'add' | 'edit';

export function MedicationList({ profile, onRefresh }: MedicationListProps) {
  const [formMode, setFormMode] = useState<FormMode>('view');
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [formData, setFormData] = useState<Partial<Medication>>({
    status: MedicationStatus.ACTIVE,
    source: MedicationSource.SELF_REPORTED,
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setFormMode('add');
    setFormData({
      status: MedicationStatus.ACTIVE,
      source: MedicationSource.SELF_REPORTED,
      name: '',
      dosage: '',
      frequency: '',
    });
  };

  const handleEdit = (medication: Medication) => {
    setFormMode('edit');
    setEditingMedication(medication);
    setFormData(medication);
  };

  const handleCancel = () => {
    setFormMode('view');
    setEditingMedication(null);
    setFormData({
      status: MedicationStatus.ACTIVE,
      source: MedicationSource.SELF_REPORTED,
    });
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('Por favor ingresa el nombre del medicamento');
      return;
    }

    setSaving(true);
    try {
      if (formMode === 'add') {
        await api.post('/profiles/patient/medications', formData);
      } else if (formMode === 'edit' && editingMedication) {
        await api.patch(`/profiles/patient/medications/${editingMedication.id}`, formData);
      }
      
      setFormMode('view');
      setEditingMedication(null);
      setFormData({
        status: MedicationStatus.ACTIVE,
        source: MedicationSource.SELF_REPORTED,
      });
      onRefresh();
    } catch (error) {
      console.error(error);
      alert('Error al guardar medicamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (medicationId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este medicamento?')) {
      return;
    }

    try {
      await api.delete(`/profiles/patient/medications/${medicationId}`);
      onRefresh();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar medicamento');
    }
  };

  const getStatusLabel = (status: MedicationStatus) => {
    const labels = {
      [MedicationStatus.ACTIVE]: 'Activo',
      [MedicationStatus.COMPLETED]: 'Completado',
      [MedicationStatus.STOPPED]: 'Detenido',
      [MedicationStatus.ON_HOLD]: 'En pausa',
      [MedicationStatus.ENTERED_IN_ERROR]: 'Error de entrada',
      [MedicationStatus.NOT_TAKEN]: 'No tomado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: MedicationStatus) => {
    switch (status) {
      case MedicationStatus.ACTIVE:
        return 'bg-emerald-100 text-emerald-800';
      case MedicationStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800';
      case MedicationStatus.STOPPED:
        return 'bg-red-100 text-red-800';
      case MedicationStatus.ON_HOLD:
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="border border-[var(--border-light)] rounded-lg p-4">
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
        <h2 className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
          <Pill className="w-5 h-5" />
          Medicamentos
        </h2>
        {formMode === 'view' && (
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Agregar Medicamento
          </Button>
        )}
      </div>

      {/* Form (Add or Edit) */}
      {(formMode === 'add' || formMode === 'edit') && (
        <div className="mb-6 p-4 bg-slate-50 rounded-md border border-[var(--border-light)]">
          <h3 className="text-md font-semibold mb-4 text-emerald-900">
            {formMode === 'add' ? 'Agregar Medicamento' : 'Editar Medicamento'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Nombre del Medicamento *</label>
              <Input
                placeholder="ej. Metformina"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dosis</label>
              <Input
                placeholder="ej. 500mg"
                value={formData.dosage || ''}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Frecuencia</label>
              <Input
                placeholder="ej. Dos veces al día"
                value={formData.frequency || ''}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Instrucciones</label>
              <InputWithVoice
                placeholder="ej. Tomar con comida"
                value={formData.instructions || ''}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                language="es-ES"
                mode="append"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
              <Input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fecha de Fin</label>
              <Input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Origen</label>
              <Select
                options={[
                  { value: MedicationSource.PRESCRIBED, label: 'Recetado' },
                  { value: MedicationSource.OTC, label: 'Sin receta (OTC)' },
                  { value: MedicationSource.SELF_REPORTED, label: 'Auto-reportado' },
                  { value: MedicationSource.TRANSFERRED, label: 'Transferido' },
                ]}
                value={formData.source}
                onChange={(val) => setFormData({ ...formData, source: val as MedicationSource })}
                placeholder="Selecciona origen..."
              />
            </div>

            {profile.conditions && profile.conditions.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Condición Relacionada</label>
                <Select
                  options={[
                    { value: '', label: 'Ninguna' },
                    ...profile.conditions.map(c => ({
                      value: c.id.toString(),
                      label: c.name
                    }))
                  ]}
                  value={formData.condition_id?.toString() || ''}
                  onChange={(val) => setFormData({
                    ...formData,
                    condition_id: val ? parseInt(val.toString()) : undefined
                  })}
                  placeholder="Selecciona condición (opcional)..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <Select
                options={[
                  { value: MedicationStatus.ACTIVE, label: 'Activo' },
                  { value: MedicationStatus.COMPLETED, label: 'Completado' },
                  { value: MedicationStatus.STOPPED, label: 'Detenido' },
                  { value: MedicationStatus.ON_HOLD, label: 'En pausa' },
                  { value: MedicationStatus.NOT_TAKEN, label: 'No tomado' },
                  { value: MedicationStatus.ENTERED_IN_ERROR, label: 'Error de entrada' },
                ]}
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val as MedicationStatus })}
                placeholder="Selecciona estado..."
              />
            </div>

            {(formData.status === MedicationStatus.STOPPED || 
              formData.status === MedicationStatus.ON_HOLD ||
              formData.status === MedicationStatus.ENTERED_IN_ERROR ||
              formData.status === MedicationStatus.NOT_TAKEN) && (
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Razón del Estado</label>
                <Input
                  placeholder="ej. Efectos secundarios, médico indicó pausar, etc."
                  value={formData.status_reason || ''}
                  onChange={(e) => setFormData({ ...formData, status_reason: e.target.value })}
                />
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-900 hover:bg-emerald-800">
              {saving ? 'Guardando...' : 'Guardar Medicamento'}
            </Button>
            <Button onClick={handleCancel} variant="outline">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Table View */}
      {formMode === 'view' && (
        <div>
          {(!profile.medications || profile.medications.length === 0) && (
            <p className="text-slate-500 italic">No hay medicamentos registrados.</p>
          )}
          
          {profile.medications && profile.medications.length > 0 && (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="hidden md:flex gap-4 px-4 py-2 bg-slate-100 rounded font-semibold text-sm text-slate-700">
                <div className="flex-1">Nombre</div>
                <div className="w-32">Dosis</div>
                <div className="w-32">Frecuencia</div>
                <div className="w-32">Estado</div>
                <div className="w-24 text-center">Acciones</div>
              </div>

              {/* Table Rows */}
              {profile.medications.map((med) => (
                <div key={med.id} className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors">
                  <div className="flex-1">
                    <span className="font-semibold text-slate-900">{med.name}</span>
                    {med.instructions && (
                      <p className="text-xs text-slate-600 mt-1">{med.instructions}</p>
                    )}
                  </div>
                  
                  <div className="w-full md:w-32">
                    <span className="md:hidden font-medium text-slate-500">Dosis: </span>
                    <span className="text-slate-700">{med.dosage || '—'}</span>
                  </div>
                  
                  <div className="w-full md:w-32">
                    <span className="md:hidden font-medium text-slate-500">Frecuencia: </span>
                    <span className="text-slate-700">{med.frequency || '—'}</span>
                  </div>
                  
                  <div className="w-full md:w-32">
                    <span className={`px-2 py-0.5 text-xs rounded inline-block ${getStatusColor(med.status)}`}>
                      {getStatusLabel(med.status)}
                    </span>
                  </div>
                  
                  <div className="w-full md:w-24 flex gap-2 justify-start md:justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(med)}
                      className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="md:hidden ml-1">Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(med.id)}
                      className="text-red-600 hover:text-red-900 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                      <span className="md:hidden ml-1">Eliminar</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
