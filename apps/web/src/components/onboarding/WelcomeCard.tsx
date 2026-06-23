'use client';

import React from 'react';
import Link from 'next/link';
import {
  UserCircle,
  Heart,
  FilePlus2,
  Compass,
  CheckCircle2,
  Stethoscope,
} from 'lucide-react';

import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useProductTour } from '@/hooks/useProductTour';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useActiveProfile } from '@/hooks/useActiveProfile';

interface ActionCard {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  isComplete: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function WelcomeCard() {
  const { data: user } = useCurrentUser();
  const { activeProfile, isManagingOther } = useActiveProfile();
  const { isProfileComplete, isHealthHistoryStarted, hasCompletedTour } = useOnboardingStatus();
  const { startTour } = useProductTour();

  const cards: ActionCard[] = [
    {
      icon: UserCircle,
      title: 'Completar mi perfil',
      description: 'Agrega tu información personal y de contacto.',
      href: '/profile/me',
      isComplete: isProfileComplete,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    },
    {
      icon: Heart,
      title: 'Historial de salud',
      description: 'Registra condiciones, alergias y medicamentos.',
      href: '/profile/health-history',
      isComplete: isHealthHistoryStarted,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      icon: FilePlus2,
      title: 'Crear mi primer registro',
      description: 'Documenta una consulta o visita médica.',
      href: '/records/new',
      isComplete: false, // always actionable
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
    },
    {
      icon: Compass,
      title: 'Recorrido de la app',
      description: 'Te mostramos las secciones principales.',
      onClick: startTour,
      isComplete: hasCompletedTour,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    },
  ];

  const displayName = isManagingOther
    ? activeProfile?.first_name
    : user?.first_name;

  const greeting = displayName
    ? `¡Hola, ${displayName}!`
    : '¡Bienvenido!';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-6 h-6 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {greeting}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Tu historial médico personal, seguro y accesible. Estos son los
            primeros pasos para comenzar.
          </p>
        </div>
      </div>

      {/* Info banner explaining self-reported data */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6">
        <p className="text-xs text-blue-700">
          💡 <span className="font-medium">¿Por qué puedo ingresar mi información médica?</span>{' '}
          Numa te permite registrar tu propia información de salud para que
          esté disponible cuando la necesites. Los datos que ingreses serán
          marcados como &quot;auto-reportados&quot; y un médico podrá
          verificarlos.
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const content = (
            <div
              className={`group relative rounded-xl p-4 border ${card.borderColor} ${card.bgColor}/50 hover:${card.bgColor} transition-all duration-200 hover:shadow-sm cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg ${card.bgColor} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {card.title}
                    </h3>
                    {card.isComplete && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          );

          if (card.href) {
            return (
              <Link key={card.title} href={card.href}>
                {content}
              </Link>
            );
          }

          return (
            <div key={card.title} onClick={card.onClick}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
