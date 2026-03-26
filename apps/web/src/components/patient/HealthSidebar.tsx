'use client';

import React from 'react';

import { Pill, Activity, AlertTriangle, Heart, Users } from 'lucide-react';
import { HealthHabit, FamilyHistoryCondition } from '@/types';

import { HealthInfoCard } from './HealthInfoCard';

export interface HealthMedication {
  id: number | string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
}

export interface HealthCondition {
  id: number | string;
  name: string;
  status?: string | null;
  since_year?: string | null;
  severity?: string | null;
}

export interface HealthAllergy {
  id: number | string;
  allergen: string;
  reaction?: string | null;
  severity?: string | null;
}

interface HealthSidebarProps {
  medications: HealthMedication[];
  conditions: HealthCondition[];
  allergies: HealthAllergy[];
  healthHabit?: HealthHabit | null;
  familyHistory?: FamilyHistoryCondition[];
}

// --- Label maps for HealthHabit enum values ---

const TOBACCO_LABELS: Record<string, string> = {
  NEVER: 'Nunca',
  EX_SMOKER: 'Ex fumador',
  OCCASIONAL: 'Ocasional',
  ACTIVE: 'Activo',
};

const ALCOHOL_LABELS: Record<string, string> = {
  NONE: 'Ninguno',
  OCCASIONAL: 'Ocasional',
  SOCIAL: 'Social',
  FREQUENT: 'Frecuente',
};

const ACTIVITY_LABELS: Record<string, string> = {
  SEDENTARY: 'Sedentario',
  ONE_TWO: '1–2 días/sem',
  THREE_FOUR: '3–4 días/sem',
  FIVE_PLUS: '5+ días/sem',
};

const DIET_LABELS: Record<string, string> = {
  BALANCED: 'Balanceada',
  HIGH_CARB: 'Alta en carbohidratos',
  HIGH_FAT: 'Alta en grasas',
  VEGETARIAN: 'Vegetariana',
  VEGAN: 'Vegana',
  OTHER: 'Otra',
};

const FAMILY_MEMBER_LABELS: Record<string, string> = {
  PADRE: 'Padre',
  MADRE: 'Madre',
  HERMANO_A: 'Hermano/a',
  ABUELO_PATERNO: 'Abuelo paterno',
  ABUELA_PATERNA: 'Abuela paterna',
  ABUELO_MATERNO: 'Abuelo materno',
  ABUELA_MATERNA: 'Abuela materna',
  TIO_A: 'Tío/a',
  OTRO: 'Otro',
};

function HabitRow({ label, value }: { label: string; value: string | number }) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </li>
  );
}

