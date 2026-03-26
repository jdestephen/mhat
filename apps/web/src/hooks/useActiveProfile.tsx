'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { UserRole } from '@/types';

interface ActiveProfileContextType {
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
}

const ActiveProfileContext = createContext<ActiveProfileContextType>({
  activeProfileId: null,
  setActiveProfileId: () => {},
});

const STORAGE_KEY = 'mhat_active_profile_id';

export function ActiveProfileProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const isPatient = user?.role === UserRole.PATIENT;

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

  // Clear active profile when not a patient
  useEffect(() => {
    if (user && !isPatient) {
      setActiveProfileId(null);
    }
  }, [user, isPatient, setActiveProfileId]);

  return (
    <ActiveProfileContext.Provider value={{ activeProfileId, setActiveProfileId }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  return useContext(ActiveProfileContext);
}
