'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { UserPlus, ArrowLeft, Check, Palette } from 'lucide-react';
import clsx from 'clsx';

const RELATIONSHIP_OPTIONS = [
  { value: 'CHILD', label: 'Hijo/a' },
  { value: 'PARENT', label: 'Padre/Madre' },
  { value: 'SPOUSE', label: 'Esposo/a' },
  { value: 'SIBLING', label: 'Hermano/a' },
  { value: 'GRANDPARENT', label: 'Abuelo/a' },
  { value: 'GUARDIAN', label: 'Persona bajo tutela' },
  { value: 'OTHER', label: 'Otro' },
];

const BLOOD_TYPE_OPTIONS = [
  { value: '', label: 'No especificado' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const PROFILE_COLORS = [
  { hex: '#6366F1', label: 'Índigo' },
  { hex: '#F59E0B', label: 'Ámbar' },
  { hex: '#EC4899', label: 'Rosa' },
  { hex: '#8B5CF6', label: 'Violeta' },
  { hex: '#14B8A6', label: 'Teal' },
  { hex: '#F97316', label: 'Naranja' },
  { hex: '#3B82F6', label: 'Azul' },
  { hex: '#EF4444', label: 'Rojo' },
];

export default function NewFamilyMemberPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [relationshipType, setRelationshipType] = useState('CHILD');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [profileColor, setProfileColor] = useState(PROFILE_COLORS[0].hex);

  const createMember = useMutation({
    mutationFn: async () => {
      const res = await api.post('/family/members', {
        first_name: firstName,
        last_name: lastName,
        relationship_type: relationshipType,
        date_of_birth: dateOfBirth || null,
        blood_type: bloodType || null,
        access_level: 'FULL_ACCESS',
        profile_color: profileColor,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'profiles'] });
      queryClient.invalidateQueries({ queryKey: ['managed-patients'] });
      router.push('/dashboard');
    },
  });

  const canSubmit = firstName.trim() && lastName.trim();

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-emerald-950">Agregar Familiar</h1>
              <p className="text-sm text-emerald-700">
                Crea un perfil de salud para un miembro de tu familia
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Apellido <span className="text-red-500">*</span>
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Apellido"
              />
            </div>
          </div>

          {/* Relationship */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Relación <span className="text-red-500">*</span>
            </label>
            <Select
              value={relationshipType}
              onChange={(val) => setRelationshipType(val as string)}
              options={RELATIONSHIP_OPTIONS}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Fecha de nacimiento
            </label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          {/* Blood Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tipo de sangre
            </label>
            <Select
              value={bloodType}
              onChange={(val) => setBloodType(val as string)}
              options={BLOOD_TYPE_OPTIONS}
            />
          </div>

          {/* Profile Color */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Palette className="w-4 h-4" />
              Color del perfil
            </label>
            <p className="text-xs text-slate-500 mb-3">
              El color ayuda a distinguir los perfiles en la barra lateral
            </p>
            <div className="flex gap-2 flex-wrap">
              {PROFILE_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setProfileColor(color.hex)}
                  className={clsx(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all',
                    profileColor === color.hex
                      ? 'border-slate-900 scale-110 shadow-md'
                      : 'border-transparent hover:scale-105',
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={color.label}
                >
                  {profileColor === color.hex && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {firstName && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Vista previa</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: profileColor }}
                >
                  {(firstName[0] || '').toUpperCase()}{(lastName[0] || '').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {firstName} {lastName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {RELATIONSHIP_OPTIONS.find((r) => r.value === relationshipType)?.label}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMember.mutate()}
            disabled={!canSubmit || createMember.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {createMember.isPending ? 'Creando...' : 'Crear Perfil'}
          </Button>
        </div>

        {createMember.isError && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-100">
            <p className="text-sm text-red-700">
              Error al crear el perfil. Intenta de nuevo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
