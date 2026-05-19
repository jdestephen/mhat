'use client';

import React from 'react';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { ArrowLeft } from 'lucide-react';

const RELATIONSHIP_LABELS: Record<string, string> = {
  PARENT: 'Padre/Madre',
  CHILD: 'Hijo/a',
  SPOUSE: 'Esposo/a',
  SIBLING: 'Hermano/a',
  GRANDPARENT: 'Abuelo/a',
  GUARDIAN: 'Tutor/a',
  OTHER: 'Familiar',
};

/**
 * Persistent banner shown when the user is viewing a managed (non-SELF) profile.
 * Displays the profile name, relationship, and a button to switch back.
 */
export function ProfileBanner() {
  const { activeProfile, isManagingOther, setActiveProfileId, profiles } = useActiveProfile();

  if (!isManagingOther || !activeProfile) return null;

  const name = [activeProfile.first_name, activeProfile.last_name].filter(Boolean).join(' ') || 'Sin nombre';
  const relationship = RELATIONSHIP_LABELS[activeProfile.relationship_type] || activeProfile.relationship_type;
  const selfProfile = profiles.find((p) => p.is_self);

  const handleGoBack = () => {
    if (selfProfile) {
      setActiveProfileId(selfProfile.id);
    } else {
      setActiveProfileId(null);
    }
  };

  const color = activeProfile.profile_color || '#6366F1';

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 border-b"
      style={{
        backgroundColor: `${color}10`,
        borderColor: `${color}30`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <p className="text-sm font-medium truncate" style={{ color }}>
          Viendo perfil de: <span className="font-bold">{name}</span>
          <span className="text-xs font-normal opacity-70 ml-1">({relationship})</span>
        </p>
      </div>
      <button
        onClick={handleGoBack}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/50 flex-shrink-0"
        style={{ color }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Mi perfil
      </button>
    </div>
  );
}
