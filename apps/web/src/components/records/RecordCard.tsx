'use client';

import React from 'react';
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  Paperclip,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecordStatus } from '@/types';

export interface RecordCardDiagnosis {
  diagnosis: string;
}

export interface RecordCardDocument {
  id: string;
  filename: string;
  url: string;
}

export interface RecordCardData {
  id: string;
  motive: string;
  created_at: string;
  category?: { id: number | string; name: string } | null;
  status: RecordStatus | string;
  diagnoses?: RecordCardDiagnosis[];
  red_flags?: string[] | null;
  key_finding?: string | null;
  documents?: RecordCardDocument[];
}

interface RecordCardProps {
  record: RecordCardData;
  index: number;
  onViewDetail: (record: RecordCardData) => void;
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getStatusBadge = (status: RecordStatus | string) => {
  if (status === RecordStatus.VERIFIED || status === 'VERIFIED') {
    return (
      <span className="flex items-center px-2.5 py-0.75 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1">
        <CheckCircle className="h-3 w-3" /> Verificado
      </span>
    );
  }
  if (status === RecordStatus.BACKED_BY_DOCUMENT || status === 'BACKED_BY_DOCUMENT') {
    return (
      <span className="flex items-center px-2.5 py-0.75 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 gap-1">
        Con Documento
      </span>
    );
  }
  return (
    <span className="flex items-center px-2.5 py-0.75 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 gap-1">
      <AlertTriangle className="h-3 w-3" /> Sin Verificar
    </span>
  );
};

export function RecordCard({ record, index, onViewDetail }: RecordCardProps) {
  return (
    <div
      className={`p-4 hover:bg-slate-50/30 transition-colors min-h-[130px] rounded-lg border border-gray-200 ${index % 2 === 0 ? 'bg-gray-50/10' : 'bg-gray-50'}`}
    >
      <div className="flex items-start justify-between min-h-[130px]">
        <div className="flex-1">
          <div className="flex flex-row gap-2 font-semibold items-center">
            <div className="flex flex-col flex-1">
              <span className="flex items-center gap-1 text-blue-800 ">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(record.created_at)}
              </span>
              <span className="capitalize text-gray-700 text-xs">
                {record.category && record.category.name}
              </span>
            </div>
            <div className="flex flex-1 justify-end gap-1">
              {record.documents && record.documents.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="flex items-center px-2.5 py-0.75 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 gap-1">
                    <Paperclip className="h-3 w-3" />
                    {record.documents.length} Documento
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {getStatusBadge(record.status)}
              </div>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetail(record)}
                  className="flex items-center gap-1 rounded-full text-xs px-2 py-0.75 max-h-[25px]"
                >
                  <Eye className="h-4 w-4" />
                  Ver Detalle
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col mt-5">
            <div className="flex items-center ml-1">
              <h3 className="font-medium text-gray-700 text-sm">Motivo: {record.motive}</h3>
            </div>
            <div className="flex flex-row items-end gap-2 mt-1">
              <div className="flex flex-col px-3 py-2 border border-gray-200 rounded-lg w-1/3 min-h-[70px]">
                <span className="text-gray-900 text-xs font-semibold">Diagnósticos:</span>
                {record.diagnoses && record.diagnoses.length > 0 && record.diagnoses.some((d) => d.diagnosis) && (
                  <div className="flex flex-row mt-1">
                    <span className="text-gray-800 text-sm capitalize">
                      {record.diagnoses.map((d) => d.diagnosis).join(', ')}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col px-3 py-2 border border-gray-200 rounded-lg w-1/3 min-h-[70px]">
                <span className="text-red-900 text-xs font-semibold">Alertas Rojas:</span>
                {record.red_flags && record.red_flags.length > 0 && (
                  <div className="flex flex-row mt-1">
                    <span className="text-red-800 text-sm capitalize">
                      {record.red_flags.map((redFlag) => redFlag).join(', ')}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col px-3 py-2 border border-gray-200 rounded-lg w-1/3 min-h-[70px]">
                <span className="text-gray-900 text-xs font-semibold">Hallazgos:</span>
                {record.key_finding && (
                  <div className="flex flex-row mt-1">
                    <span className="text-gray-800 text-sm capitalize">
                      {record.key_finding}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
