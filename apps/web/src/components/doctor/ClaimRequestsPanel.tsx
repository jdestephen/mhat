'use client';

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDoctorClaimRequests, ClaimRequestSummary } from '@/hooks/queries/useClaimRequests';
import api from '@/lib/api';
import { Check, X, UserCircle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ClaimRequestsPanel() {
  const { data: claims, isLoading } = useDoctorClaimRequests();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async (claimId: string) => {
      await api.post(`/doctor/claim-requests/${claimId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'claim-requests'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', 'patients'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (claimId: string) => {
      await api.post(`/doctor/claim-requests/${claimId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'claim-requests'] });
    },
  });

  if (isLoading || !claims || claims.length === 0) return null;

  return (
    <div className="mb-8 bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center">
          <Link2 className="w-4 h-4 text-amber-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-amber-900">
            Solicitudes de Vinculación
          </h3>
          <p className="text-xs text-amber-600">
            {claims.length} solicitud{claims.length > 1 ? 'es' : ''} pendiente{claims.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {claims.map((claim) => (
          <ClaimRequestRow
            key={claim.id}
            claim={claim}
            onApprove={() => approveMutation.mutate(claim.id)}
            onReject={() => rejectMutation.mutate(claim.id)}
            isApproving={approveMutation.isPending}
            isRejecting={rejectMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function ClaimRequestRow({
  claim,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  claim: ClaimRequestSummary;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
        <UserCircle className="w-6 h-6 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">
          {claim.requesting_user_name || 'Usuario'}
        </p>
        <p className="text-xs text-slate-500">
          {claim.requesting_user_email} → solicita vincular &quot;{claim.patient_name}&quot;
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {new Date(claim.requested_at).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          onClick={onApprove}
          disabled={isApproving || isRejecting}
          className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Check className="w-3.5 h-3.5 mr-1" />
          Aprobar
        </Button>
        <Button
          onClick={onReject}
          disabled={isApproving || isRejecting}
          variant="outline"
          className="h-8 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Rechazar
        </Button>
      </div>
    </div>
  );
}
