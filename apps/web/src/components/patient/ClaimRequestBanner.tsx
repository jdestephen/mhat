'use client';

import React from 'react';
import { usePatientClaimRequests } from '@/hooks/queries/useClaimRequests';
import { Stethoscope, Link2 } from 'lucide-react';

export function ClaimRequestBanner() {
  const { data: claims } = usePatientClaimRequests();

  const pendingClaims = claims?.filter((c) => c.status === 'PENDING') || [];
  if (pendingClaims.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {pendingClaims.map((claim) => (
        <div
          key={claim.id}
          className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl"
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              {claim.doctor_name ? `Dr. ${claim.doctor_name}` : 'Un médico'} creó un perfil médico para ti
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Perfil: {claim.patient_name}
              {claim.patient_email && ` · ${claim.patient_email}`}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium">
            <Link2 className="w-3.5 h-3.5" />
            Pendiente de aprobación
          </div>
        </div>
      ))}
    </div>
  );
}
