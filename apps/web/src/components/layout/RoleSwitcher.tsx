'use client';

import React, { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Stethoscope, HeartPulse, ArrowRightLeft } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useActiveMode } from '@/hooks/useActiveMode';
import { UserRole } from '@/types';

interface RoleSwitcherProps {
  collapsed?: boolean;
}

/**
 * Toggle for doctors/assistants to switch between their clinical dashboard
 * and their personal patient dashboard.
 *
 * - Uses ActiveModeContext for reactive state (all components update instantly)
 * - Calls `/family/doctor-patient-init` to ensure patient profile exists
 * - Navigates to the correct landing page on switch
 */
export function RoleSwitcher({ collapsed = false }: RoleSwitcherProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { isInPatientMode, isClinicalUser, setActiveMode } = useActiveMode();

  const roleLabel =
    user?.role === UserRole.DOCTOR ? 'Modo Doctor' : 'Modo Asistente';

  const initPatientMode = useMutation({
    mutationFn: async () => {
      const res = await api.post('/family/doctor-patient-init');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'profiles'] });
      setActiveMode('patient');
      router.push('/dashboard');
    },
  });

  const handleToggle = useCallback(() => {
    if (isInPatientMode) {
      // Switch to clinical mode → navigate to doctor panel
      setActiveMode('clinical');
      router.push('/doctor');
    } else {
      // Switch to patient mode → init patient profile + navigate
      initPatientMode.mutate();
    }
  }, [isInPatientMode, router, setActiveMode, initPatientMode]);

  if (!isClinicalUser) return null;

  if (collapsed) {
    return (
      <button
        onClick={handleToggle}
        title={isInPatientMode ? roleLabel : 'Mi Salud'}
        className={clsx(
          'flex w-full items-center justify-center rounded-xl px-0 py-3 text-sm transition-all hover:cursor-pointer',
          isInPatientMode
            ? 'text-emerald-700 hover:bg-emerald-50'
            : 'text-indigo-700 hover:bg-indigo-50',
        )}
      >
        {isInPatientMode ? (
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
          isInPatientMode
            ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
            : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
        )}
      >
        <div
          className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
            isInPatientMode ? 'bg-emerald-200' : 'bg-indigo-200',
          )}
        >
          {isInPatientMode ? (
            <Stethoscope className="w-4.5 h-4.5 text-emerald-700" />
          ) : (
            <HeartPulse className="w-4.5 h-4.5 text-indigo-700" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={clsx(
              'text-sm font-medium truncate',
              isInPatientMode ? 'text-emerald-900' : 'text-indigo-900',
            )}
          >
            {isInPatientMode ? roleLabel : 'Mi Salud'}
          </p>
          <p
            className={clsx(
              'text-xs',
              isInPatientMode ? 'text-emerald-600' : 'text-indigo-600',
            )}
          >
            {isInPatientMode
              ? 'Cambiar a panel clínico'
              : 'Ver mi historial de salud'}
          </p>
        </div>
        <ArrowRightLeft
          className={clsx(
            'w-4 h-4 flex-shrink-0',
            isInPatientMode ? 'text-emerald-400' : 'text-indigo-400',
          )}
        />
      </button>

      {/* Active mode indicator bar */}
      <div
        className={clsx(
          'mt-2 rounded-full h-1.5 transition-colors',
          isInPatientMode ? 'bg-indigo-200' : 'bg-emerald-200',
        )}
      >
        <div
          className={clsx(
            'h-1.5 rounded-full w-1/2 transition-all',
            isInPatientMode ? 'bg-indigo-500 ml-auto' : 'bg-emerald-500',
          )}
        />
      </div>
    </div>
  );
}
