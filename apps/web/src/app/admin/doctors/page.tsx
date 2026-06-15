'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  Hash,
  Calendar,
  Shield,
  Loader2,
  FileText,
  Eye,
  Cpu,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { DoctorApprovalStatus } from '@/types';
import api from '@/lib/api';

interface DoctorApplication {
  profile_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  college_number: string | null;
  verification_phone: string | null;
  approval_status: DoctorApprovalStatus;
  registered_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  // Document verification
  identity_document_url: string | null;
  college_document_url: string | null;
  ocr_extracted_data: {
    identity?: {
      extracted_dni?: string | null;
      extracted_name?: string | null;
      confidence?: number;
      raw_text?: string;
    };
    college?: {
      extracted_college_number?: string | null;
      extracted_name?: string | null;
      confidence?: number;
      raw_text?: string;
    };
  } | null;
  ocr_processed: boolean;
  verification_notes: string | null;
}

const STATUS_CONFIG = {
  [DoctorApprovalStatus.PENDING]: {
    label: 'Pendiente',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
  },
  [DoctorApprovalStatus.APPROVED]: {
    label: 'Aprobado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle,
  },
  [DoctorApprovalStatus.REJECTED]: {
    label: 'Rechazado',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: XCircle,
  },
};

export default function AdminDoctorsPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [applications, setApplications] = useState<DoctorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DoctorApprovalStatus | 'ALL'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Rejection modal
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const getFullDocUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('/static/')) {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
      return `${backendUrl}${url}`;
    }
    return url;
  };

  const fetchApplications = useCallback(async () => {
    try {
      const params = filter !== 'ALL' ? { status: filter } : {};
      const res = await api.get('/admin/doctors', { params });
      setApplications(res.data);
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!userLoading && user && !user.is_admin) {
      router.replace('/dashboard');
      return;
    }
    if (user?.is_admin) {
      fetchApplications();
    }
  }, [user, userLoading, router, fetchApplications]);

  const handleApprove = async (profileId: string) => {
    setActionLoading(profileId);
    try {
      await api.post(`/admin/doctors/${profileId}/approve`);
      await fetchApplications();
    } catch {
      // handled silently
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionLoading(rejectTarget);
    try {
      await api.post(`/admin/doctors/${rejectTarget}/reject`, {
        reason: rejectReason.trim(),
      });
      setRejectTarget(null);
      setRejectReason('');
      await fetchApplications();
    } catch {
      // handled silently
    } finally {
      setActionLoading(null);
    }
  };

  if (userLoading || !user?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const pendingCount = applications.filter(
    (a) => a.approval_status === DoctorApprovalStatus.PENDING
  ).length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Shield className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Médicos
            </h1>
            <p className="text-sm text-gray-500">
              Revisa y aprueba las solicitudes de registro de médicos
            </p>
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-sm font-medium">
            <Clock className="w-4 h-4" />
            {pendingCount} {pendingCount === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
        {[
          { value: 'ALL' as const, label: 'Todos' },
          { value: DoctorApprovalStatus.PENDING, label: 'Pendientes' },
          { value: DoctorApprovalStatus.APPROVED, label: 'Aprobados' },
          { value: DoctorApprovalStatus.REJECTED, label: 'Rechazados' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setFilter(tab.value);
              setLoading(true);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === tab.value
                ? 'bg-emerald-100 text-emerald-800'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No hay solicitudes</p>
          <p className="text-gray-400 text-sm mt-1">
            {filter === DoctorApprovalStatus.PENDING
              ? 'No hay solicitudes pendientes de revisión.'
              : 'No se encontraron registros con este filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const statusConf = STATUS_CONFIG[app.approval_status];
            const StatusIcon = statusConf.icon;
            const isProcessing = actionLoading === app.profile_id;

            return (
              <div
                key={app.profile_id}
                className={`border rounded-xl p-5 transition-colors ${statusConf.border} ${statusConf.bg}/30`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Doctor info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {app.first_name} {app.last_name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.bg} ${statusConf.text}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConf.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{app.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>
                          Colegiación:{' '}
                          <span className="font-medium text-gray-900">
                            {app.college_number || '—'}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{app.verification_phone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>
                          {new Date(app.registered_at).toLocaleDateString('es-HN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {app.rejection_reason && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-700 text-xs">
                          <span className="font-medium">Razón de rechazo:</span>{' '}
                          {app.rejection_reason}
                        </p>
                      </div>
                    )}

                    {/* Document Verification Section */}
                    {(app.identity_document_url || app.college_document_url || app.ocr_processed) && (
                      <div className="mt-3 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                        <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          Documentos de Verificación
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Identity Document */}
                          {app.identity_document_url && (
                            <a
                              href={getFullDocUrl(app.identity_document_url) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-md hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors group"
                            >
                              <div className="w-10 h-10 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                                <Eye className="w-5 h-5 text-blue-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-700 group-hover:text-emerald-700">
                                  Doc. de Identidad
                                </p>
                                <p className="text-[10px] text-slate-400">Clic para ver</p>
                              </div>
                            </a>
                          )}

                          {/* College Document */}
                          {app.college_document_url && (
                            <a
                              href={getFullDocUrl(app.college_document_url) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-md hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors group"
                            >
                              <div className="w-10 h-10 bg-purple-50 rounded flex items-center justify-center flex-shrink-0">
                                <Eye className="w-5 h-5 text-purple-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-700 group-hover:text-emerald-700">
                                  Constancia Colegiación
                                </p>
                                <p className="text-[10px] text-slate-400">Clic para ver</p>
                              </div>
                            </a>
                          )}
                        </div>

                        {/* OCR Results */}
                        {app.ocr_processed && app.ocr_extracted_data && (
                          <div className="mt-2 p-2 bg-white border border-slate-200 rounded-md">
                            <p className="text-[10px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                              <Cpu className="w-3 h-3" />
                              Datos extraídos por OCR
                            </p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              {app.ocr_extracted_data.identity?.extracted_dni && (
                                <div>
                                  <span className="text-slate-400">DNI:</span>{' '}
                                  <span className="font-medium text-slate-700">
                                    {app.ocr_extracted_data.identity.extracted_dni}
                                  </span>
                                  {app.college_number && app.ocr_extracted_data.identity.extracted_dni !== app.college_number && (
                                    <span className="text-amber-500 ml-1" title="Difiere del dato manual">⚠</span>
                                  )}
                                </div>
                              )}
                              {app.ocr_extracted_data.identity?.extracted_name && (
                                <div>
                                  <span className="text-slate-400">Nombre:</span>{' '}
                                  <span className="font-medium text-slate-700">
                                    {app.ocr_extracted_data.identity.extracted_name}
                                  </span>
                                </div>
                              )}
                              {app.ocr_extracted_data.college?.extracted_college_number && (
                                <div>
                                  <span className="text-slate-400">Colegiación:</span>{' '}
                                  <span className="font-medium text-slate-700">
                                    {app.ocr_extracted_data.college.extracted_college_number}
                                  </span>
                                  {app.college_number && app.ocr_extracted_data.college.extracted_college_number !== app.college_number && (
                                    <span className="text-amber-500 ml-1" title="Difiere del dato manual">⚠</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {app.approval_status === DoctorApprovalStatus.PENDING && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(app.profile_id)}
                        disabled={isProcessing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        )}
                        Aprobar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectTarget(app.profile_id)}
                        disabled={isProcessing}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Rechazar Solicitud
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Proporciona una razón para el rechazo. El médico recibirá esta información
              por correo electrónico.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Razón del rechazo..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === rejectTarget}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading === rejectTarget ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <XCircle className="w-4 h-4 mr-1" />
                )}
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
