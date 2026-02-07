'use client';

import React, { useState, use } from 'react';
import { usePatientRecords } from '@/hooks/queries/usePatientRecords';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useMyPatients } from '@/hooks/queries/useMyPatients';
import { usePatientHealth } from '@/hooks/queries/usePatientHealth';
import { useVerifyRecord } from '@/hooks/mutations/useVerifyRecord';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UserRole, RecordStatus, RecordSource, DoctorMedicalRecord } from '@/types';
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
  Shield,
  Clock,
  Eye,
  Activity,
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
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Verificado
        </span>
      );
    }
    if (status === RecordStatus.BACKED_BY_DOCUMENT) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          Con Documento
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/doctor')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al panel</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {patientName}
              </h1>
              {patientSubtitle && (
                <p className="text-gray-500">{patientSubtitle}</p>
              )}
            </div>
          </div>

          <Link href={`/doctor/patients/${patientId}/records/new`}>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Registro
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content: Sidebar + Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          cond.status === 'active' ? 'bg-amber-100 text-amber-700' :
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
                      <span className={`text-xs px-2 py-0.5 rounded mt-0.5 inline-block ${
                        allergy.severity === 'severe' ? 'bg-red-200 text-red-800' :
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

        {/* Right Content - 3/4 width */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <Tabs defaultValue="records">
              <TabsList className="border-b border-gray-100 px-6">
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
                  <div className="divide-y divide-gray-100">
                    {records.map((record) => (
                      <div
                        key={record.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium text-gray-900">{record.motive}</h3>
                              {getStatusBadge(record.status, record.record_source)}
                              {record.record_source === RecordSource.PATIENT && (
                                <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                  Paciente
                                </span>
                              )}
                              {record.record_source === RecordSource.DOCTOR && (
                                <span className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-600">
                                  Médico
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(record.created_at)}
                              </span>
                              {record.category && (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-xs">
                                  {record.category.name}
                                </span>
                              )}
                              {record.diagnoses?.length > 0 && (
                                <span className="text-gray-500">
                                  {record.diagnoses.length} diagnóstico(s)
                                </span>
                              )}
                            </div>
                            {record.patient_instructions && (
                              <p className="text-sm text-gray-600 mt-2 bg-amber-50 p-2 rounded">
                                <strong>Instrucciones:</strong> {record.patient_instructions}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedRecord(record); setModalOpen(true); }}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </Button>
                            {record.status === RecordStatus.UNVERIFIED && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVerify(record.id)}
                                disabled={verifyRecord.isPending}
                                className="flex items-center gap-1"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Verificar
                              </Button>
                            )}
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
