'use client';

import React, { useState, use } from 'react';
import { usePatientRecords } from '@/hooks/queries/usePatientRecords';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useMyPatients } from '@/hooks/queries/useMyPatients';
import { usePatientHealth } from '@/hooks/queries/usePatientHealth';
import { useVerifyRecord } from '@/hooks/mutations/useVerifyRecord';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UserRole, RecordStatus, RecordSource, DoctorMedicalRecord, AccessLevel } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Pill,
  ClipboardList,
  Plus,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  Eye,
  Activity,
  Paperclip,
} from 'lucide-react';
import { RecordDetailModal } from './components/RecordDetailModal';


export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = use(params);
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: patients = [] } = useMyPatients();
  const { data: records = [], isLoading: recordsLoading, refetch } = usePatientRecords(patientId);
  const { data: health } = usePatientHealth(patientId);
  const verifyRecord = useVerifyRecord();
  const [selectedRecord, setSelectedRecord] = useState<DoctorMedicalRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Find current patient from doctor's patient list
  const patient = patients.find((p) => p.patient_id === patientId);

  const computeAge = (dob: string): number => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const patientName = patient
    ? `${patient.first_name} ${patient.last_name}`
    : 'Paciente';

  const patientSubtitle = patient
    ? [
        patient.date_of_birth ? `${computeAge(patient.date_of_birth)} años` : null,
        patient.sex ? patient.sex : null,
      ].filter(Boolean).join(' • ')
    : '';

  const isReadOnly = patient?.access_level === AccessLevel.READ_ONLY;

  // Redirect non-doctors
  if (!userLoading && user?.role !== UserRole.DOCTOR) {
    router.push('/dashboard');
    return null;
  }

  const handleVerify = async (recordId: string) => {
    try {
      await verifyRecord.mutateAsync({ recordId });
      refetch();
    } catch (error) {
      console.error('Error verifying record:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: RecordStatus, source?: RecordSource) => {
    if (status === RecordStatus.VERIFIED) {
      return (
        <span className="flex items-center px-2.5 py-0.75 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1">
          <CheckCircle className="h-3 w-3" /> Verificado
        </span>
      );
    }
    if (status === RecordStatus.BACKED_BY_DOCUMENT) {
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

  // Collect all prescriptions and orders from records
  const allPrescriptions = records.flatMap((r) => r.prescriptions || []);
  const allOrders = records.flatMap((r) => r.clinical_orders || []);

  if (userLoading || recordsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-row max-w-8xl mx-auto gap-6">
      {/* Header */}
      <div className="flex flex-col flex-1 mb-6 gap-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {patientName}
              </h1>
              {patientSubtitle && (
                <p className="text-gray-500 text-sm">{patientSubtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Left Sidebar - Health Profile */}
        <div className="lg:col-span-1 space-y-4">
          {/* Active Medications */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <Pill className="w-5 h-5 text-blue-600" />
              Medicamentos Activos
            </h2>
            {!health?.medications?.length ? (
              <p className="text-sm text-slate-500">Ninguno</p>
            ) : (
              <ul className="space-y-2">
                {health.medications.map((med) => (
                  <li key={med.id} className="text-sm">
                    <p className="font-medium text-slate-800">{med.name}</p>
                    {med.dosage && <p className="text-xs text-slate-600">{med.dosage}</p>}
                    {med.frequency && <p className="text-xs text-slate-600">{med.frequency}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Conditions */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-purple-600" />
              Condiciones
            </h2>
            {!health?.conditions?.length ? (
              <p className="text-sm text-slate-500">Ninguna</p>
            ) : (
              <ul className="space-y-2">
                {health.conditions.map((cond) => (
                  <li key={cond.id} className="text-sm">
                    <p className="font-medium text-slate-800">{cond.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cond.status && (
                        <span className={`text-xs px-2 py-0.5 rounded ${cond.status === 'active' ? 'bg-amber-100 text-amber-700' :
                            cond.status === 'resolved' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-600'
                          }`}>
                          {cond.status}
                        </span>
                      )}
                      {cond.since_year && (
                        <span className="text-xs text-slate-500">desde {cond.since_year}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Allergies */}
          <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
            <h2 className="font-semibold text-red-900 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Alergias
            </h2>
            {!health?.allergies?.length ? (
              <p className="text-sm text-red-600">Ninguna conocida</p>
            ) : (
              <ul className="space-y-2">
                {health.allergies.map((allergy) => (
                  <li key={allergy.id} className="text-sm">
                    <p className="font-medium text-red-800">{allergy.allergen}</p>
                    {allergy.reaction && <p className="text-xs text-red-700">{allergy.reaction}</p>}
                    {allergy.severity && (
                      <span className={`text-xs px-2 py-0.5 rounded mt-0.5 inline-block ${allergy.severity === 'severe' ? 'bg-red-200 text-red-800' :
                          allergy.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                        {allergy.severity}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Sidebar + Tabs */}
      <div className="flex flex-col flex-4 gap-6">
        {/* Right Content - 3/4 width */}
        <div className="space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <Tabs defaultValue="records">
              <TabsList className="border-b border-gray-100 pl-3 pr-1">
                <TabsTrigger value="records" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Registros
                </TabsTrigger>
                <TabsTrigger value="prescriptions" className="flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Recetas
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Órdenes
                </TabsTrigger>

                <div className="flex-1 flex justify-end">
                  {isReadOnly ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                      <Eye className="h-4 w-4" />
                      Solo lectura
                    </span>
                  ) : (
                    <Link className="self-end" href={`/doctor/patients/${patientId}/records/new`}>
                      <Button className="flex items-center gap-2" variant='ghost'>
                        <Plus className="h-4 w-4" />
                        Nuevo
                      </Button>
                    </Link>
                  )}
                </div>
              </TabsList>

              {/* Records Tab */}
              <TabsContent value="records" className="p-0">
                {records.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sin registros</h3>
                    <p className="text-gray-500 mb-6">Este paciente no tiene registros médicos aún</p>
                    <Link href={`/doctor/patients/${patientId}/records/new`}>
                      <Button>Crear Primer Registro</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col p-2 gap-2">
                    {records.map((record, index) => (
                      <div
                        key={record.id}
                        className={`p-4 hover:bg-slate-50/30 transition-colors min-h-[130px] rounded-lg border border-gray-200 ${index % 2 === 0 ? 'bg-gray-50/10' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between min-h-[130px]">
                          <div className="flex-1">
                            <div className="flex flex-row gap-2 font-semibold items-center">
                              <div className="flex flex-col flex-2">
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
                                  {getStatusBadge(record.status, record.record_source)}
                                </div>
                                <div className="flex items-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setSelectedRecord(record); setModalOpen(true); }}
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
                                  {record.diagnoses?.length > 0 && record.diagnoses?.some((diagnosis) => diagnosis.diagnosis) && (
                                    <div className="flex flex-row mt-1">
                                      <span className="text-gray-800 text-sm capitalize">
                                        {record.diagnoses?.map((diagnosis) => diagnosis.diagnosis).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col px-3 py-2 border border-gray-200 rounded-lg w-1/3 min-h-[70px]">
                                  <span className="text-red-900 text-xs font-semibold">Alertas Rojas:</span>
                                  {record.red_flags && record.red_flags.length > 0 && (
                                    <div className="flex flex-row mt-1">
                                      <span className="text-red-800 text-sm capitalize">
                                        {record.red_flags?.map((redFlag) => redFlag).join(', ')}
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
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Prescriptions Tab */}
              <TabsContent value="prescriptions" className="p-0">
                {allPrescriptions.length === 0 ? (
                  <div className="p-12 text-center">
                    <Pill className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sin recetas</h3>
                    <p className="text-gray-500">No hay recetas para este paciente</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {allPrescriptions.map((rx) => (
                      <div key={rx.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{rx.medication_name}</h3>
                            <div className="text-sm text-gray-500 mt-1 space-y-1">
                              {rx.dosage && <p>Dosis: {rx.dosage}</p>}
                              {rx.frequency && <p>Frecuencia: {rx.frequency}</p>}
                              {rx.duration && <p>Duración: {rx.duration}</p>}
                              {rx.instructions && (
                                <p className="text-gray-600 mt-2">{rx.instructions}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatDate(rx.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="p-0">
                {allOrders.length === 0 ? (
                  <div className="p-12 text-center">
                    <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sin órdenes</h3>
                    <p className="text-gray-500">No hay órdenes clínicas para este paciente</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {allOrders.map((order) => (
                      <div key={order.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                order.order_type === 'LAB' ? 'bg-purple-100 text-purple-700' :
                                order.order_type === 'IMAGING' ? 'bg-blue-100 text-blue-700' :
                                order.order_type === 'REFERRAL' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {order.order_type}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                order.urgency === 'STAT' ? 'bg-red-100 text-red-700' :
                                order.urgency === 'URGENT' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {order.urgency}
                              </span>
                            </div>
                            <h3 className="font-medium text-gray-900">{order.description}</h3>
                            {order.reason && (
                              <p className="text-sm text-gray-500 mt-1">{order.reason}</p>
                            )}
                            {order.referral_to && (
                              <p className="text-sm text-gray-600 mt-1">
                                Referir a: {order.referral_to}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      <RecordDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        record={selectedRecord}
      />
    </div>
  );
}
