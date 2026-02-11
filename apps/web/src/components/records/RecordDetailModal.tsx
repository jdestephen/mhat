'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  Pill,
  ClipboardList,
  Tag,
} from 'lucide-react';
import { RecordStatus } from '@/types';
import { getDocumentUrl } from '@/lib/api';

export interface RecordDetailDiagnosis {
  id?: string;
  diagnosis: string;
}

export interface RecordDetailPrescription {
  id: string;
  medication_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface RecordDetailOrder {
  id: string;
  order_type: string;
  description: string;
  urgency: string;
  reason?: string;
  referral_to?: string;
}

export interface RecordDetailDocument {
  id: string;
  filename: string;
  url: string;
}

/** Flexible record type that works for both doctor and shared views. */
export interface RecordDetailData {
  id: string;
  motive: string;
  category?: { id: number | string; name: string } | null;
  created_at: string;
  status: RecordStatus | string;
  diagnoses?: RecordDetailDiagnosis[];
  clinical_impression?: string;
  brief_history?: string;
  key_finding?: string;
  has_red_flags?: boolean;
  red_flags?: string[];
  actions_today?: string[];
  plan_bullets?: string[];
  follow_up_interval?: string;
  follow_up_with?: string;
  patient_instructions?: string;
  notes?: string;
  tags?: string[];
  prescriptions?: RecordDetailPrescription[];
  clinical_orders?: RecordDetailOrder[];
  documents?: RecordDetailDocument[];
  verified_at?: string;
}

interface RecordDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: RecordDetailData | null;
  readOnly?: boolean;
}

