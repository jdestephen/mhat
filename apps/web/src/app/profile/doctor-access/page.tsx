'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useMyDoctors } from '@/hooks/queries/useMyDoctors';
import { useMyInvitations } from '@/hooks/queries/useMyInvitations';
import { useCreateInvitation } from '@/hooks/mutations/useCreateInvitation';
import { useRevokeInvitation } from '@/hooks/mutations/useRevokeInvitation';
import { useRevokeDoctorAccess } from '@/hooks/mutations/useRevokeDoctorAccess';
import { AccessLevel } from '@/types';
import {
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  X,
  Clock,
  Stethoscope,
  Trash2,
  KeyRound,
} from 'lucide-react';

export default function DoctorAccessPage() {
  const { data: doctors, isLoading: doctorsLoading } = useMyDoctors();
  const { data: invitations, isLoading: invitationsLoading } = useMyInvitations();
  const createInvitation = useCreateInvitation();
  const revokeInvitation = useRevokeInvitation();
  const revokeDoctorAccess = useRevokeDoctorAccess();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(AccessLevel.READ_ONLY);
  const [accessType, setAccessType] = useState<'PERMANENT' | 'TEMPORARY'>('PERMANENT');
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleCreateInvitation = async () => {
    try {
      const result = await createInvitation.mutateAsync({
        access_level: accessLevel,
        access_type: accessType,
        expires_in_days: accessType === 'TEMPORARY' ? expiresInDays : undefined,
      });
      setGeneratedCode(result.code);
    } catch {
      alert('Error al crear la invitación');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRevokeInvitation = async (id: string) => {
    if (!confirm('¿Estás seguro de revocar esta invitación?')) return;
    try {
      await revokeInvitation.mutateAsync(id);
    } catch {
      alert('Error al revocar la invitación');
    }
  };

  const handleRevokeDoctorAccess = async (accessId: string, doctorName: string) => {
    if (!confirm(`¿Revocar acceso de ${doctorName} a tus registros?`)) return;
    try {
      await revokeDoctorAccess.mutateAsync(accessId);
    } catch {
      alert('Error al revocar el acceso');
    }
  };

  const isLoading = doctorsLoading || invitationsLoading;

  // Filter invitations
  const pendingInvitations = invitations?.filter(
    (inv) => !inv.claimed_by && !inv.is_revoked && new Date(inv.code_expires_at) > new Date()
  ) || [];
  const claimedInvitations = invitations?.filter((inv) => inv.claimed_by) || [];
  const expiredOrRevoked = invitations?.filter(
    (inv) => inv.is_revoked || (!inv.claimed_by && new Date(inv.code_expires_at) <= new Date())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-emerald-950">Acceso Médico</h1>
          <p className="text-slate-500 mt-1">Gestiona qué doctores tienen acceso a tus registros</p>
        </div>
        <Button onClick={() => { setShowCreateForm(true); setGeneratedCode(null); }}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invitar Doctor
        </Button>
      </div>

      {/* Create Invitation Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              {generatedCode ? 'Código de Invitación' : 'Nueva Invitación'}
            </h2>
            <button onClick={() => { setShowCreateForm(false); setGeneratedCode(null); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {generatedCode ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500 mb-3">Comparte este código con tu doctor</p>
              <div className="inline-flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl px-6 py-4">
                <span className="text-3xl font-mono font-bold text-emerald-800 tracking-wider">
                  {generatedCode}
                </span>
                <button
                  onClick={() => handleCopyCode(generatedCode)}
                  className="p-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors"
                >
                  {copiedCode === generatedCode ? (
                    <Check className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-emerald-700" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                El código expira en 24 horas • Solo puede ser usado una vez
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {accessLevel === AccessLevel.WRITE ? (
                    <><ShieldAlert className="w-3 h-3" /> Lectura y Escritura</>
                  ) : (
                    <><ShieldCheck className="w-3 h-3" /> Solo Lectura</>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  {accessType === 'PERMANENT' ? 'Acceso Permanente' : `${expiresInDays} días`}
                </span>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setShowCreateForm(false); setGeneratedCode(null); }}
              >
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nivel de Acceso</label>
                  <Select
                    value={accessLevel}
                    onChange={(val) => setAccessLevel(val as AccessLevel)}
                    options={[
                      { value: AccessLevel.READ_ONLY, label: 'Solo Lectura' },
                      { value: AccessLevel.WRITE, label: 'Lectura y Escritura' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duración</label>
                  <Select
                    value={accessType}
                    onChange={(val) => setAccessType(val as 'PERMANENT' | 'TEMPORARY')}
                    options={[
                      { value: 'PERMANENT', label: 'Permanente' },
                      { value: 'TEMPORARY', label: 'Temporal' },
                    ]}
                  />
                </div>
                {accessType === 'TEMPORARY' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Días de Acceso</label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>

              {accessLevel === AccessLevel.WRITE && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Escritura</strong> permite al doctor crear registros médicos
                    y verificar los que tú hayas creado.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancelar</Button>
                <Button
                  onClick={handleCreateInvitation}
                  disabled={createInvitation.isPending}
                >
                  {createInvitation.isPending ? 'Generando...' : 'Generar Código'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Doctors */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-emerald-700" />
          Doctores con Acceso ({doctors?.length || 0})
        </h2>
        {!doctors?.length ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Ningún doctor tiene acceso a tus registros</p>
            <p className="text-sm text-slate-400 mt-1">Crea una invitación para compartir acceso</p>
          </div>
        ) : (
          <div className="space-y-3">
            {doctors.map((doc) => (
              <div
                key={doc.access_id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center justify-between hover:border-emerald-200 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{doc.doctor_name}</p>
                    {doc.specialty && <p className="text-sm text-slate-500">{doc.specialty}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${
                      doc.access_level === 'WRITE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {doc.access_level === 'WRITE' ? (
                        <><ShieldAlert className="w-3 h-3" /> Escritura</>
                      ) : (
                        <><ShieldCheck className="w-3 h-3" /> Lectura</>
                      )}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${
                      doc.access_type === 'TEMPORARY'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {doc.access_type === 'TEMPORARY' ? 'Temporal' : 'Permanente'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRevokeDoctorAccess(doc.access_id, doc.doctor_name)}
                    className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Revocar acceso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Invitaciones Pendientes ({pendingInvitations.length})
          </h2>
          <div className="space-y-3">
            {pendingInvitations.map((inv) => {
              const expiresAt = new Date(inv.code_expires_at);
              const now = new Date();
              const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));

              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-amber-50 rounded-lg px-3 py-2">
                      <span className="font-mono font-bold text-amber-800 text-lg tracking-wider">{inv.code}</span>
                    </div>
                    <div>
                      <div className="flex gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          inv.access_level === AccessLevel.WRITE
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {inv.access_level === AccessLevel.WRITE ? 'Escritura' : 'Lectura'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          inv.access_type === 'TEMPORARY'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {inv.access_type === 'TEMPORARY' ? `${inv.expires_in_days}d` : 'Permanente'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Expira en {hoursLeft}h
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyCode(inv.code)}
                      className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Copiar código"
                    >
                      {copiedCode === inv.code ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRevokeInvitation(inv.id)}
                      className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Revocar invitación"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* History */}
      {(claimedInvitations.length > 0 || expiredOrRevoked.length > 0) && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Historial ({claimedInvitations.length + expiredOrRevoked.length})
          </h2>
          <div className="space-y-2">
            {[...claimedInvitations, ...expiredOrRevoked].map((inv) => (
              <div
                key={inv.id}
                className="bg-slate-50 rounded-lg border border-slate-200 p-3 flex items-center justify-between opacity-70"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-slate-500">{inv.code}</span>
                  {inv.claimed_by ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Utilizada</span>
                  ) : inv.is_revoked ? (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Revocada</span>
                  ) : (
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Expirada</span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(inv.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
