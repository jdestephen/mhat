'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { User, UserRole, Sex, PatientProfile, DoctorProfile } from '@/types';
import api from '@/lib/api';

export default function PersonalInfoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PatientProfile | DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // User fields (editable via PUT /auth/me)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<Sex | ''>('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  
  // Profile fields (editable via PUT /profiles/patient or /profiles/doctor)
  const [dob, setDob] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [degree, setDegree] = useState('');
  const [shortBio, setShortBio] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await api.get<User>('/auth/me');
      setUser(userRes.data);
      
      // Set user fields
      setFirstName(userRes.data.first_name || '');
      setLastName(userRes.data.last_name || '');
      setSex(userRes.data.sex || '');
      setCity(userRes.data.city || '');
      setCountry(userRes.data.country || '');

      if (userRes.data.role === UserRole.PATIENT) {
        const profileRes = await api.get<PatientProfile>('/profiles/patient');
        setProfile(profileRes.data);
        setDob(profileRes.data.date_of_birth || '');
        setBloodType(profileRes.data.blood_type || '');
      } else {
        const profileRes = await api.get<DoctorProfile>('/profiles/doctor');
        setProfile(profileRes.data);
        setDob(profileRes.data.date_of_birth || '');
        setDegree(profileRes.data.degree || '');
        setShortBio(profileRes.data.short_bio || '');
      }
    } catch (error) {
      console.error('Error fetching profile', error);
    } finally {
      setLoading(false);
    }
  };

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
      if (user?.role === UserRole.PATIENT) {
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
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
    );
  }
  
  if (!user) {
    return <div className="p-8">Error al cargar usuario</div>;
  }

  return (
    <div className="max-w-xl mx-auto pb-20">
      <h1 className="text-3xl font-bold mb-8 text-emerald-950">Datos Personales</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Email (Read Only) */}
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Correo Electrónico</label>
            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-800">
              {user.email}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

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
