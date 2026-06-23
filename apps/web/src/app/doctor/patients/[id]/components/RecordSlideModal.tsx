'use client';

import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  Pill,
  ClipboardList,
  Tag,
  X,
  Maximize2
} from 'lucide-react';
import { DoctorMedicalRecord, RecordStatus } from '@/types';
import { getDocumentUrl } from '@/lib/api';
import { useEffect, useState } from 'react';

interface RecordSlideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: DoctorMedicalRecord | null;
  onViewPage?: () => void;
}

export function RecordSlideModal({ open, onOpenChange, record, onViewPage }: RecordSlideModalProps) {
  // Manejo del scroll del body cuando el modal está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!record) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabel = (status: RecordStatus) => {
    switch (status) {
      case RecordStatus.VERIFIED:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
            <CheckCircle className="h-3 w-3" /> Verificado
          </span>
        );
      case RecordStatus.BACKED_BY_DOCUMENT:
        return (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            Con Documento
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            <AlertTriangle className="h-3 w-3" /> Sin Verificar
          </span>
        );
    }
  };

  return (
    <>
      {/* Overlay Oscuro */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[70%] md:w-[60%] lg:w-[45%] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900 truncate pr-4">
            {record.category ? record.category.name : 'Consulta Médica'}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {onViewPage && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onViewPage} 
                className="hidden sm:flex text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200"
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Expandir
              </Button>
            )}
            {onViewPage && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={onViewPage} 
                className="sm:hidden text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-slate-100">
              <X className="h-5 w-5 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* Contenido (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* Motivo & Metadata */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-500">Motivo de Consulta</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{record.motive}</p>
            </div>
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              {statusLabel(record.status)}
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                {formatDate(record.created_at)}
              </span>
            </div>
          </div>

          {/* Diagnósticos */}
          {record.diagnoses && record.diagnoses.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-500">
                Diagnósticos ({record.diagnoses.length})
              </label>
              <div className="space-y-2">
                {record.diagnoses.map((dx, idx) => (
                  <div key={dx.id || idx} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-900">{dx.diagnosis}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campos Clínicos */}
          {record.clinical_impression && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Impresión Clínica</label>
              <p className="text-sm text-slate-800 mt-1 bg-white border border-slate-100 p-4 rounded-xl shadow-sm">{record.clinical_impression}</p>
            </div>
          )}

          {record.brief_history && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Historia Breve</label>
              <p className="text-sm text-slate-800 mt-1 bg-white border border-slate-100 p-4 rounded-xl shadow-sm whitespace-pre-wrap">{record.brief_history}</p>
            </div>
          )}

          {record.key_finding && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Hallazgo Principal</label>
              <p className="text-sm text-slate-800 mt-1 bg-white border border-slate-100 p-4 rounded-xl shadow-sm">{record.key_finding}</p>
            </div>
          )}

          {/* Signos de Alerta */}
          {record.has_red_flags && record.red_flags && record.red_flags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <label className="text-sm font-semibold text-red-700 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4" /> Signos de Alerta
              </label>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {record.red_flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Acciones de Hoy */}
          {record.actions_today && record.actions_today.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Acciones de Hoy</label>
              <ul className="list-disc list-inside text-sm text-slate-800 mt-2 space-y-1 bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                {record.actions_today.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Plan */}
          {record.plan_bullets && record.plan_bullets.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Plan</label>
              <ul className="list-disc list-inside text-sm text-slate-800 mt-2 space-y-1 bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                {record.plan_bullets.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Seguimiento */}
          {(record.follow_up_interval || record.follow_up_with) && (
            <div className="grid grid-cols-2 gap-4 bg-slate-100/50 p-4 rounded-xl border border-slate-200">
              {record.follow_up_interval && (
                <div>
                  <label className="text-sm font-semibold text-slate-500">Seguimiento</label>
                  <p className="text-sm font-medium text-slate-900 mt-1">{record.follow_up_interval}</p>
                </div>
              )}
              {record.follow_up_with && (
                <div>
                  <label className="text-sm font-semibold text-slate-500">Con</label>
                  <p className="text-sm font-medium text-slate-900 mt-1">{record.follow_up_with}</p>
                </div>
              )}
            </div>
          )}

          {/* Instrucciones al Paciente */}
          {record.patient_instructions && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
              <label className="text-sm font-semibold text-amber-800">Instrucciones al Paciente</label>
              <p className="text-sm text-amber-900 mt-2 whitespace-pre-wrap">{record.patient_instructions}</p>
            </div>
          )}

          {/* Notas */}
          {record.notes && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Notas Privadas</label>
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap bg-white border border-slate-100 p-4 rounded-xl shadow-sm">{record.notes}</p>
            </div>
          )}

          {/* Etiquetas */}
          {record.tags && record.tags.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-2">
                <Tag className="w-4 h-4" /> Etiquetas
              </label>
              <div className="flex flex-wrap gap-2">
                {record.tags.map((tag, idx) => (
                  <span key={idx} className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recetas */}
          {record.prescriptions && record.prescriptions.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-2">
                <Pill className="w-4 h-4" /> Recetas ({record.prescriptions.length})
              </label>
              <div className="space-y-3">
                {record.prescriptions.map((rx) => (
                  <div key={rx.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p className="font-semibold text-slate-900">{rx.medication_name}</p>
                    <div className="text-sm text-slate-600 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {rx.dosage && <p><span className="font-medium text-slate-500">Dosis:</span> {rx.dosage}</p>}
                      {rx.frequency && <p><span className="font-medium text-slate-500">Freq:</span> {rx.frequency}</p>}
                      {rx.duration && <p><span className="font-medium text-slate-500">Duración:</span> {rx.duration}</p>}
                    </div>
                    {rx.instructions && <p className="text-sm text-slate-500 mt-2 border-t border-slate-100 pt-2">{rx.instructions}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Órdenes */}
          {record.clinical_orders && record.clinical_orders.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-2">
                <ClipboardList className="w-4 h-4" /> Órdenes Clínicas ({record.clinical_orders.length})
              </label>
              <div className="space-y-3">
                {record.clinical_orders.map((order) => (
                  <div key={order.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                        order.order_type === 'LAB' ? 'bg-purple-100 text-purple-700' :
                        order.order_type === 'IMAGING' ? 'bg-blue-100 text-blue-700' :
                        order.order_type === 'REFERRAL' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.order_type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                        order.urgency === 'STAT' ? 'bg-red-100 text-red-700' :
                        order.urgency === 'URGENT' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {order.urgency}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">{order.description}</p>
                    {order.reason && <p className="text-sm text-slate-600 mt-1">{order.reason}</p>}
                    {order.referral_to && <p className="text-xs font-medium text-slate-500 mt-2 bg-slate-50 p-2 rounded">Referir a: {order.referral_to}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documentos */}
          {record.documents && record.documents.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-2">
                <FileText className="w-4 h-4" /> Documentos Adjuntos ({record.documents.length})
              </label>
              <div className="space-y-2">
                {record.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.filename}</p>
                    </div>
                    <Button
                      onClick={() => window.open(getDocumentUrl(doc.url), '_blank')}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Abrir
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verificado por */}
          {record.verified_at && (
            <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 text-center">
              Verificado el {formatDate(record.verified_at)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
