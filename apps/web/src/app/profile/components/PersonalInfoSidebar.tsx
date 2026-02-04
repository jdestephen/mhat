'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { User, UserRole, Sex, PatientProfile, DoctorProfile } from '@/types';
import api from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PersonalInfoSidebarProps {
  user: User;
  profile: PatientProfile | DoctorProfile | null;
  onUpdate: () => void;
}

export function PersonalInfoSidebar({ user, profile, onUpdate }: PersonalInfoSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // User fields (editable via PUT /auth/me)
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [sex, setSex] = useState<Sex | ''>( user.sex || '');
  const [city, setCity] = useState(user.city || '');
  const [country, setCountry] = useState(user.country || '');
  
  // Profile fields (editable via PUT /profiles/patient or /profiles/doctor)
  const [dob, setDob] = useState(
    (profile as any)?.date_of_birth || ''
  );
  const [bloodType, setBloodType] = useState(
    user.role === UserRole.PATIENT ? (profile as PatientProfile)?.blood_type || '' : ''
  );
  const [degree, setDegree] = useState(
    user.role === UserRole.DOCTOR ? (profile as DoctorProfile)?.degree || '' : ''
  );
  const [shortBio, setShortBio] = useState(
    user.role === UserRole.DOCTOR ? (profile as DoctorProfile)?.short_bio || '' : ''
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Update user information (name, sex, city, country)
      await api.put('/auth/me', {
        first_name: firstName || null,
        last_name: lastName || null,
        sex: sex || null,
        city: city || null,
        country: country || null,
      });

      // Update profile information based on role
      if (user.role === UserRole.PATIENT) {
        await api.put('/profiles/patient', {
          date_of_birth: dob || null,
          blood_type: bloodType || null,
        });
      } else {
        await api.put('/profiles/doctor', {
          date_of_birth: dob || null,
          degree: degree || null,
          short_bio: shortBio || null,
        });
      }

      alert('¡Perfil actualizado!');
      onUpdate();
    } catch (error) {
      console.error(error);
      alert('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`relative transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-full lg:w-1/3'}`}>
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 z-10 bg-white border border-slate-200 rounded-full p-1.5 shadow-md hover:bg-slate-50 transition-colors"
        aria-label={isCollapsed ? 'Expandir' : 'Colapsar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        )}
      </button>

      {/* Sidebar Content */}
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)] transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <h2 className="text-2xl font-bold mb-6 text-emerald-950">Información Personal</h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          {/* Email (Read Only) */}
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Correo Electrónico</label>
            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-800">
              {user.email}
            </div>
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ingresa tu nombre"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Apellido</label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ingresa tu apellido"
            />
          </div>

          {/* Sex */}
          <div>
            <label className="block text-sm font-medium mb-1">Sexo</label>
            <Select
              options={[
                { value: '', label: 'Selecciona...' },
                { value: Sex.MASCULINO, label: 'Masculino' },
                { value: Sex.FEMININO, label: 'Femenino' },
              ]}
              value={sex}
              onChange={(val) => setSex(val as Sex | '')}
              placeholder="Selecciona sexo..."
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium mb-1">Fecha de Nacimiento</label>
            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          {/* Patient-specific fields */}
          {user.role === UserRole.PATIENT && (
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Sangre</label>
              <Input
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                placeholder="ej. O+"
              />
            </div>
          )}

          {/* Doctor-specific fields */}
          {user.role === UserRole.DOCTOR && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Grado</label>
                <Input
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="ej. MD, PhD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Biografía Corta</label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-slate-200 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                  value={shortBio}
                  onChange={(e) => setShortBio(e.target.value)}
                />
              </div>
            </>
          )}

          {/* City */}
          <div>
            <label className="block text-sm font-medium mb-1">Ciudad</label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ingresa tu ciudad"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium mb-1">País</label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Ingresa tu país"
            />
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-900 hover:bg-emerald-800 text-white w-full"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
