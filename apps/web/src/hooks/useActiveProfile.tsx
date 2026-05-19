'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { usePatientProfiles, PatientProfileSummary } from '@/hooks/queries/usePatientProfiles';

interface ActiveProfileContextType {
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
  /** The full profile data for the currently active profile */
  activeProfile: PatientProfileSummary | null;
  /** Whether the user is currently viewing a managed (non-SELF) profile */
  isManagingOther: boolean;
  /** All available profiles for the user */
  profiles: PatientProfileSummary[];
  /** Whether profiles are loading */
  isLoading: boolean;
}

const ActiveProfileContext = createContext<ActiveProfileContextType>({
  activeProfileId: null,
  setActiveProfileId: () => {},
  activeProfile: null,
  isManagingOther: false,
  profiles: [],
  isLoading: false,
});

const STORAGE_KEY = 'mhat_active_profile_id';

export function ActiveProfileProvider({ children }: { children: React.ReactNode }) {
  const { data: profiles = [], isLoading, isFetching } = usePatientProfiles();

  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  const setActiveProfileId = useCallback((id: string | null) => {
    setActiveProfileIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Resolve the active profile from the profiles list
  const activeProfile = useMemo(() => {
    if (!profiles.length) return null;
    // Try to find the stored profile
    if (activeProfileId) {
      const found = profiles.find((p) => p.id === activeProfileId);
      if (found) return found;
    }
    // Fall back to SELF profile
    return profiles.find((p) => p.is_self) || profiles[0];
  }, [profiles, activeProfileId]);

  const isManagingOther = useMemo(() => {
    return !!activeProfile && !activeProfile.is_self;
  }, [activeProfile]);

  // Sync activeProfileId when profiles load (e.g., if stored ID is invalid)
  useEffect(() => {
    if (profiles.length && activeProfileId) {
      const found = profiles.find((p) => p.id === activeProfileId);
      if (!found) {
        // Stored ID is stale, reset to SELF
        const selfProfile = profiles.find((p) => p.is_self);
        if (selfProfile) {
          setActiveProfileId(selfProfile.id);
        } else {
          setActiveProfileId(null);
        }
      }
    }
  }, [profiles, activeProfileId, setActiveProfileId]);

  const profilesLoading = isLoading || isFetching;

  const value = useMemo(() => ({
    activeProfileId: activeProfile?.id ?? null,
    setActiveProfileId,
    activeProfile,
    isManagingOther,
    profiles,
    isLoading: profilesLoading,
  }), [activeProfile, setActiveProfileId, isManagingOther, profiles, profilesLoading]);

  return (
    <ActiveProfileContext.Provider value={value}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  return useContext(ActiveProfileContext);
}
