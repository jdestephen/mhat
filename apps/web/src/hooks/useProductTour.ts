'use client';

import { useCallback, useEffect, useRef } from 'react';
import { driver, type DriveStep, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { setTourCompleted } from '@/hooks/useOnboardingStatus';

/** Check if we're on a mobile viewport */
function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 1024;
}

const DESKTOP_STEPS: DriveStep[] = [
  {
    element: '#nav-dashboard',
    popover: {
      title: 'Tu Panel Principal',
      description:
        'Aquí verás todos tus registros médicos: consultas, diagnósticos y documentos.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#nav-new-record',
    popover: {
      title: 'Nuevo Registro',
      description:
        'Crea registros de tus visitas médicas. Puedes agregar diagnósticos, notas, y subir documentos como recetas o resultados de laboratorio.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#nav-vital-signs',
    popover: {
      title: 'Signos Vitales',
      description:
        'Lleva un seguimiento de tu presión arterial, temperatura, peso, glucosa y más.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#nav-health-history',
    popover: {
      title: 'Historial de Salud',
      description:
        'Registra tus condiciones médicas, alergias, medicamentos y hábitos. Esta información ayuda a tus médicos a brindarte mejor atención.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#nav-doctor-access',
    popover: {
      title: 'Acceso Médico',
      description:
        'Comparte tu historial médico con tu doctor de forma segura. Tú controlas quién puede ver tu información.',
      side: 'right',
      align: 'start',
    },
  },
];

const MOBILE_STEPS: DriveStep[] = [
  {
    element: '[aria-label="Abrir menú"]',
    popover: {
      title: 'Menú de Navegación',
      description:
        'Toca aquí para acceder a todas las secciones de la app: panel, registros, signos vitales, perfil y más.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    popover: {
      title: '📋 Tu Historial Médico',
      description:
        'En MHAT puedes crear registros de tus consultas, subir documentos médicos, y llevar un seguimiento de tus signos vitales.',
    },
  },
  {
    popover: {
      title: '🩺 Historial de Salud',
      description:
        'Registra tus condiciones, alergias y medicamentos. Esta información la puedes reportar tú mismo y un médico puede verificarla.',
    },
  },
  {
    popover: {
      title: '🔐 Acceso Médico',
      description:
        'Comparte tu historial con tu doctor de forma segura. Solo tú decides quién tiene acceso a tu información.',
    },
  },
];

const TOUR_CONFIG: Config = {
  showProgress: true,
  animate: true,
  overlayColor: 'rgba(0, 0, 0, 0.6)',
  stagePadding: 8,
  stageRadius: 12,
  popoverClass: 'mhat-tour-popover',
  nextBtnText: 'Siguiente',
  prevBtnText: 'Anterior',
  doneBtnText: '¡Listo!',
  progressText: '{{current}} de {{total}}',
  onDestroyed: () => {
    setTourCompleted();
  },
};

export function useProductTour() {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  const startTour = useCallback(() => {
    // Small delay to ensure DOM elements are rendered
    setTimeout(() => {
      const steps = isMobile() ? MOBILE_STEPS : DESKTOP_STEPS;

      driverRef.current = driver({
        ...TOUR_CONFIG,
        steps,
      });

      driverRef.current.drive();
    }, 400);
  }, []);

  return { startTour };
}
