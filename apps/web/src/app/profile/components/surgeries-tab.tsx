'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/ui/input-with-voice';
import api from '@/lib/api';
import { PatientProfile, Surgery } from '@/types';
import { X, Plus, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface SurgeriesTabProps {
  profile: PatientProfile;
  onRefresh: () => void;
  apiPrefix?: string;
  profileId?: string;
}

type FormMode = 'view' | 'add' | 'edit';

export function SurgeriesTab({
  profile,
  onRefresh,
  apiPrefix = '/profiles/patient',
  profileId,
}: SurgeriesTabProps) {
  const { toast } = useToast();
  const withProfile = (url: string) => {
    if (!profileId) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}profile_id=${profileId}`;
  };

  const [surgeryMode, setSurgeryMode] = useState<FormMode>('view');
  const [editingSurgery, setEditingSurgery] = useState<Surgery | null>(null);
  const [newSurgery, setNewSurgery] = useState<Partial<Surgery>>({
      name: '',
      date_str: '',
      hospital: '',
      notes: ''
  });
  const [savingSurgery, setSavingSurgery] = useState(false);
  const [surgeryError, setSurgeryError] = useState<string | null>(null);

  const handleAddSurgery = () => {
    setSurgeryMode('add');
    setSurgeryError(null);
    setNewSurgery({
      name: '',
      date_str: '',
      hospital: '',
      notes: '',
    });
  };

  const handleEditSurgery = (surg: Surgery) => {
    setSurgeryMode('edit');
    setSurgeryError(null);
    setEditingSurgery(surg);
    setNewSurgery(surg);
  };

  const handleCancelSurgery = () => {
    setSurgeryMode('view');
    setSurgeryError(null);
    setEditingSurgery(null);
    setNewSurgery({
      name: '',
      date_str: '',
      hospital: '',
      notes: '',
    });
  };

  const handleSaveSurgery = async () => {
    if (!newSurgery.name) {
      setSurgeryError('Por favor ingresa el nombre de la cirugía.');
      return;
    }
    setSurgeryError(null);

    setSavingSurgery(true);
    try {
      if (surgeryMode === 'add') {
        await api.post(withProfile(`${apiPrefix}/surgeries`), newSurgery);
      } else if (surgeryMode === 'edit' && editingSurgery) {
        await api.patch(withProfile(`${apiPrefix}/surgeries/${editingSurgery.id}`), newSurgery);
      }
      handleCancelSurgery();
      onRefresh();
    } catch (error) {
      console.error(error);
      setSurgeryError('Error al guardar cirugía. Intenta de nuevo.');
    } finally {
      setSavingSurgery(false);
    }
  };

  const handleDeleteSurgery = async (surgeryId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta cirugía?')) return;
    try {
      await api.delete(withProfile(`${apiPrefix}/surgeries/${surgeryId}`));
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar cirugía');
    }
  };

  return (
    <div className="space-y-8">
      {/* Surgeries Section */}
      <div className="border border-[var(--border-light)] rounded-lg p-3 sm:p-4">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
           <h2 className="text-lg font-semibold text-emerald-900">Cirugías</h2>
           {surgeryMode === 'view' && (
             <Button variant="outline" size="sm" onClick={handleAddSurgery}>
               <Plus className="w-4 h-4 mr-1" />
               <span className="hidden sm:inline">Agregar Cirugía</span>
               <span className="sm:hidden">Agregar</span>
             </Button>
           )}
        </div>

        {/* Surgery Form (Add / Edit) */}
        {(surgeryMode === 'add' || surgeryMode === 'edit') && (
          <div className="mb-6 p-3 sm:p-4 bg-slate-50 rounded-md border border-[var(--border-light)]">
            <h3 className="text-md font-semibold mb-4 text-emerald-900">
              {surgeryMode === 'add' ? 'Agregar Cirugía' : 'Editar Cirugía'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nombre de la Cirugía *</label>
                <Input
                  placeholder="ej. Apendicectomía"
                  value={newSurgery.name || ''}
                  onChange={(e) => {
                    setNewSurgery({ ...newSurgery, name: e.target.value });
                    if (surgeryError) setSurgeryError(null);
                  }}
                />
                {surgeryError && (
                  <p className="text-xs text-red-600 mt-1">{surgeryError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha (Mes y Año)</label>
                <Input
                  placeholder="ej. Octubre 2021"
                  value={newSurgery.date_str || ''}
                  onChange={(e) => setNewSurgery({ ...newSurgery, date_str: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hospital / Clínica</label>
                <Input
                  placeholder="ej. Hospital San Jorge"
                  value={newSurgery.hospital || ''}
                  onChange={(e) => setNewSurgery({ ...newSurgery, hospital: e.target.value })}
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notas Adicionales</label>
                <InputWithVoice 
                  placeholder="Observaciones adicionales, complicaciones..."
                  value={newSurgery.notes || ''}
                  onChange={(e) => setNewSurgery({...newSurgery, notes: e.target.value})}
                  language="es-ES"
                  mode="append"
                />
              </div>
            </div>
            <div className="flex flex-row w-full gap-2 justify-end">
              <Button onClick={handleSaveSurgery} disabled={savingSurgery} className="bg-emerald-900 hover:bg-emerald-800 w-full sm:w-auto">
                {savingSurgery ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button onClick={handleCancelSurgery} variant="outline" className="w-full sm:w-auto">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Surgeries List */}
        {surgeryMode === 'view' && (
          <div className="space-y-2">
            {profile.surgeries?.length === 0 && <p className="text-slate-500 italic">No hay cirugías registradas.</p>}
            {profile.surgeries?.map((surgery) => (
              <div key={surgery.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{surgery.name}</p>
                  <p className="text-xs text-slate-500">
                    Fecha: {surgery.date_str || 'No especificada'} • {surgery.hospital || 'Hospital no especificado'}
                  </p>
                  {surgery.notes && (
                    <p className="text-xs text-slate-600 mt-1">{surgery.notes}</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
                  <div className="flex flex-row gap-1 sm:gap-0 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSurgery(surgery)}
                      className="border border-slate-200 md:border-0 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSurgery(surgery.id)}
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
