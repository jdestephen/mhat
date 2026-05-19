'use client';

import React, { useState } from 'react';
import { ChevronDown, Check, UserPlus } from 'lucide-react';
import clsx from 'clsx';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { PatientProfileSummary } from '@/hooks/queries/usePatientProfiles';
import { useRouter } from 'next/navigation';

/** Curated palette for profile colors */
const PROFILE_COLORS = [
  '#10B981', // emerald
  '#6366F1', // indigo
  '#F59E0B', // amber
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#14B8A6', // teal
  '#F97316', // orange
  '#3B82F6', // blue
];

const DEFAULT_SELF_COLOR = '#10B981';

function getInitials(profile: PatientProfileSummary): string {
  const first = profile.first_name?.[0] || '';
  const last = profile.last_name?.[0] || '';
  return (first + last).toUpperCase() || '?';
}

function getProfileColor(profile: PatientProfileSummary): string {
  if (profile.profile_color) return profile.profile_color;
  if (profile.is_self) return DEFAULT_SELF_COLOR;
  // Deterministic fallback based on profile ID
  const hash = profile.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PROFILE_COLORS[hash % PROFILE_COLORS.length];
}

function getProfileLabel(profile: PatientProfileSummary): string {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Sin nombre';
  return name;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  SELF: 'Mi perfil',
  PARENT: 'Padre/Madre',
  CHILD: 'Hijo/a',
  SPOUSE: 'Esposo/a',
  SIBLING: 'Hermano/a',
  GRANDPARENT: 'Abuelo/a',
  GUARDIAN: 'Tutor/a',
  OTHER: 'Otro',
};

export function ProfileSwitcher() {
  const { activeProfile, profiles, setActiveProfileId, isLoading } = useActiveProfile();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (isLoading || !profiles.length) return null;

  // Don't show switcher if there's only one profile and no way to add more
  const showSwitcher = profiles.length > 1 || true; // Always show to allow "Agregar Familiar"

  if (!showSwitcher || !activeProfile) return null;

  return (
    <div className="relative px-2 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors text-left"
      >
        {/* Profile avatar with color */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
          style={{ backgroundColor: getProfileColor(activeProfile) }}
        >
          {getInitials(activeProfile)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-emerald-900 truncate">
            {getProfileLabel(activeProfile)}
          </p>
          <p className="text-xs text-emerald-600">
            {RELATIONSHIP_LABELS[activeProfile.relationship_type] || activeProfile.relationship_type}
          </p>
        </div>
        <ChevronDown className={clsx('w-4 h-4 text-emerald-600 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-2 right-2 mt-1 z-20 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfiles</p>
            </div>
            {profiles.map((profile) => {
              const color = getProfileColor(profile);
              const isActive = profile.id === activeProfile.id;

              return (
                <button
                  key={profile.id}
                  onClick={() => {
                    setActiveProfileId(profile.id);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50',
                    isActive && 'bg-emerald-50',
                  )}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {getInitials(profile)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {getProfileLabel(profile)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {RELATIONSHIP_LABELS[profile.relationship_type] || profile.relationship_type}
                      {!profile.has_records && ' · Sin registros'}
                    </p>
                  </div>
                  {isActive && (
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Add family member button */}
            <div className="border-t border-slate-100">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/family/new');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-emerald-50 text-emerald-700"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-dashed border-emerald-300">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">Agregar Familiar</p>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
