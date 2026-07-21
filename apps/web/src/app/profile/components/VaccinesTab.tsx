'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/ui/input-with-voice';
import { Combobox } from '@/components/ui/Combobox';
import { Select } from '@/components/ui/select';
import api from '@/lib/api';
import { PatientProfile, Vaccine } from '@/types';
import { X, Plus, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface VaccinesTabProps {
  profile: PatientProfile;
  onRefresh: () => void;
  apiPrefix?: string;
  profileId?: string;
}

type FormMode = 'view' | 'add' | 'edit';

const SITE_OPTIONS = [
  { value: 'Brazo izquierdo', label: 'Brazo izquierdo' },
  { value: 'Brazo derecho', label: 'Brazo derecho' },
  { value: 'Muslo izquierdo', label: 'Muslo izquierdo' },
  { value: 'Muslo derecho', label: 'Muslo derecho' },
  { value: 'Glúteo', label: 'Glúteo' },
  { value: 'Otro', label: 'Otro' },
];

const EMPTY_VACCINE: Partial<Vaccine> = {
  vaccine_name: '',
  code: undefined,
  code_system: undefined,
  dose_number: undefined,
  date_administered: '',
  administered_by: '',
  lot_number: '',
  site: '',
  notes: '',
};

export function VaccinesTab({
  profile,
  onRefresh,
  apiPrefix = '/profiles/patient',
  profileId,
}: VaccinesTabProps) {
  const { toast } = useToast();
  const withProfile = (url: string) => {
    if (!profileId) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}profile_id=${profileId}`;
  };

  const [mode, setMode] = useState<FormMode>('view');
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null);
  const [formData, setFormData] = useState<Partial<Vaccine>>(EMPTY_VACCINE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setMode('add');
    setError(null);
    setFormData({ ...EMPTY_VACCINE });
  };

  const handleEdit = (vaccine: Vaccine) => {
    setMode('edit');
    setError(null);
    setEditingVaccine(vaccine);
    setFormData({
      ...vaccine,
      date_administered: vaccine.date_administered || '',
    });
  };

  const handleCancel = () => {
    setMode('view');
    setError(null);
    setEditingVaccine(null);
    setFormData({ ...EMPTY_VACCINE });
  };

  const handleSave = async () => {
    if (!formData.vaccine_name) {
      setError('Por favor ingresa el nombre de la vacuna.');
      return;
    }
    setError(null);
    setSaving(true);

    try {
      const payload = {
        vaccine_name: formData.vaccine_name,
        code: formData.code || null,
        code_system: formData.code_system || null,
        dose_number: formData.dose_number || null,
        date_administered: formData.date_administered || null,
        administered_by: formData.administered_by || null,
        lot_number: formData.lot_number || null,
        site: formData.site || null,
        notes: formData.notes || null,
      };

      if (mode === 'add') {
        await api.post(withProfile(`${apiPrefix}/vaccines`), payload);
      } else if (mode === 'edit' && editingVaccine) {
        await api.patch(withProfile(`${apiPrefix}/vaccines/${editingVaccine.id}`), payload);
      }
      handleCancel();
      onRefresh();
    } catch (err) {
      console.error(err);
      setError('Error al guardar vacuna. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vaccineId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta vacuna?')) return;
    try {
      await api.delete(withProfile(`${apiPrefix}/vaccines/${vaccineId}`));
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar vacuna');
    }
  };

  return (
    <div className="space-y-8">
      <div className="border border-[var(--border-light)] rounded-lg p-3 sm:p-4">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
          <h2 className="text-lg font-semibold text-emerald-900">Vacunas</h2>
          {mode === 'view' && (
            <Button variant="outline" size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Agregar Vacuna</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
          )}
        </div>

        {/* Vaccine Form (Add / Edit) */}
        {(mode === 'add' || mode === 'edit') && (
          <div className="mb-6 p-3 sm:p-4 bg-slate-50 rounded-md border border-[var(--border-light)]">
            <h3 className="text-md font-semibold mb-4 text-emerald-900">
              {mode === 'add' ? 'Agregar Vacuna' : 'Editar Vacuna'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Vaccine Name - Combobox with catalog */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nombre de la Vacuna *</label>
                <Combobox
                  endpoint="/catalog/vaccines"
                  placeholder="Buscar vacuna (ej. COVID-19, Influenza)"
                  value={formData.vaccine_name}
                  onValueChange={(val, option) => {
                    setFormData({
                      ...formData,
                      vaccine_name: val,
                      code: option?.code ?? undefined,
                      code_system: option?.code_system ?? undefined,
                    });
                    if (error) setError(null);
                  }}
                  creatable
                />
                {!formData.code && formData.vaccine_name && (
                  <p className="text-xs text-slate-400 mt-1">Valor personalizado (sin código estándar)</p>
                )}
                {error && (
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                )}
              </div>

              {/* Dose Number */}
              <div>
                <label className="block text-sm font-medium mb-1">Número de Dosis</label>
                <Input
                  type="number"
                  placeholder="ej. 1, 2, 3"
                  min={1}
                  value={formData.dose_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, dose_number: e.target.value ? parseInt(e.target.value) : undefined })
                  }
                />
              </div>

              {/* Date Administered */}
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de Aplicación</label>
                <Input
                  type="date"
                  value={formData.date_administered || ''}
                  onChange={(e) => setFormData({ ...formData, date_administered: e.target.value })}
                />
              </div>

              {/* Administered By */}
              <div>
                <label className="block text-sm font-medium mb-1">Aplicada por</label>
                <Input
                  placeholder="ej. Dr. García, Hospital Nacional"
                  value={formData.administered_by || ''}
                  onChange={(e) => setFormData({ ...formData, administered_by: e.target.value })}
                />
              </div>

              {/* Lot Number */}
              <div>
                <label className="block text-sm font-medium mb-1">Lote</label>
                <Input
                  placeholder="ej. AB1234"
                  value={formData.lot_number || ''}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                />
              </div>

              {/* Site - Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-1">Sitio de Aplicación</label>
                <Select
                  options={SITE_OPTIONS}
                  value={formData.site || ''}
                  onChange={(val) => setFormData({ ...formData, site: val as string })}
                  placeholder="Selecciona el sitio"
                />
              </div>

              {/* Notes */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notas</label>
                <InputWithVoice
                  placeholder="Observaciones adicionales, reacciones..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  language="es-ES"
                  mode="append"
                />
              </div>
            </div>
            <div className="flex flex-row w-full gap-2 justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-900 hover:bg-emerald-800 w-full sm:w-auto">
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button onClick={handleCancel} variant="outline" className="w-full sm:w-auto">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Vaccines List */}
        {mode === 'view' && (
          <div className="space-y-2">
            {profile.vaccines?.length === 0 && <p className="text-slate-500 italic">No hay vacunas registradas.</p>}
            {profile.vaccines?.map((vaccine) => (
              <div key={vaccine.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">
                    {vaccine.vaccine_name}
                    {vaccine.dose_number && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                        Dosis {vaccine.dose_number}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    Fecha: {vaccine.date_administered || 'No especificada'}
                    {vaccine.administered_by && ` • ${vaccine.administered_by}`}
                  </p>
                  {vaccine.site && (
                    <p className="text-xs text-slate-500">Sitio: {vaccine.site}</p>
                  )}
                  {vaccine.lot_number && (
                    <p className="text-xs text-slate-500">Lote: {vaccine.lot_number}</p>
                  )}
                  {vaccine.notes && (
                    <p className="text-xs text-slate-600 mt-1">{vaccine.notes}</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
                  <div className="flex flex-row gap-1 sm:gap-0 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(vaccine)}
                      className="border border-slate-200 md:border-0 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(vaccine.id)}
                      className="border border-red-200 md:border-0 text-red-600 hover:text-red-900 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
