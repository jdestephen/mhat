'use client';

import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Loader2 } from 'lucide-react';

import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PermissionSelector } from '@/components/doctor/PermissionSelector';
import type { AssistantAssignment } from '@/hooks/queries/useMyAssistants';

interface EditPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: AssistantAssignment | null;
}

export function EditPermissionsModal({ open, onOpenChange, assignment }: EditPermissionsModalProps) {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sync permissions when assignment changes
  useEffect(() => {
    if (assignment) {
      setPermissions([...assignment.permissions]);
      setError(null);
    }
  }, [assignment]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/doctor/assistants/${assignment!.id}/permissions`, {
        permissions,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'assistants'] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Error al actualizar permisos';
      setError(detail);
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (permissions.length === 0) {
        setError('Asigna al menos un permiso.');
        return;
      }
      mutation.mutate();
    },
    [permissions, mutation],
  );

  if (!assignment) return null;

  const name = [assignment.assistant_first_name, assignment.assistant_last_name]
    .filter(Boolean)
    .join(' ') || assignment.assistant_email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader onOpenChange={onOpenChange}>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Editar Permisos
            </span>
          </DialogTitle>
          <DialogDescription>
            {name} — {assignment.health_center_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <PermissionSelector
            value={permissions}
            onChange={setPermissions}
            disabled={mutation.isPending}
          />

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              Guardar Permisos
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