export function RecordDetailModal({ open, onOpenChange, record, readOnly = false }: RecordDetailModalProps) {
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

  const statusLabel = (status: RecordStatus | string) => {
    if (status === RecordStatus.VERIFIED || status === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.75 rounded-full bg-emerald-100 text-emerald-700 font-medium">
          <CheckCircle className="h-3 w-3" /> Verificado
        </span>
      );
    }
    if (status === RecordStatus.BACKED_BY_DOCUMENT || status === 'BACKED_BY_DOCUMENT') {
      return (
        <span className="text-xs px-2.5 py-0.75 rounded-full bg-blue-100 text-blue-700 font-medium">
          Con Documento
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.75 rounded-full bg-amber-100 text-amber-700 font-medium">
        <AlertTriangle className="h-3 w-3" /> Sin Verificar
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] min-w-[750px] overflow-y-auto">
        <DialogHeader onOpenChange={onOpenChange}>
          <DialogTitle>
            <span className="text-xl font-bold text-gray-900">
              {record.category ? record.category.name : 'Consulta Médica'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Category & Date */}
          <div className="flex flex-row justify-between items-start">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-500">Motivo de Consulta</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{record.motive}</p>
            </div>
            <div className="flex flex-row gap-1">
              <span className="text-xs px-2.5 py-0.75 rounded-full bg-blue-100 text-blue-700">
                {formatDate(record.created_at)}
              </span>
              {statusLabel(record.status)}
            </div>
          </div>

          {/* Diagnoses */}
          {record.diagnoses && record.diagnoses.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500">
                Diagnósticos ({record.diagnoses.length})
              </label>
              <div className="mt-2 space-y-2">
                {record.diagnoses.map((dx, idx) => (
                  <div key={dx.id || idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-900">{dx.diagnosis}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Fields (doctor-created records) */}
          {!readOnly && record.clinical_impression && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Impresión Clínica</label>
              <p className="text-sm text-slate-800 mt-1 bg-slate-50 p-3 rounded-lg">{record.clinical_impression}</p>
            </div>
          )}

          {record.brief_history && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Historia Breve</label>
              <p className="text-sm text-slate-800 mt-1 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{record.brief_history}</p>
            </div>
          )}

          {record.key_finding && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Hallazgo Principal</label>
              <p className="text-sm text-slate-800 mt-1 bg-slate-50 p-3 rounded-lg">{record.key_finding}</p>
            </div>
          )}

          {/* Red Flags */}
          {record.red_flags && record.red_flags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <label className="text-sm font-semibold text-red-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Signos de Alerta
              </label>
              <ul className="list-disc list-inside text-sm text-red-700 mt-1 space-y-1">
                {record.red_flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions & Plan */}
          {record.actions_today && record.actions_today.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Acciones de Hoy</label>
              <ul className="list-disc list-inside text-sm text-slate-800 mt-1 space-y-1">
                {record.actions_today.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          {record.plan_bullets && record.plan_bullets.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Plan</label>
              <ul className="list-disc list-inside text-sm text-slate-800 mt-1 space-y-1">
                {record.plan_bullets.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up */}
          {(record.follow_up_interval || record.follow_up_with) && (
            <div className="grid grid-cols-2 gap-4">
              {record.follow_up_interval && (
                <div>
                  <label className="text-sm font-semibold text-slate-500">Seguimiento</label>
                  <p className="text-sm text-slate-800 mt-1">{record.follow_up_interval}</p>
                </div>
              )}
              {record.follow_up_with && (
                <div>
                  <label className="text-sm font-semibold text-slate-500">Seguimiento Con</label>
                  <p className="text-sm text-slate-800 mt-1">{record.follow_up_with}</p>
                </div>
              )}
            </div>
          )}

          {/* Patient Instructions */}
          {record.patient_instructions && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <label className="text-sm font-semibold text-amber-800">Instrucciones al Paciente</label>
              <p className="text-sm text-amber-700 mt-1 whitespace-pre-wrap">{record.patient_instructions}</p>
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div>
              <label className="text-sm font-semibold text-slate-500">Notas</label>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">{record.notes}</p>
            </div>
          )}

          {/* Tags */}
          {record.tags && record.tags.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Etiquetas
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {record.tags.map((tag, idx) => (
                  <span key={idx} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions */}
          {record.prescriptions && record.prescriptions.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500 flex items-center gap-1">
                <Pill className="w-3.5 h-3.5" /> Recetas ({record.prescriptions.length})
              </label>
              <div className="mt-2 space-y-2">
                {record.prescriptions.map((rx) => (
                  <div key={rx.id} className="border border-slate-200 rounded-lg p-3">
                    <p className="font-medium text-slate-900 text-sm">{rx.medication_name}</p>
                    <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                      <div className="flex flex-row gap-2 mb-2">
                        {rx.dosage && <p>Dosis: {rx.dosage}, </p>}
                        {rx.frequency && <p>Frecuencia: {rx.frequency}, </p>}
                        {rx.duration && <p>Duración: {rx.duration}</p>}
                      </div>
                      <div>
                        {rx.instructions && <p className="text-slate-500 mt-1">{rx.instructions}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Orders */}
          {record.clinical_orders && record.clinical_orders.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500 flex items-center gap-1">
                <ClipboardList className="w-3.5 h-3.5" /> Órdenes ({record.clinical_orders.length})
              </label>
              <div className="mt-2 space-y-2">
                {record.clinical_orders.map((order) => (
                  <div key={order.id} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        order.order_type === 'LAB' ? 'bg-purple-100 text-purple-700' :
                        order.order_type === 'IMAGING' ? 'bg-blue-100 text-blue-700' :
                        order.order_type === 'REFERRAL' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.order_type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        order.urgency === 'STAT' ? 'bg-red-100 text-red-700' :
                        order.urgency === 'URGENT' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {order.urgency}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 text-sm">{order.description}</p>
                    {order.reason && <p className="text-xs text-slate-600 mt-1">{order.reason}</p>}
                    {order.referral_to && <p className="text-xs text-slate-600 mt-1">Referir a: {order.referral_to}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {record.documents && record.documents.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-500 mb-2 block">
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
                      <p className="text-sm font-medium text-slate-900">{doc.filename}</p>
                    </div>
                    <Button
                      onClick={() => window.open(getDocumentUrl(doc.url), '_blank')}
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

          {/* Verified info */}
          {record.verified_at && (
            <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
              Verificado el {formatDate(record.verified_at)}
            </div>
          )}
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
