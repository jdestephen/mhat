'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Loader2 } from 'lucide-react';

import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PermissionSelector } from '@/components/doctor/PermissionSelector';
import { useMyHealthCenters } from '@/hooks/queries/useMyHealthCenters';

interface InviteAssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_PERMISSIONS = [
  'PATIENT_INFO_READ',
  'HEALTH_HISTORY_READ',
  'VITAL_SIGNS_READ',
  'RECORDS_READ',
  'DOCUMENTS_READ',
];

export function InviteAssistantModal({ open, onOpenChange }: InviteAssistantModalProps) {
  const queryClient = useQueryClient();
  const { data: healthCenters = [], isLoading: hcLoading } = useMyHealthCenters();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [healthCenterId, setHealthCenterId] = useState('');
  const [permissions, setPermissions] = useState<string[]>(DEFAULT_PERMISSIONS);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setHealthCenterId('');
    setPermissions(DEFAULT_PERMISSIONS);
    setError(null);
  }, []);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/doctor/assistants/invite', {
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        health_center_id: healthCenterId,
        permissions,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'assistants', 'invitations'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Error al enviar la invitación';
      setError(detail);
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!firstName.trim() || !lastName.trim()) {
        setError('El nombre y apellido son requeridos.');
        return;
      }
      if (!email.trim()) {
        setError('El correo electrónico es requerido.');
        return;
      }
      if (!healthCenterId) {
        setError('Selecciona un centro de salud.');
        return;
      }
      if (permissions.length === 0) {
        setError('Asigna al menos un permiso.');
        return;
      }

      inviteMutation.mutate();
    },
    [firstName, lastName, email, healthCenterId, permissions, inviteMutation],
  );

  // Auto-select HC if only one exists
  const effectiveHCId =
    healthCenterId || (healthCenters.length === 1 ? healthCenters[0].health_center_id : '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader onOpenChange={onOpenChange}>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Invitar Asistente
            </span>
          </DialogTitle>
          <DialogDescription>
            Enviaremos un correo con un enlace de activación
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="María"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="García"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico *
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="asistente@email.com"
            />
          </div>

          {/* Health Center */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Centro de Salud *
            </label>
            {hcLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando centros de salud...
              </div>
            ) : healthCenters.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                No tienes centros de salud. Crea uno primero desde tu perfil.
              </p>
            ) : healthCenters.length === 1 ? (
              <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                {healthCenters[0].health_center_name}
              </div>
            ) : (
              <select
                value={effectiveHCId}
                onChange={(e) => setHealthCenterId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Seleccionar...</option>
                {healthCenters.map((hc) => (
                  <option key={hc.health_center_id} value={hc.health_center_id}>
                    {hc.health_center_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permisos</label>
            <PermissionSelector
              value={permissions}
              onChange={setPermissions}
              disabled={inviteMutation.isPending}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { resetForm(); onOpenChange(false); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending || healthCenters.length === 0}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Enviar Invitación
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
