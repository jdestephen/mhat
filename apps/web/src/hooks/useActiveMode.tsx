'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { UserRole } from '@/types';

export type ActiveMode = 'clinical' | 'patient';

const MODE_STORAGE_KEY = 'numa_active_mode';

interface ActiveModeContextValue {
  /** Current active mode: 'clinical' (doctor/assistant panel) or 'patient' (personal health). */
  activeMode: ActiveMode;
  /** Whether the user is currently in patient mode (as a clinical user). */
  isInPatientMode: boolean;
  /** Whether the user is a doctor or assistant. */
  isClinicalUser: boolean;
  /** Update the active mode — persists to localStorage and triggers re-render everywhere. */
  setActiveMode: (mode: ActiveMode) => void;
}

const ActiveModeContext = createContext<ActiveModeContextValue>({
  activeMode: 'clinical',
  isInPatientMode: false,
  isClinicalUser: false,
  setActiveMode: () => {},
});

export function ActiveModeProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();

  const isClinicalUser =
    user?.role === UserRole.DOCTOR || user?.role === UserRole.ASSISTANT;

  const [activeMode, setActiveModeState] = useState<ActiveMode>(() => {
    if (typeof window === 'undefined') return 'clinical';
    const stored = localStorage.getItem(MODE_STORAGE_KEY) as ActiveMode | null;
    if (stored === 'clinical' || stored === 'patient') return stored;
    // Default: clinical for doctors/assistants, patient for patients
    return 'clinical';
  });

  // When user data loads, ensure default mode is correct
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(MODE_STORAGE_KEY);

    if (!stored) {
      // First load — set default based on role
      const defaultMode: ActiveMode = isClinicalUser ? 'clinical' : 'patient';
      localStorage.setItem(MODE_STORAGE_KEY, defaultMode);
      setActiveModeState(defaultMode);
    }
  }, [user, isClinicalUser]);

  const setActiveMode = useCallback((mode: ActiveMode) => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    setActiveModeState(mode);
  }, []);

  const isInPatientMode = isClinicalUser && activeMode === 'patient';

  return (
    <ActiveModeContext.Provider
      value={{ activeMode, isInPatientMode, isClinicalUser, setActiveMode }}
    >
      {children}
    </ActiveModeContext.Provider>
  );
}

/**
 * Hook to access and control the active UI mode (clinical vs patient).
 *
 * - Doctors/assistants can switch between clinical and patient modes.
 * - Patients are always in patient mode.
 * - Mode is persisted across sessions via localStorage.
 */
export function useActiveMode() {
  return useContext(ActiveModeContext);
}
