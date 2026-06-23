'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientRecords } from '@/hooks/queries/usePatientRecords';
import { useMyPatients } from '@/hooks/queries/useMyPatients';
import { Button } from '@/components/ui/button';
import { PatientInfoBanner } from '@/components/doctor/PatientInfoBanner';
import { getDocumentUrl } from '@/lib/api';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Pill,
  ClipboardList,
  FileText,
  Tag,
  Download,
  Edit,
  XIcon
} from 'lucide-react';
import { RecordStatus, AccessLevel } from '@/types';

export default function DedicatedRecordPage({ params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id: patientId, recordId } = use(params);
  const router = useRouter();

  const { data: patients = [] } = useMyPatients();
  const patient = patients.find((p) => p.patient_id === patientId);

  const { data: records = [], isLoading } = usePatientRecords(patientId);
  const record = records.find((r) => r.id === recordId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Registro no encontrado</h2>
        <p className="text-slate-600 mb-6">El registro médico que buscas no existe o no tienes permiso para verlo.</p>
        <Button onClick={() => router.back()}>
          Volver al Dashboard
        </Button>
      </div>
    );
  }

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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/50 text-emerald-700 text-[10px] font-semibold tracking-wide uppercase border border-emerald-200">
            <CheckCircle className="h-3 w-3" /> Verificado
          </span>
        );
      case RecordStatus.BACKED_BY_DOCUMENT:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100/50 text-blue-700 text-[10px] font-semibold tracking-wide uppercase border border-blue-200">
            Con Documento
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/50 text-amber-700 text-[10px] font-semibold tracking-wide uppercase border border-amber-200">
            <AlertTriangle className="h-3 w-3" /> Sin Verificar
          </span>
        );
    }
  };

  const Field = ({ label, value, isAlert = false }: { label: string; value: React.ReactNode; isAlert?: boolean }) => {
    if (!value) return null;
    return (
      <div className="group">
        <h3 className={`text-[11px] font-bold tracking-widest uppercase mb-1.5 ${isAlert ? 'text-red-500' : 'text-slate-400'}`}>
          {label}
        </h3>
        <div className={`text-[14px] leading-relaxed ${isAlert ? 'text-red-900 font-medium' : 'text-slate-800'}`}>
          {value}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 lg:px-4 sm:px-6">
      
      {/* Header (Same as Edit/New Page) */}
      <div className="flex flex-col justify-start lg:pr-0">
        <div className="flex justify-between items-center mb-3 sm:mb-5">
          <div className="flex items-center gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-emerald-950 flex items-center gap-3">
              {record.category ? record.category.name : 'Consulta Médica'}
            </h1>
          </div>  
          
          <div className="flex items-center gap-2">
            {patient && patient.access_level !== AccessLevel.READ_ONLY && (
              <Button 
                onClick={() => router.push(`/doctor/patients/${patientId}/records/${recordId}/edit`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 h-9 shadow-sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Editar</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-0 text-gray-400 hover:text-gray-900 gap-2 px-2"
            >
              <XIcon className="h-6 sm:h-7 w-6 sm:w-7" />
            </Button>
          </div>
        </div>
        
        {patient && (
          <div className="mb-5">
            <PatientInfoBanner
              patient={patient}
              variant="extended"
              layout="row"
              collapsible
              defaultCollapsed
            />
          </div>
        )}
      </div>

      {/* Main Document Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-2">
        
        {/* Document Header Metadata */}
        <div className="bg-slate-50/50 px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-1">Motivo Principal</h2>
            <p className="text-lg text-emerald-950 font-semibold">{record.motive}</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            {statusLabel(record.status)}
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              Fecha: <span className="text-slate-800">{formatDate(record.created_at)}</span>
            </span>
          </div>
        </div>

        {/* Diagnoses Section */}
        {record.diagnoses && record.diagnoses.length > 0 && (
          <div className="px-6 py-6 border-b border-slate-100 bg-white">
            <h3 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-3">Diagnósticos</h3>
            <div className="flex flex-wrap gap-2">
              {record.diagnoses.map((dx, idx) => (
                <span key={dx.id || idx} className="inline-flex items-center bg-blue-50/60 text-blue-900 px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-100/50">
                  {dx.diagnosis}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Clinical Evaluation Grid */}
        <div className="px-6 py-8">
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
            
            {/* Left Column */}
            <div className="space-y-8">
              <Field 
                label="Historia de la Enfermedad" 
                value={<div className="whitespace-pre-wrap">{record.brief_history}</div>} 
              />
              
              <Field 
                label="Examen Físico / Hallazgos" 
                value={record.key_finding} 
              />

              <Field 
                label="Impresión Clínica" 
                value={record.clinical_impression} 
              />
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {record.has_red_flags && record.red_flags && record.red_flags.length > 0 && (
                <Field 
                  label="Signos de Alerta" 
                  isAlert
                  value={
                    <ul className="list-disc list-inside space-y-1">
                      {record.red_flags.map((flag, idx) => <li key={idx}>{flag}</li>)}
                    </ul>
                  } 
                />
              )}

              {(record.actions_today && record.actions_today.length > 0) && (
                <Field 
                  label="Acciones Realizadas Hoy" 
                  value={
                    <div className="flex flex-wrap gap-2 mt-1">
                      {record.actions_today.map((action, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[13px] font-medium border border-slate-200/60">
                          {action}
                        </span>
                      ))}
                    </div>
                  } 
                />
              )}

              {(record.plan_bullets && record.plan_bullets.length > 0) && (
                <Field 
                  label="Plan Médico" 
                  value={
                    <ul className="list-disc list-inside space-y-1.5 text-slate-700">
                      {record.plan_bullets.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  } 
                />
              )}

              {(record.follow_up_interval || record.follow_up_with) && (
                <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <Field label="Seguimiento en" value={record.follow_up_interval} />
                  <Field label="Derivado a" value={record.follow_up_with} />
                </div>
              )}

              <Field 
                label="Notas Privadas (Solo Doctor)" 
                value={
                  <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100/50 whitespace-pre-wrap text-[13px] text-amber-900">
                    {record.notes}
                  </div>
                } 
              />
            </div>
          </div>
        </div>

        {/* Patient Instructions */}
        {record.patient_instructions && (
          <div className="px-6 py-6 border-t border-slate-100 bg-emerald-50/30">
            <Field 
              label="Instrucciones entregadas al paciente" 
              value={<div className="whitespace-pre-wrap text-emerald-900">{record.patient_instructions}</div>} 
            />
          </div>
        )}

        {/* Annexes (Prescriptions, Orders, Docs) */}
        {(record.prescriptions?.length || record.clinical_orders?.length || record.documents?.length || record.tags?.length) ? (
          <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Prescriptions */}
              {record.prescriptions && record.prescriptions.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-4">
                    <Pill className="w-3.5 h-3.5" /> Recetas ({record.prescriptions.length})
                  </h3>
                  <div className="space-y-3">
                    {record.prescriptions.map((rx) => (
                      <div key={rx.id} className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
                        <p className="font-semibold text-slate-800 text-sm mb-1.5">{rx.medication_name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-500">
                          {rx.dosage && <span><span className="font-medium">Dosis:</span> {rx.dosage}</span>}
                          {rx.frequency && <span><span className="font-medium">Freq:</span> {rx.frequency}</span>}
                          {rx.duration && <span><span className="font-medium">Dur:</span> {rx.duration}</span>}
                        </div>
                        {rx.instructions && <p className="text-[12px] text-slate-600 mt-2 pt-2 border-t border-slate-100 leading-relaxed">{rx.instructions}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders */}
              {record.clinical_orders && record.clinical_orders.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-4">
                    <ClipboardList className="w-3.5 h-3.5" /> Órdenes Clínicas ({record.clinical_orders.length})
                  </h3>
                  <div className="space-y-3">
                    {record.clinical_orders.map((order) => (
                      <div key={order.id} className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded ${
                            order.order_type === 'LAB' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                            order.order_type === 'IMAGING' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            order.order_type === 'REFERRAL' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-gray-50 text-gray-700 border border-gray-100'
                          }`}>
                            {order.order_type}
                          </span>
                          <span className={`text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded ${
                            order.urgency === 'STAT' ? 'bg-red-50 text-red-700 border border-red-100' :
                            order.urgency === 'URGENT' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-slate-50 text-slate-600 border border-slate-100'
                          }`}>
                            {order.urgency}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm leading-snug">{order.description}</p>
                        {order.reason && <p className="text-[12px] text-slate-500 mt-1.5">{order.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents & Tags */}
              <div className="space-y-6">
                {record.documents && record.documents.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-4">
                      <FileText className="w-3.5 h-3.5" /> Documentos ({record.documents.length})
                    </h3>
                    <div className="space-y-2.5">
                      {record.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                            <p className="text-[13px] font-medium text-slate-700 truncate">{doc.filename}</p>
                          </div>
                          <Button onClick={() => window.open(getDocumentUrl(doc.url), '_blank')} variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {record.tags && record.tags.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-3">
                      <Tag className="w-3.5 h-3.5" /> Etiquetas
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {record.tags.map((tag, idx) => (
                        <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : null}

        {/* Footer Meta */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-center sm:text-left flex justify-between items-center text-[11px] text-slate-400 font-medium">
          <p>ID Registro: <span className="font-mono text-slate-500">{record.id}</span></p>
          {record.verified_at && (
            <p className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              Verificado el {formatDate(record.verified_at)}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
