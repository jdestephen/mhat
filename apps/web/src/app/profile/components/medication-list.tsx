'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import api from '@/lib/api';
import { 
  PatientProfile, 
  Medication,
  MedicationStatus,
  MedicationSource,
  Condition
} from '@/types';
import { X, Plus, Pill, Calendar, AlertCircle } from 'lucide-react';

interface MedicationListProps {
  profile: PatientProfile;
  onRefresh: () => void;
}

export function MedicationList({ profile, onRefresh }: MedicationListProps) {
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [newMedication, setNewMedication] = useState<Partial<Medication>>({
    status: MedicationStatus.ACTIVE,
    source: MedicationSource.SELF_REPORTED,
  });

  const handleAddMedication = async () => {
    if (!newMedication.name) {
      alert('Por favor ingresa el nombre del medicamento');
      return;
    }

    try {
      await api.post('/profiles/patient/medications', newMedication);
      setShowAddMedication(false);
      setNewMedication({
        status: MedicationStatus.ACTIVE,
        source: MedicationSource.SELF_REPORTED,
        name: '',
        dosage: '',
        frequency: '',
      });
      onRefresh();
    } catch (error) {
      console.error(error);
      alert('Error al agregar medicamento');
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

  const getSourceLabel = (source: MedicationSource) => {
    const labels = {
      [MedicationSource.PRESCRIBED]: 'Recetado',
      [MedicationSource.OTC]: 'Sin receta',
      [MedicationSource.SELF_REPORTED]: 'Auto-reportado',
      [MedicationSource.TRANSFERRED]: 'Transferido',
    };
    return labels[source] || source;
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
        <Button variant="outline" size="sm" onClick={() => setShowAddMedication(!showAddMedication)}>
          {showAddMedication ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {showAddMedication ? 'Cancelar' : 'Agregar Medicamento'}
        </Button>
      </div>

      {showAddMedication && (
        <div className="mb-6 p-4 bg-slate-50 rounded-md border border-[var(--border-light)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Nombre del Medicamento *</label>
              <Input
                placeholder="ej. Metformina"
                value={newMedication.name || ''}
                onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dosis</label>
              <Input
                placeholder="ej. 500mg"
                value={newMedication.dosage || ''}
                onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Frecuencia</label>
              <Input
                placeholder="ej. Dos veces al día"
                value={newMedication.frequency || ''}
                onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Instrucciones</label>
              <Input
                placeholder="ej. Tomar con comida"
                value={newMedication.instructions || ''}
                onChange={(e) => setNewMedication({ ...newMedication, instructions: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
              <Input
                type="date"
                value={newMedication.start_date || ''}
                onChange={(e) => setNewMedication({ ...newMedication, start_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fecha de Fin</label>
              <Input
                type="date"
                value={newMedication.end_date || ''}
                onChange={(e) => setNewMedication({ ...newMedication, end_date: e.target.value })}
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
                value={newMedication.source}
                onChange={(val) => setNewMedication({ ...newMedication, source: val as MedicationSource })}
                placeholder="Selecciona origen..."
              />
            </div>

            {/* Optional: link to condition if conditions exist */}
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
                  value={newMedication.condition_id?.toString() || ''}
                  onChange={(val) => setNewMedication({
                    ...newMedication,
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
                value={newMedication.status}
                onChange={(val) => setNewMedication({ ...newMedication, status: val as MedicationStatus })}
                placeholder="Selecciona estado..."
              />
            </div>

            {/* Show status_reason field when status needs explanation */}
            {(newMedication.status === MedicationStatus.STOPPED || 
              newMedication.status === MedicationStatus.ON_HOLD ||
              newMedication.status === MedicationStatus.ENTERED_IN_ERROR ||
              newMedication.status === MedicationStatus.NOT_TAKEN) && (
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Razón del Estado</label>
                <Input
                  placeholder="ej. Efectos secundarios, médico indicó pausar, etc."
                  value={newMedication.status_reason || ''}
                  onChange={(e) => setNewMedication({ ...newMedication, status_reason: e.target.value })}
                />
              </div>
            )}
            
          </div>
          <Button onClick={handleAddMedication} className="bg-emerald-900 hover:bg-emerald-800">
            Guardar Medicamento
          </Button>
        </div>
      )}

      {/* Medications List */}
      <div className="space-y-2">
        {(!profile.medications || profile.medications.length === 0) && (
          <p className="text-slate-500 italic">No hay medicamentos registrados.</p>
        )}
        {profile.medications?.map((med) => (
          <div key={med.id} className="p-4 bg-slate-50 rounded border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-lg">{med.name}</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(med.status)}`}>
                    {getStatusLabel(med.status)}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-700">
                    {getSourceLabel(med.source)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 mt-3">
              {med.dosage && (
                <div>
                  <span className="font-medium">Dosificación:</span> {med.dosage}
                </div>
              )}
              {med.frequency && (
                <div>
                  <span className="font-medium">Frecuencia:</span> {med.frequency}
                </div>
              )}
              {med.start_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium">Inicio:</span> {new Date(med.start_date).toLocaleDateString('es-ES')}
                </div>
              )}
              {med.end_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium">Fin:</span> {new Date(med.end_date).toLocaleDateString('es-ES')}
                </div>
              )}
            </div>

            {med.instructions && (
              <div className="mt-2 text-sm">
                <span className="font-medium text-slate-700">Instrucciones:</span>
                <p className="text-slate-600 mt-0.5">{med.instructions}</p>
              </div>
            )}

            {med.notes && (
              <div className="mt-2 text-sm">
                <span className="font-medium text-slate-700">Notas:</span>
                <p className="text-slate-600 mt-0.5">{med.notes}</p>
              </div>
            )}

            {med.status_reason && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <span className="font-medium text-amber-800">Razón:</span>
                  <span className="text-amber-700 ml-1">{med.status_reason}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
