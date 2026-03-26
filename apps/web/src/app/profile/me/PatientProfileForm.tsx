'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { User, Sex, PatientProfile } from '@/types';

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

interface PatientProfileFormProps {
  user: User;
  profile: PatientProfile;
  onSaved: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  sex: Sex | '';
  dob: string;
  bloodType: string;
  dni: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export function PatientProfileForm({ user, profile, onSaved }: PatientProfileFormProps) {
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<FormData>({
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    sex: user.sex || '',
    dob: profile.date_of_birth || '',
    bloodType: profile.blood_type || '',
    dni: profile.dni || '',
    phone: profile.phone || '',
    address: profile.address || '',
    city: user.city || '',
    country: user.country || '',
  });

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const api = (await import('@/lib/api')).default;

      await api.put('/auth/me', {
        first_name: formData.firstName || null,
        last_name: formData.lastName || null,
        sex: formData.sex || null,
        city: formData.city || null,
        country: formData.country || null,
      });

      await api.put('/profiles/patient', {
        date_of_birth: formData.dob || null,
        blood_type: formData.bloodType || null,
        dni: formData.dni || null,
        phone: formData.phone || null,
        address: formData.address || null,
      });

      alert('¡Perfil actualizado!');
      onSaved();
    } catch (error) {
      console.error(error);
      alert('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Email (Read Only) */}
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-1">Correo Electrónico</label>
        <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-800">
          {user.email}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <Input
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            placeholder="Ingresa tu nombre"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Apellido</label>
          <Input
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            placeholder="Ingresa tu apellido"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Fecha de Nacimiento</label>
        <Input
          type="date"
          value={formData.dob}
          onChange={(e) => updateField('dob', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Sexo</label>
          <Select
            options={SEX_OPTIONS}
            value={formData.sex}
            onChange={(val) => updateField('sex', val as Sex | '')}
            placeholder="Selecciona sexo..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de Sangre</label>
          <Select
            options={BLOOD_TYPE_OPTIONS}
            value={formData.bloodType}
            onChange={(val) => updateField('bloodType', val as string)}
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
          placeholder="Ingresa tu dirección"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ciudad</label>
          <Input
            value={formData.city}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder="Ingresa tu ciudad"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">País</label>
          <Input
            value={formData.country}
            onChange={(e) => updateField('country', e.target.value)}
            placeholder="Ingresa tu país"
          />
        </div>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          disabled={saving}
          className="bg-emerald-900 hover:bg-emerald-800 text-white w-full hover:cursor-pointer"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
}
