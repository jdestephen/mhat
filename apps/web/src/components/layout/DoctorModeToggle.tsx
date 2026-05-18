'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { Stethoscope, HeartPulse } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';

interface DoctorModeToggleProps {
  collapsed?: boolean;
}

/**
 * Toggle for doctors to switch between their clinical dashboard
 * and their personal patient dashboard. Calls the doctor-patient-init
 * endpoint to ensure a patient profile exists.
 */
export function DoctorModeToggle({ collapsed = false }: DoctorModeToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isPatientMode, setIsPatientMode] = useState(
    pathname?.startsWith('/dashboard') || pathname?.startsWith('/profile')
  );

  const initPatientMode = useMutation({
    mutationFn: async () => {
      const res = await api.post('/family/doctor-patient-init');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'profiles'] });
      setIsPatientMode(true);
      router.push('/dashboard');
    },
  });

  const handleToggle = () => {
    if (isPatientMode) {
      setIsPatientMode(false);
      router.push('/doctor');
    } else {
      initPatientMode.mutate();
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={handleToggle}
        title={isPatientMode ? 'Modo Doctor' : 'Mi Salud'}
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
            ? 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
            : 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100',
        )}
      >
        <div className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isPatientMode ? 'bg-emerald-200' : 'bg-indigo-200',
        )}>
          {isPatientMode ? (
            <Stethoscope className="w-4.5 h-4.5 text-emerald-700" />
          ) : (
            <HeartPulse className="w-4.5 h-4.5 text-indigo-700" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={clsx(
            'text-sm font-medium truncate',
            isPatientMode ? 'text-emerald-900' : 'text-indigo-900',
          )}>
            {isPatientMode ? 'Modo Doctor' : 'Mi Salud'}
          </p>
          <p className={clsx(
            'text-xs',
            isPatientMode ? 'text-emerald-600' : 'text-indigo-600',
          )}>
            {isPatientMode
              ? 'Cambiar a panel clínico'
              : 'Ver mi historial de salud'}
          </p>
        </div>
      </button>
    </div>
  );
}
