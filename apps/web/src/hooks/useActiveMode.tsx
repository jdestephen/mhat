'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { DOCTOR_PATIENT_MODE_ENABLED } from '@/lib/featureFlags';
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

  const [selectedMode, setSelectedMode] = useState<ActiveMode | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    return stored === 'clinical' || stored === 'patient' ? stored : null;
  });

  const doctorModeLocked = user?.role === UserRole.DOCTOR && !DOCTOR_PATIENT_MODE_ENABLED;
  const activeMode: ActiveMode = user?.role === UserRole.PATIENT
    ? 'patient'
    : doctorModeLocked
      ? 'clinical'
      : selectedMode ?? 'clinical';

  // Sync the effective mode after the account loads, including old patient preferences.
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(MODE_STORAGE_KEY) !== activeMode) {
      localStorage.setItem(MODE_STORAGE_KEY, activeMode);
    }
  }, [user, selectedMode, activeMode]);

  const setActiveMode = useCallback((mode: ActiveMode) => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    setSelectedMode(mode);
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
 * - Doctors can switch modes only when the web feature flag is enabled.
 * - Assistants can switch between clinical and patient modes.
 * - Patients are always in patient mode.
 * - Mode is persisted across sessions via localStorage.
 */
export function useActiveMode() {
  return useContext(ActiveModeContext);
}
