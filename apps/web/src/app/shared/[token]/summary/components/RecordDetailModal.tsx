'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, FileText, Download } from 'lucide-react';

interface RecordDetail {
  id: string;
  motive: string;
  diagnosis: string | null;
  category: { id: string; name: string } | null;
  notes: string | null;
  tags: string[] | null;
  status: string;
  created_at: string;
  documents: Array<{
    id: string;
    filename: string;
    url: string;
  }>;
}

interface RecordDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: RecordDetail | null;
  token: string;
}

export function RecordDetailModal({ open, onOpenChange, record, token }: RecordDetailModalProps) {
  if (!record) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <span className="text-xl font-bold text-emerald-900">Detalle del Registro Médico</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Motive */}
          <div>
            <label className="text-sm font-semibold text-slate-700">Motivo de Consulta</label>
            <p className="text-base text-slate-900 mt-1">{record.motive}</p>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-4">
            {record.category && (
              <div>
                <label className="text-sm font-semibold text-slate-700">Categoría</label>
                <p className="text-sm text-slate-900 mt-1">
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium">
                    {record.category.name}
                  </span>
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-slate-700">Fecha</label>
              <p className="text-sm text-slate-900 mt-1">{formatDate(record.created_at)}</p>
            </div>
          </div>

          {/* Diagnosis */}
          {record.diagnosis && (
            <div>
              <label className="text-sm font-semibold text-slate-700">Diagnóstico</label>
              <p className="text-base text-slate-900 mt-1 bg-blue-50 p-3 rounded-lg border border-blue-200">
                {record.diagnosis}
              </p>
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div>
              <label className="text-sm font-semibold text-slate-700">Notas</label>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                {record.notes}
              </p>
            </div>
          )}

          {/* Tags */}
          {record.tags && record.tags.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-700">Etiquetas</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {record.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs"
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
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Documentos Adjuntos ({record.documents.length})
              </label>
              <div className="space-y-2">
                {record.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{doc.filename}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => window.open(`http://localhost:8000/api/v1/hx/shared/${token}/document/${doc.id}`, '_blank')}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Abrir
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="pt-2 border-t border-slate-200">
            <span className={`text-xs px-2 py-1 rounded ${
              record.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
              record.status === 'BACKED_BY_DOCUMENT' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {record.status === 'VERIFIED' ? 'Verificado' :
               record.status === 'BACKED_BY_DOCUMENT' ? 'Respaldado por documento' :
               'Sin verificar'}
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
