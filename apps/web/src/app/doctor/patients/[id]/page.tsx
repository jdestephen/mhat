'use client';

import React, { useState, use } from 'react';
import { usePatientRecords } from '@/hooks/queries/usePatientRecords';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useMyPatients } from '@/hooks/queries/useMyPatients';
import { usePatientHealth } from '@/hooks/queries/usePatientHealth';
import { useVerifyRecord } from '@/hooks/mutations/useVerifyRecord';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UserRole, RecordStatus, AccessLevel } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Pill,
  ClipboardList,
  Plus,
  Eye,
  User,
} from 'lucide-react';
import { RecordDetailModal, RecordDetailData } from '@/components/records/RecordDetailModal';
import { RecordCard, RecordCardData } from '@/components/records/RecordCard';
import { HealthSidebar } from '@/components/patient/HealthSidebar';


export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = use(params);
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: patients = [] } = useMyPatients();
  const { data: records = [], isLoading: recordsLoading, refetch } = usePatientRecords(patientId);
  const { data: health } = usePatientHealth(patientId);
  const verifyRecord = useVerifyRecord();
  const [selectedRecord, setSelectedRecord] = useState<RecordDetailData | null>(null);
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

  // Collect all prescriptions and orders from records
  const allPrescriptions = records.flatMap((r) => r.prescriptions || []);
  const allOrders = records.flatMap((r) => r.clinical_orders || []);

  const handleViewDetail = (cardData: RecordCardData) => {
    const fullRecord = records.find((r) => r.id === cardData.id);
    if (fullRecord) {
      setSelectedRecord(fullRecord as RecordDetailData);
      setModalOpen(true);
    }
  };

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
        <HealthSidebar
          medications={health?.medications ?? []}
          conditions={health?.conditions ?? []}
          allergies={health?.allergies ?? []}
        />
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
                      <RecordCard
                        key={record.id}
                        record={record}
                        index={index}
                        onViewDetail={handleViewDetail}
                      />
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
                  <div className="flex flex-col gap-2 divide-y divide-gray-100 p-2">
                    {allPrescriptions.map((rx) => (
                      <div key={rx.id} className="p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{rx.medication_name}</h3>
                            <div className="text-sm text-gray-500 mt-2 space-y-1">

                              {rx.dosage && <p>Dosis: {rx.dosage}</p>}
                              {rx.frequency && <p>Frecuencia: {rx.frequency}</p>}
                              {rx.duration && <p>Duración: {rx.duration}</p>}
                              {rx.instructions && (
                                <p className="text-gray-600 mt-2">{rx.instructions}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-blue-700">
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
                  <div className="flex flex-col p-2 gap-2 divide-y divide-gray-100">
                    {allOrders.map((order) => (
                      <div key={order.id} className="p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col gap-1">
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
                            <h3 className="font-medium text-gray-900 mt-2">{order.description}</h3>
                            {order.reason && (
                              <p className="text-sm text-gray-500">{order.reason}</p>
                            )}
                            {order.referral_to && (
                              <p className="text-sm text-gray-600 mt-1">
                                Referir a: {order.referral_to}
                              </p>
                            )}
                          </div>
                          <span className="text-sm text-blue-600">
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
