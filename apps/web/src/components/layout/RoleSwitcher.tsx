'use client';

import React, { useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { Stethoscope, HeartPulse, ArrowRightLeft } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { UserRole } from '@/types';

type ActiveMode = 'clinical' | 'patient';

const MODE_STORAGE_KEY = 'numa_active_mode';

/** Resolve which mode the user is in based on localStorage + pathname fallback. */
function resolveActiveMode(pathname: string | null): ActiveMode {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(MODE_STORAGE_KEY) as ActiveMode | null;
    if (stored === 'clinical' || stored === 'patient') return stored;
  }
  // Fallback: infer from pathname
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/profile')) {
    return 'patient';
  }
  return 'clinical';
}

function persistMode(mode: ActiveMode) {
  localStorage.setItem(MODE_STORAGE_KEY, mode);
}

interface RoleSwitcherProps {
  collapsed?: boolean;
}

/**
 * Toggle for doctors/assistants to switch between their clinical dashboard
 * and their personal patient dashboard.
 *
 * - Persists active mode in localStorage (survives navigation)
 * - Calls `/family/doctor-patient-init` to ensure patient profile exists
 * - Visual cues use distinct colors for each mode
 */
export function RoleSwitcher({ collapsed = false }: RoleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  const isClinicalUser =
    user?.role === UserRole.DOCTOR || user?.role === UserRole.ASSISTANT;

  const activeMode = resolveActiveMode(pathname);
  const isPatientMode = activeMode === 'patient';

  const roleLabel =
    user?.role === UserRole.DOCTOR ? 'Modo Doctor' : 'Modo Asistente';

  // Sync mode with pathname on mount
  useEffect(() => {
    if (!isClinicalUser) return;
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (!storedMode) {
      // Auto-set based on current path
      const inferred = resolveActiveMode(pathname);
      persistMode(inferred);
    }
  }, [isClinicalUser, pathname]);

  const initPatientMode = useMutation({
    mutationFn: async () => {
      const res = await api.post('/family/doctor-patient-init');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'profiles'] });
      persistMode('patient');
      router.push('/dashboard');
    },
  });

  const handleToggle = useCallback(() => {
    if (isPatientMode) {
      persistMode('clinical');
      router.push('/doctor');
    } else {
      initPatientMode.mutate();
    }
  }, [isPatientMode, router, initPatientMode]);

  if (!isClinicalUser) return null;

  if (collapsed) {
    return (
      <button
        onClick={handleToggle}
        title={isPatientMode ? roleLabel : 'Mi Salud'}
        className={clsx(
          'flex w-full items-center justify-center rounded-xl px-0 py-3 text-sm transition-all hover:cursor-pointer',
          isPatientMode
            ? 'text-emerald-700 hover:bg-emerald-50'
            : 'text-indigo-700 hover:bg-indigo-50',
        )}
      >
        {isPatientMode ? (
          <Stethoscope className="h-5 w-5" />
        ) : (
          <HeartPulse className="h-5 w-5" />
        )}
      </button>
    );
  }

  return (
    <div className="px-2 mb-4">
      <button
        onClick={handleToggle}
        disabled={initPatientMode.isPending}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left',
          isPatientMode
            ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
            : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
        )}
      >
        <div
          className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
            isPatientMode ? 'bg-emerald-200' : 'bg-indigo-200',
          )}
        >
          {isPatientMode ? (
            <Stethoscope className="w-4.5 h-4.5 text-emerald-700" />
          ) : (
            <HeartPulse className="w-4.5 h-4.5 text-indigo-700" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={clsx(
              'text-sm font-medium truncate',
              isPatientMode ? 'text-emerald-900' : 'text-indigo-900',
            )}
          >
            {isPatientMode ? roleLabel : 'Mi Salud'}
          </p>
          <p
            className={clsx(
              'text-xs',
              isPatientMode ? 'text-emerald-600' : 'text-indigo-600',
            )}
          >
            {isPatientMode
              ? 'Cambiar a panel clínico'
              : 'Ver mi historial de salud'}
          </p>
        </div>
        <ArrowRightLeft
          className={clsx(
            'w-4 h-4 flex-shrink-0',
            isPatientMode ? 'text-emerald-400' : 'text-indigo-400',
          )}
        />
      </button>

      {/* Active mode indicator bar */}
      <div
        className={clsx(
          'mt-2 rounded-full h-1.5 transition-colors',
          isPatientMode ? 'bg-indigo-200' : 'bg-emerald-200',
        )}
      >
        <div
          className={clsx(
            'h-1.5 rounded-full w-1/2 transition-all',
            isPatientMode ? 'bg-indigo-500 ml-auto' : 'bg-emerald-500',
          )}
        />
      </div>
    </div>
  );
}
