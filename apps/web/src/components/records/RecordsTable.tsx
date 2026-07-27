'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RecordCardData } from './RecordCard';

interface RecordsTableProps {
  records: RecordCardData[];
  onViewDetail: (record: RecordCardData) => void;
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export function RecordsTable({ records, onViewDetail }: RecordsTableProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center px-2 py-2.5 border-b border-gray-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <div className="w-[17%]">Fecha</div>
        <div className="w-[27%]">Motivo / Categoría</div>
        <div className="w-[50%]">Diagnósticos</div>
        <div className="w-[5%] text-center" />
      </div>

      {/* Rows */}
      {records.map((record, index) => (
        <div
          key={record.id}
          className={`flex items-start px-2 py-3 border-b border-gray-100 transition-colors hover:bg-slate-50/60 ${
            index % 2 === 1 ? 'bg-gray-50/70' : ''
          }`}
        >
          {/* Fecha */}
          <div className="w-[17%] pr-2">
            <span className="text-sm font-medium text-blue-800">
              {formatDate(record.record_date || record.created_at)}
            </span>
            {/* <div className="mt-1">
              <StatusBadge status={record.status} />
            </div> */}
          </div>

          {/* Motivo / Categoría */}
          <div className="w-[27%] pr-2">
            <p className="text-sm font-medium text-gray-900 leading-snug truncate">
              {record.motive || '—'}
            </p>
            {record.category?.name && (
              <p className="text-xs text-slate-500 mt-0.5 capitalize">
                {record.category.name}
              </p>
            )}
          </div>

          {/* Diagnósticos — wraps */}
          <div className="w-[50%] pr-2">
            <>
              {record.diagnoses &&
              record.diagnoses.length > 0 &&
              record.diagnoses.some((d) => d.diagnosis) ? (
                <p className="text-sm text-gray-900 capitalize break-words">
                  {record.diagnoses.map((d) => d.diagnosis).join(', ')}
                </p>
              ) : (
                <div className="flex">
                  <p className="text-xs text-slate-400">—</p>
                </div>
              )}
            </>
            <div>
              {record.key_finding && (
                <p className="text-xs text-slate-500 capitalize truncate" title={record.key_finding}>
                  Examen Físico: {record.key_finding}
                </p>
              )}
            </div>
          </div>

          {/* Botón detalle */}
          <div className="w-[5%] flex justify-center flex-end pt-0.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetail(record)}
              className="flex items-center justify-center gap-1.5 rounded-full text-xs px-3 py-1 max-h-[32px] bg-white border-none text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