export function HealthSidebar({
  medications,
  conditions,
  allergies,
  healthHabit,
  familyHistory = [],
}: HealthSidebarProps) {
  // Build habit rows only for non-null fields
  const habitRows: { label: string; value: string | number }[] = [];
  if (healthHabit) {
    if (healthHabit.tobacco_use) {
      habitRows.push({ label: 'Tabaco', value: TOBACCO_LABELS[healthHabit.tobacco_use] ?? healthHabit.tobacco_use });
    }
    if (healthHabit.cigarettes_per_day != null) {
      habitRows.push({ label: 'Cigarrillos/día', value: healthHabit.cigarettes_per_day });
    }
    if (healthHabit.years_smoking != null) {
      habitRows.push({ label: 'Años fumando', value: healthHabit.years_smoking });
    }
    if (healthHabit.years_since_quit != null) {
      habitRows.push({ label: 'Años sin fumar', value: healthHabit.years_since_quit });
    }
    if (healthHabit.alcohol_use) {
      habitRows.push({ label: 'Alcohol', value: ALCOHOL_LABELS[healthHabit.alcohol_use] ?? healthHabit.alcohol_use });
    }
    if (healthHabit.drinks_per_week != null) {
      habitRows.push({ label: 'Bebidas/semana', value: healthHabit.drinks_per_week });
    }
    if (healthHabit.drug_use != null) {
      habitRows.push({ label: 'Drogas', value: healthHabit.drug_use ? 'Sí' : 'No' });
    }
    if (healthHabit.drug_type) {
      habitRows.push({ label: 'Tipo droga', value: healthHabit.drug_type });
    }
    if (healthHabit.drug_frequency) {
      habitRows.push({ label: 'Frecuencia droga', value: healthHabit.drug_frequency });
    }
    if (healthHabit.physical_activity) {
      habitRows.push({ label: 'Actividad física', value: ACTIVITY_LABELS[healthHabit.physical_activity] ?? healthHabit.physical_activity });
    }
    if (healthHabit.diet) {
      habitRows.push({ label: 'Dieta', value: DIET_LABELS[healthHabit.diet] ?? healthHabit.diet });
    }
    if (healthHabit.sleep_hours != null) {
      habitRows.push({ label: 'Horas de sueño', value: healthHabit.sleep_hours });
    }
    if (healthHabit.sleep_problems != null) {
      habitRows.push({ label: 'Problemas de sueño', value: healthHabit.sleep_problems ? 'Sí' : 'No' });
    }
  }

  return (
    <div className="lg:col-span-1 space-y-4">
      {/* Active Medications */}
      <HealthInfoCard
        title="Medicamentos Activos"
        icon={Pill}
        iconColor="text-blue-600"
        isEmpty={!medications.length}
      >
        {/* Header */}
        <div className="flex text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 rounded-sm border-b border-slate-200 px-1 py-1.5 mb-1">
          <div className="flex-1 text-blue-600">Nombre</div>
          <div className="w-20 text-right text-blue-600">Dosis</div>
          <div className="w-24 text-right text-blue-600">Frecuencia</div>
        </div>
        {/* Rows */}
        {medications.map((med) => (
          <div key={med.id} className="flex items-baseline py-1.5 border-b border-slate-50 last:border-0 gap-1 px-1 text-sm">
            <div className="flex-1 font-medium text-slate-800 truncate pr-2">{med.name}</div>
            <div className="w-20 text-right text-xs text-slate-600">{med.dosage || '—'}</div>
            <div className="w-24 text-right text-xs text-slate-600 truncate">{med.frequency || '—'}</div>
          </div>
        ))}
      </HealthInfoCard>

      {/* Conditions */}
      <HealthInfoCard
        title="Condiciones"
        icon={Activity}
        iconColor="text-purple-600"
        isEmpty={!conditions.length}
        emptyText="Ninguna"
      >
        {/* Header */}
        <div className="flex text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 rounded-sm border-b border-slate-200 py-1.5 px-1 mb-1">
          <div className="flex-1 text-purple-600">Condición</div>
          <div className="w-24 text-center text-purple-600">Estado</div>
          <div className="w-16 text-right text-purple-600">Desde</div>
        </div>
        {/* Rows */}
        {conditions.map((cond) => (
          <div key={cond.id} className="flex items-center py-1.5 border-b border-slate-50 last:border-0 px-1 text-sm">
            <div className="flex-1 font-medium text-slate-800 truncate pr-2">{cond.name}</div>
            <div className="w-24 text-center">
              {(cond.status || cond.severity) ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  (cond.status === 'active' || cond.severity === 'HIGH') ? 'bg-amber-100 text-amber-700' :
                  (cond.status === 'resolved' || cond.severity === 'LOW') ? 'bg-green-100 text-green-700' :
                  (cond.status === 'controlled' || cond.severity === 'MEDIUM') ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {cond.status || cond.severity}
                </span>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>
            <div className="w-16 text-right text-xs text-slate-500">{cond.since_year || '—'}</div>
          </div>
        ))}
      </HealthInfoCard>

      {/* Allergies */}
      <HealthInfoCard
        title="Alergias"
        icon={AlertTriangle}
        iconColor="text-red-600"
        borderColor="border-red-300"
        isEmpty={!allergies.length}
        emptyText="Ninguna conocida"
      >
        {/* Header */}
        <div className="flex text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 rounded-sm border-b border-slate-200 py-1.5 px-1 mb-1">
          <div className="flex-1 text-red-600">Alérgeno</div>
          <div className="w-28 text-center text-red-600">Reacción</div>
          <div className="w-20 text-right text-red-600">Severidad</div>
        </div>
        {/* Rows */}
        {allergies.map((allergy) => (
          <div key={allergy.id} className="flex items-center py-1.5 border-b border-slate-50 last:border-0 px-1 text-sm">
            <div className="flex-1 font-medium truncate pr-2">{allergy.allergen}</div>
            <div className="w-28 text-center text-xs truncate">{allergy.reaction || '—'}</div>
            <div className="w-20 text-right">
              {allergy.severity ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  allergy.severity === 'severe' ? 'bg-red-200 text-red-800' :
                  allergy.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {allergy.severity}
                </span>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>
          </div>
        ))}
      </HealthInfoCard>

      {/* Family History */}
      <HealthInfoCard
        title="Antecedentes Familiares"
        icon={Users}
        iconColor="text-indigo-600"
        isEmpty={!familyHistory.length}
        emptyText="Sin registro"
      >
        {/* Header */}
        <div className="flex text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 rounded-sm border-b border-slate-200 py-1.5 px-1 mb-1">
          <div className="flex-1 text-indigo-600">Condición</div>
          <div className="w-32 text-right text-indigo-600">Familiares</div>
        </div>
        {/* Rows */}
        {familyHistory.map((fh) => (
          <div key={fh.id} className="flex items-start py-1.5 border-b border-slate-50 last:border-0 px-1 text-sm">
            <div className="flex-1 pr-2">
              <span className="font-medium text-slate-800">{fh.condition_name}</span>
              {fh.notes && (
                <p className="text-[10px] text-slate-500 mt-0.5">{fh.notes}</p>
              )}
            </div>
            <div className="w-32 flex flex-wrap justify-end gap-1">
              {fh.family_members.map((member) => (
                <span
                  key={member}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700"
                >
                  {FAMILY_MEMBER_LABELS[member] ?? member}
                </span>
              ))}
            </div>
          </div>
        ))}
      </HealthInfoCard>    

      {/* Health Habits */}
      <HealthInfoCard
        title="Hábitos"
        icon={Heart}
        iconColor="text-rose-500"
        isEmpty={!healthHabit || habitRows.length === 0}
        emptyText="Sin registro"
      >
        {/* Header */}
        <div className="flex text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 rounded-sm border-b border-slate-200 py-1.5 px-1 mb-1">
          <div className="flex-1 text-indigo-600">Hábito</div>
          <div className="w-32 text-right text-indigo-600">Frecuencia</div>
        </div>
        {/* Rows */}
        {habitRows.map((row) => (
          <div key={row.label} className="flex items-start py-1.5 border-b border-slate-50 last:border-0 px-1 text-sm">
            <div className="flex-1 pr-2">
              <span className="font-medium text-slate-800">{row.label}</span>
            </div>
            <div className="w-32 flex flex-wrap justify-end gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full">
                {row.value}
              </span>
            </div>
          </div>
        ))}

        {healthHabit?.observations && (
          <p className="text-xs text-slate-500 mt-3 italic">
            {healthHabit.observations}
          </p>
        )}
      </HealthInfoCard>
    </div>
  );
}
