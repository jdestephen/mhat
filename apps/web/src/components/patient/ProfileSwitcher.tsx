'use client';

import React, { useState } from 'react';
import { ChevronDown, UserCircle, Check, Stethoscope } from 'lucide-react';
import clsx from 'clsx';
import { usePatientProfiles, PatientProfileSummary } from '@/hooks/queries/usePatientProfiles';
import { useActiveProfile } from '@/hooks/useActiveProfile';

export function ProfileSwitcher() {
  const { data: profiles, isLoading } = usePatientProfiles();
  const { activeProfileId, setActiveProfileId } = useActiveProfile();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading || !profiles || profiles.length <= 1) return null;

  const activeProfile = profiles.find((p) => p.id === activeProfileId)
    || profiles.find((p) => p.is_self)
    || profiles[0];

  const getProfileLabel = (profile: PatientProfileSummary) => {
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Sin nombre';
    if (profile.is_self) return name;
    if (profile.created_by_doctor_name) return `${name} (Dr. ${profile.created_by_doctor_name})`;
    return name;
  };

  return (
    <div className="relative px-2 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0">
          <UserCircle className="w-5 h-5 text-emerald-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-emerald-900 truncate">
            {getProfileLabel(activeProfile)}
          </p>
          <p className="text-xs text-emerald-600">
            {activeProfile.is_self ? 'Mi perfil' : activeProfile.relationship_type}
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
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => {
                  setActiveProfileId(profile.id);
                  setIsOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50',
                  profile.id === activeProfile.id && 'bg-emerald-50',
                )}
              >
                <div className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                  profile.is_self ? 'bg-emerald-100' : 'bg-blue-100',
                )}>
                  {profile.created_by_doctor_name ? (
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                  ) : (
                    <UserCircle className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {getProfileLabel(profile)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {profile.is_self ? 'Mi perfil' : profile.access_level.replace('_', ' ').toLowerCase()}
                    {profile.has_records ? '' : ' · Sin registros'}
                  </p>
                </div>
                {profile.id === activeProfile.id && (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
