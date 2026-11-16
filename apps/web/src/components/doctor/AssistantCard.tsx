'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Mail,
  Calendar,
  Shield,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Loader2,
  Building2,
} from 'lucide-react';

import api from '@/lib/api';
import { PermissionBadges } from '@/components/doctor/PermissionSelector';
import type { AssistantAssignment } from '@/hooks/queries/useMyAssistants';

interface AssistantCardProps {
  assignment: AssistantAssignment;
  onEditPermissions: (assignment: AssistantAssignment) => void;
}

export function AssistantCard({ assignment, onEditPermissions }: AssistantCardProps) {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'reactivate' | null>(null);

  const name = [assignment.assistant_first_name, assignment.assistant_last_name]
    .filter(Boolean)
    .join(' ') || 'Sin nombre';

  const deactivateMutation = useMutation({
    mutationFn: () => api.post(`/doctor/assistants/${assignment.id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'assistants'] });
      setConfirmAction(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => api.post(`/doctor/assistants/${assignment.id}/reactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'assistants'] });
      setConfirmAction(null);
    },
  });

  const handleAction = useCallback(() => {
    if (confirmAction === 'deactivate') deactivateMutation.mutate();
    if (confirmAction === 'reactivate') reactivateMutation.mutate();
  }, [confirmAction, deactivateMutation, reactivateMutation]);

  const isPending = deactivateMutation.isPending || reactivateMutation.isPending;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`
        relative rounded-xl border p-5 transition-all
        ${assignment.is_active
          ? 'border-gray-200 bg-white hover:shadow-sm'
          : 'border-gray-200 bg-gray-50 opacity-75'
        }
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm
              ${assignment.is_active ? 'bg-emerald-600' : 'bg-gray-400'}
            `}
          >
            {(assignment.assistant_first_name?.[0] ?? 'A').toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{name}</h3>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Mail className="w-3.5 h-3.5" />
              {assignment.assistant_email}
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <span
          className={`
            inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
            ${assignment.is_active
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-200 text-gray-600'
            }
          `}
        >
          {assignment.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4 mb-3 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          {assignment.health_center_name}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Desde {formatDate(assignment.created_at)}
        </span>
      </div>

      {/* Deactivated warning */}
      {!assignment.is_active && assignment.deactivated_at && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Desactivado el {formatDate(assignment.deactivated_at)}</span>
        </div>
      )}

      {/* Permissions */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Permisos</p>
        <PermissionBadges permissions={assignment.permissions} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        {assignment.is_active ? (
          <>
            <button
              onClick={() => onEditPermissions(assignment)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4" />
              Editar Permisos
            </button>
            {confirmAction === 'deactivate' ? (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-red-600">¿Confirmar?</span>
                <button
                  onClick={handleAction}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sí'}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmAction('deactivate')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
              >
                <ToggleRight className="w-4 h-4" />
                Desactivar
              </button>
            )}
          </>
        ) : (
          <>
            {confirmAction === 'reactivate' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-600">¿Reactivar?</span>
                <button
                  onClick={handleAction}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sí'}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmAction('reactivate')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <ToggleLeft className="w-4 h-4" />
                Reactivar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
