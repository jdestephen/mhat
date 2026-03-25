'use client';

import React, { useState } from 'react';
import { Pill, Activity, AlertTriangle, Heart, Users, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import {
  HealthMedication,
  HealthCondition,
  HealthAllergy,
} from './HealthSidebar';
import { HealthHabit, FamilyHistoryCondition } from '@/types';

interface MobileHealthChipsProps {
  medications: HealthMedication[];
  conditions: HealthCondition[];
  allergies: HealthAllergy[];
  healthHabit?: HealthHabit | null;
  familyHistory?: FamilyHistoryCondition[];
}

interface ChipConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  count: number;
}

const SEVERITY_BADGE: Record<string, string> = {
  severe: 'bg-red-200 text-red-800',
  moderate: 'bg-amber-100 text-amber-700',
  mild: 'bg-gray-100 text-gray-600',
};

export function MobileHealthChips({
  medications,
  conditions,
  allergies,
  healthHabit,
  familyHistory = [],
}: MobileHealthChipsProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const chips: ChipConfig[] = [
    {
      key: 'meds',
      label: 'Medicamentos',
      icon: Pill,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      count: medications.length,
    },
    {
      key: 'conditions',
      label: 'Condiciones',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      count: conditions.length,
    },
    {
      key: 'allergies',
      label: 'Alergias',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      count: allergies.length,
    },
    {
      key: 'family',
      label: 'Antecedentes',
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-200',
      count: familyHistory.length,
    },
    {
      key: 'habits',
      label: 'Hábitos',
      icon: Heart,
      color: 'text-rose-500',
      bgColor: 'bg-rose-50 border-rose-200',
      count: healthHabit ? 1 : 0,
    },
  ];

  const toggle = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-2">
      {/* Chip row */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {chips.map((chip) => {
          const Icon = chip.icon;
          const isActive = expanded === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => toggle(chip.key)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
                isActive ? chip.bgColor : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              <Icon className={clsx('w-3.5 h-3.5', isActive ? chip.color : 'text-slate-400')} />
              <span className="hidden sm:inline">{chip.label}</span>
              {chip.count > 0 && (
                <span className={clsx(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  isActive ? 'bg-white/80 text-slate-700' : 'bg-slate-100 text-slate-500',
                )}>
                  {chip.count}
                </span>
              )}
              <ChevronDown className={clsx('w-3 h-3 transition-transform', isActive && 'rotate-180')} />
            </button>
          );
        })}
      </div>

      {/* Expanded content */}
      {expanded === 'meds' && medications.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {medications.map((med) => (
            <div key={med.id} className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-800">{med.name}</span>
              <span className="text-xs text-slate-500">{med.dosage || ''} {med.frequency || ''}</span>
            </div>
          ))}
        </div>
      )}

      {expanded === 'conditions' && conditions.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {conditions.map((cond) => (
            <div key={cond.id} className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-800">{cond.name}</span>
              <div className="flex items-center gap-2">
                {cond.status && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{cond.status}</span>
                )}
                {cond.since_year && <span className="text-xs text-slate-400">{cond.since_year}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded === 'allergies' && allergies.length > 0 && (
        <div className="bg-white rounded-lg border border-red-200 p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {allergies.map((allergy) => (
            <div key={allergy.id} className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-800">{allergy.allergen}</span>
              <div className="flex items-center gap-2">
                {allergy.reaction && <span className="text-xs text-slate-500">{allergy.reaction}</span>}
                {allergy.severity && (
                  <span className={clsx('text-[10px] px-1.5 py-0.5 rounded', SEVERITY_BADGE[allergy.severity] || 'bg-gray-100 text-gray-600')}>
                    {allergy.severity}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded === 'family' && familyHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {familyHistory.map((fh) => (
            <div key={fh.id} className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-800">{fh.condition_name}</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {fh.family_members.map((m) => (
                  <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded === 'habits' && healthHabit && (
        <div className="bg-white rounded-lg border border-slate-200 p-3 text-sm animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2">
            {healthHabit.tobacco_use && (
              <div><span className="text-slate-500 text-xs">Tabaco:</span> <span className="font-medium">{healthHabit.tobacco_use}</span></div>
            )}
            {healthHabit.alcohol_use && (
              <div><span className="text-slate-500 text-xs">Alcohol:</span> <span className="font-medium">{healthHabit.alcohol_use}</span></div>
            )}
            {healthHabit.physical_activity && (
              <div><span className="text-slate-500 text-xs">Ejercicio:</span> <span className="font-medium">{healthHabit.physical_activity}</span></div>
            )}
            {healthHabit.diet && (
              <div><span className="text-slate-500 text-xs">Dieta:</span> <span className="font-medium">{healthHabit.diet}</span></div>
            )}
            {healthHabit.sleep_hours != null && (
              <div><span className="text-slate-500 text-xs">Sueño:</span> <span className="font-medium">{healthHabit.sleep_hours}h</span></div>
            )}
          </div>
        </div>
      )}

      {/* Empty expanded states */}
      {expanded && (() => {
        const chip = chips.find((c) => c.key === expanded);
        if (chip && chip.count === 0) {
          return (
            <div className="bg-white rounded-lg border border-slate-200 p-4 text-center text-sm text-slate-400 animate-in slide-in-from-top-2 duration-200">
              Sin datos registrados
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
