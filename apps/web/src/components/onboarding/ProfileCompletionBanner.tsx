'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserCircle, X } from 'lucide-react';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

export function ProfileCompletionBanner() {
  const { isProfileComplete, completionPercentage, isLoading } = useOnboardingStatus();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || isProfileComplete || dismissed) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <UserCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-amber-900">
                Tu perfil está incompleto
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Completar tu información personal ayuda a tus médicos a
                brindarte mejor atención.
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-xs font-medium text-amber-700 flex-shrink-0">
              {completionPercentage}%
            </span>
          </div>
          <Link
            href="/profile/me"
            className="inline-block mt-3 text-xs font-medium text-amber-800 hover:text-amber-950 underline underline-offset-2 transition-colors"
          >
            Completar perfil →
          </Link>
        </div>
      </div>
    </div>
  );
}
