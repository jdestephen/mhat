'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, Clock } from 'lucide-react';

interface ViewLogEntry {
  id: string;
  doctor_name: string;
  viewed_at: string;
}

interface RecordViewLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string | null;
}

export function RecordViewLogModal({ open, onOpenChange, recordId }: RecordViewLogModalProps) {
  const { data: logs = [], isLoading } = useQuery<ViewLogEntry[]>({
    queryKey: ['record-view-log', recordId],
    queryFn: async () => {
      const res = await api.get(`/hx/${recordId}/view-log`);
      return res.data;
    },
    enabled: open && !!recordId,
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader onOpenChange={onOpenChange}>
          <DialogTitle>Historial de Acceso</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 mb-4">
          Registro de médicos que han visualizado este expediente.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <Eye className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Ningún médico ha visualizado este registro aún.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {log.doctor_name}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(log.viewed_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
