'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Calendar,
} from 'lucide-react';

import api from '@/lib/api';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useActiveMode } from '@/hooks/useActiveMode';
import { useMyAssistants } from '@/hooks/queries/useMyAssistants';
import { useAssistantInvitations } from '@/hooks/queries/useAssistantInvitations';
import { UserRole } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AssistantCard } from '@/components/doctor/AssistantCard';
import { InviteAssistantModal } from '@/components/doctor/InviteAssistantModal';
import { EditPermissionsModal } from '@/components/doctor/EditPermissionsModal';
import { PermissionBadges } from '@/components/doctor/PermissionSelector';
import type { AssistantAssignment } from '@/hooks/queries/useMyAssistants';
import type { AssistantInvitation } from '@/hooks/queries/useAssistantInvitations';

export default function AssistantsPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { isClinicalUser, isInPatientMode } = useActiveMode();

  const { data: assistants = [], isLoading: assistantsLoading } = useMyAssistants();
  const { data: invitations = [], isLoading: invitationsLoading } = useAssistantInvitations();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editAssignment, setEditAssignment] = useState<AssistantAssignment | null>(null);

  // Guard: only doctors (not assistants) in clinical mode
  if (!userLoading && (!isClinicalUser || isInPatientMode || user?.role !== UserRole.DOCTOR)) {
    router.replace('/doctor');
    return null;
  }

  const activeAssistants = assistants.filter((a) => a.is_active);
  const inactiveAssistants = assistants.filter((a) => !a.is_active);

  const pendingInvitations = invitations.filter(
    (inv) => !inv.claimed_at && !inv.is_revoked && new Date(inv.expires_at) > new Date(),
  );
  const pastInvitations = invitations.filter(
    (inv) => inv.claimed_at || inv.is_revoked || new Date(inv.expires_at) <= new Date(),
  );

  if (userLoading || assistantsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-emerald-950 flex items-center gap-3">
              <Users className="w-7 h-7" />
              Asistentes
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Gestiona los asistentes de tu equipo clínico
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Invitar Asistente</span>
            <span className="sm:hidden">Invitar</span>
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              <span className="flex items-center gap-2">
                Asistentes
                {activeAssistants.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {activeAssistants.length}
                  </span>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="invitations">
              <span className="flex items-center gap-2">
                Invitaciones
                {pendingInvitations.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {pendingInvitations.length}
                  </span>
                )}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Active Assistants */}
          <TabsContent value="active">
            <div className="space-y-4 mt-6">
              {activeAssistants.length === 0 && inactiveAssistants.length === 0 ? (
                <EmptyState onInvite={() => setShowInviteModal(true)} />
              ) : (
                <>
                  {activeAssistants.map((a) => (
                    <AssistantCard
                      key={a.id}
                      assignment={a}
                      onEditPermissions={setEditAssignment}
                    />
                  ))}

                  {inactiveAssistants.length > 0 && (
                    <>
                      <div className="flex items-center gap-3 pt-4">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Inactivos ({inactiveAssistants.length})
                        </span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                      {inactiveAssistants.map((a) => (
                        <AssistantCard
                          key={a.id}
                          assignment={a}
                          onEditPermissions={setEditAssignment}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Invitations */}
          <TabsContent value="invitations">
            <div className="space-y-4 mt-6">
              {invitationsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No hay invitaciones aún</p>
                </div>
              ) : (
                <>
                  {pendingInvitations.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Pendientes
                      </h3>
                      {pendingInvitations.map((inv) => (
                        <InvitationCard key={inv.id} invitation={inv} />
                      ))}
                    </>
                  )}

                  {pastInvitations.length > 0 && (
                    <>
                      <div className="flex items-center gap-3 pt-2">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Historial
                        </span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                      {pastInvitations.map((inv) => (
                        <InvitationCard key={inv.id} invitation={inv} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <InviteAssistantModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
      />
      <EditPermissionsModal
        open={!!editAssignment}
        onOpenChange={(open) => { if (!open) setEditAssignment(null); }}
        assignment={editAssignment}
      />
    </>
  );
}

// ── Empty State ──

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Sin asistentes aún
      </h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
        Invita a un asistente para que te ayude a gestionar la información de tus pacientes.
        Podrás controlar exactamente qué permisos tiene cada asistente.
      </p>
      <button
        onClick={onInvite}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Invitar Primer Asistente
      </button>
    </div>
  );
}

// ── Invitation Card ──

function InvitationCard({ invitation }: { invitation: AssistantInvitation }) {
  const queryClient = useQueryClient();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const isPending =
    !invitation.claimed_at &&
    !invitation.is_revoked &&
    new Date(invitation.expires_at) > new Date();

  const isClaimed = !!invitation.claimed_at;
  const isExpired = !isClaimed && !invitation.is_revoked && new Date(invitation.expires_at) <= new Date();

  const revokeMutation = useMutation({
    mutationFn: () => api.delete(`/doctor/assistants/invitations/${invitation.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'assistants', 'invitations'] });
      setConfirmRevoke(false);
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`
        rounded-xl border p-4 transition-all
        ${isPending
          ? 'border-amber-200 bg-amber-50/50'
          : isClaimed
            ? 'border-emerald-200 bg-emerald-50/50'
            : 'border-gray-200 bg-gray-50 opacity-70'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm
              ${isPending ? 'bg-amber-500' : isClaimed ? 'bg-emerald-500' : 'bg-gray-400'}
            `}
          >
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              {invitation.first_name} {invitation.last_name}
            </h4>
            <p className="text-xs text-gray-500">{invitation.email}</p>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${isPending
              ? 'bg-amber-100 text-amber-700'
              : isClaimed
                ? 'bg-emerald-100 text-emerald-700'
                : invitation.is_revoked
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-200 text-gray-600'
            }
          `}
        >
          {isPending && <><Clock className="w-3 h-3" /> Pendiente</>}
          {isClaimed && <><CheckCircle2 className="w-3 h-3" /> Activada</>}
          {invitation.is_revoked && <><XCircle className="w-3 h-3" /> Revocada</>}
          {isExpired && <><AlertCircle className="w-3 h-3" /> Expirada</>}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          {invitation.health_center_name}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Enviada: {formatDate(invitation.created_at)}
        </span>
        {isPending && (
          <span className="flex items-center gap-1 text-amber-600">
            <Clock className="w-3 h-3" />
            Expira: {formatDate(invitation.expires_at)}
          </span>
        )}
      </div>

      {/* Permissions */}
      <div className="mt-3">
        <PermissionBadges permissions={invitation.permissions} />
      </div>

      {/* Revoke action */}
      {isPending && (
        <div className="mt-3 pt-3 border-t border-amber-200/50">
          {confirmRevoke ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">¿Revocar invitación?</span>
              <button
                onClick={() => revokeMutation.mutate()}
                disabled={revokeMutation.isPending}
                className="px-3 py-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50"
              >
                {revokeMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Sí, revocar'
                )}
              </button>
              <button
                onClick={() => setConfirmRevoke(false)}
                className="px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRevoke(true)}
              className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              Revocar Invitación
            </button>
          )}
        </div>
      )}
    </div>
  );
}
