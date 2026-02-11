'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api, { getDocumentUrl } from '@/lib/api';
import { Clock, User, FileText, Calendar, Paperclip, AlertCircle, ExternalLink } from 'lucide-react';

interface SharedRecord {
  id: string;
  motive: string;
  diagnosis?: string;
  category?: { id: number; name: string };
  notes?: string;
  tags?: string[];
  status: string;
  created_at: string;
  documents: Array<{ id: string; filename: string; url: string }>;
}

interface SharedData {
  records: SharedRecord[];
  shared_by: string;
  expires_at: string;
  purpose?: string;
  is_expired: boolean;
  access_count: number;
}

export default function SharedRecordPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSharedRecords = async () => {
      try {
        const response = await api.get(`/shared/${token}`);
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load shared records');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSharedRecords();
    }
  }, [token]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      UNVERIFIED: { label: 'Sin Verificar', className: 'bg-slate-200 text-slate-700' },
      BACKED_BY_DOCUMENT: { label: 'Respaldado por Documento', className: 'bg-blue-100 text-blue-800' },
      VERIFIED: { label: 'Verificado', className: 'bg-emerald-100 text-emerald-800' },
    };

    const statusInfo = statusMap[status] || statusMap.UNVERIFIED;

    return (
      <span className={`px-2 py-1 text-xs rounded font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando registros compartidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <p className="text-sm text-slate-500">
            Este enlace puede haber expirado, sido revocado o ya utilizado.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      {/* Watermark */}
      <div className="fixed top-4 right-4 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
        🔒 Solo Vista
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-slate-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Registros Médicos Compartidos</h1>
              <p className="text-slate-600 mt-1 flex items-center gap-2">
                <User className="h-4 w-4" />
                Compartido por {data.shared_by}
              </p>
              {data.purpose && (
                <p className="text-sm text-slate-500 mt-2">
                  Propósito: {data.purpose}
                </p>
              )}
            </div>
          </div>

          {/* Expiration Notice */}
          <div className={`flex items-center gap-2 p-3 rounded-md ${data.is_expired ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              {data.is_expired ? 'Este enlace ha expirado' : `Expira: ${formatDate(data.expires_at)}`}
            </span>
          </div>
        </div>

        {/* Records */}
        <div className="space-y-4">
          {data.records.map((record) => (
            <div key={record.id} className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              {/* Record Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-slate-900">{record.motive}</h2>
                    {record.category && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded font-medium">
                        {record.category.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(record.created_at)}
                    </span>
                    {getStatusBadge(record.status)}
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              {record.diagnosis && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Diagnóstico</h3>
                  <p className="text-slate-900">{record.diagnosis}</p>
                </div>
              )}

              {/* Notes */}
              {record.notes && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Notas</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{record.notes}</p>
                </div>
              )}

              {/* Tags */}
              {record.tags && record.tags.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Etiquetas</h3>
                  <div className="flex flex-wrap gap-2">
                    {record.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {record.documents && record.documents.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Adjuntos ({record.documents.length})
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Preview first document if it's an image */}
                    {record.documents[0] && (
                      <div className="space-y-2">
                        {record.documents[0].filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <div className="relative">
                            <img
                              src={getDocumentUrl(record.documents[0].url)}
                              alt={record.documents[0].filename}
                              className="w-full rounded-lg border border-slate-200 shadow-sm"
                              onError={(e) => {
                                // Fallback if image fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-slate-500">{record.documents[0].filename}</p>
                              <a
                                href={getDocumentUrl(record.documents[0].url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Abrir
                              </a>
                            </div>
                          </div>
                        ) : (
                          <a
                            href={getDocumentUrl(record.documents[0].url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                          >
                            <FileText className="h-5 w-5 text-slate-400" />
                            <span className="text-sm text-slate-700 font-medium">{record.documents[0].filename}</span>
                          </a>
                        )}
                      </div>
                    )}
                    
                    {/* Show remaining documents as links */}
                    {record.documents.length > 1 && (
                      <div className="space-y-2">
                        {record.documents.slice(1).map((doc) => (
                          <a
                            key={doc.id}
                            href={getDocumentUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-slate-50 rounded hover:bg-slate-100 transition-colors"
                          >
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-700">{doc.filename}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Esta es una compartición segura y de tiempo limitado. No reenvíes este enlace.</p>
          <p className="mt-1">Vistas: {data.access_count}</p>
        </div>
      </div>
    </div>
  );
}
