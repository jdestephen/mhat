'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import api from '@/lib/api';
import { PatientAccess, Sex } from '@/types';

const BLOOD_TYPE_OPTIONS = [
  { value: '', label: 'Selecciona...' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const SEX_OPTIONS = [
  { value: '', label: 'Selecciona...' },
  { value: Sex.MASCULINO, label: 'Masculino' },
  { value: Sex.FEMENINO, label: 'Femenino' },
];

interface PatientPersonalInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientAccess;
  onSuccess: () => void;
}

interface FormData {
  first_name: string;
  last_name: string;
  sex: string;
  date_of_birth: string;
  blood_type: string;
  dni: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export function PatientPersonalInfoModal({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: PatientPersonalInfoModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    sex: '',
    date_of_birth: '',
    blood_type: '',
    dni: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  });

  // Populate form when modal opens or patient changes
  useEffect(() => {
    if (open && patient) {
      setFormData({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        sex: patient.sex || '',
        date_of_birth: patient.date_of_birth || '',
        blood_type: patient.blood_type || '',
        dni: patient.dni || '',
        phone: patient.phone || '',
        address: patient.address || '',
        city: '',
        country: '',
      });
    }
  }, [open, patient]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name) {
      alert('Nombre y apellido son obligatorios');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/doctor/patients/${patient.patient_id}/personal-info`, {
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        date_of_birth: formData.date_of_birth || null,
        blood_type: formData.blood_type || null,
        sex: formData.sex || null,
        dni: formData.dni || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country || null,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating patient info:', error);
      alert('Error al actualizar la información del paciente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90%] sm:max-w-[650px] sm:w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader onOpenChange={onOpenChange}>
          <DialogTitle>Datos Personales del Paciente</DialogTitle>
          <DialogDescription>
            Edita la información personal de {patient.first_name} {patient.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <Input
                value={formData.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellido *</label>
              <Input
                value={formData.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                placeholder="Apellido"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fecha de Nacimiento</label>
            <Input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => updateField('date_of_birth', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sexo</label>
              <Select
                options={SEX_OPTIONS}
                value={formData.sex}
                onChange={(val) => updateField('sex', val as string)}
                placeholder="Selecciona sexo..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Sangre</label>
              <Select
                options={BLOOD_TYPE_OPTIONS}
                value={formData.blood_type}
                onChange={(val) => updateField('blood_type', val as string)}
                placeholder="Selecciona tipo de sangre..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">DNI</label>
              <Input
                value={formData.dni}
                onChange={(e) => updateField('dni', e.target.value)}
                placeholder="Número de identidad"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Celular</label>
              <Input
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="Número de celular"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Dirección</label>
            <Input
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Dirección"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ciudad</label>
              <Input
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Ciudad"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">País</label>
              <Input
                value={formData.country}
                onChange={(e) => updateField('country', e.target.value)}
                placeholder="País"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-emerald-900 hover:bg-emerald-800"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
