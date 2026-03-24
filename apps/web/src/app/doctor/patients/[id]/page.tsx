'use client';

import React, { useState, useMemo, use, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePatientRecords } from '@/hooks/queries/usePatientRecords';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useMyPatients } from '@/hooks/queries/useMyPatients';
import { usePatientHealth } from '@/hooks/queries/usePatientHealth';
import { useVerifyRecord } from '@/hooks/mutations/useVerifyRecord';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UserRole, RecordStatus, AccessLevel, VitalSigns } from '@/types';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Pill,
  ClipboardList,
  Plus,
  Eye,
  User,
  Paperclip,
  Download,
  ChevronDown,
  LayoutGrid,
  HeartPulse,
  ArrowLeft,
  Activity,
} from 'lucide-react';
import { RecordDetailModal, RecordDetailData } from '@/components/records/RecordDetailModal';
import { RecordCard, RecordCardData } from '@/components/records/RecordCard';
import { HealthSidebar } from '@/components/patient/HealthSidebar';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { Pagination } from '@/components/ui/Pagination';
import { VitalSignsModal } from '@/components/clinical/VitalSignsModal';
import { getVitalColor, getBpColor } from '@/lib/vitalSignsRanges';
import api, { getDocumentUrl } from '@/lib/api';


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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [vitalModalOpen, setVitalModalOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [vsPage, setVsPage] = useState(1);
  const [rxPage, setRxPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const VS_PAGE_SIZE = 10;
  const PLAN_PAGE_SIZE = 3;

  // Fetch vital signs history
  const { data: vitalSigns = [] } = useQuery<VitalSigns[]>({
    queryKey: ['patient-vital-signs', patientId],
    queryFn: async () => {
      const res = await api.get(`/doctor/patients/${patientId}/vital-signs`);
      return res.data;
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(false);
      }
    };
    if (actionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuOpen]);

  // Auto-open upload modal via query param
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('action') === 'upload') {
      setUploadModalOpen(true);
      router.replace(`/doctor/patients/${patientId}`, { scroll: false });
    }
  }, [searchParams, patientId, router]);

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
        patient.blood_type ? `🩸 ${patient.blood_type}` : null,
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

  const allDocuments = useMemo(
    () =>
      records
        .flatMap((r) =>
          (r.documents || []).map((doc) => ({
            ...doc,
            recordId: r.id,
            recordMotive: r.motive,
            recordCategory: r.category?.name,
            recordDate: r.created_at,
          })),
        )
        .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()),
    [records],
  );

  const handleViewDetail = (cardData: RecordCardData) => {
    const fullRecord = records.find((r) => r.id === cardData.id);
    if (fullRecord) {
      setSelectedRecord(fullRecord as RecordDetailData);
      setModalOpen(true);
      // Fire background request to trigger view logging on the server
      api.get(`/doctor/records/${fullRecord.id}`).catch(() => {});
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
        <div>
          <Link href="/doctor" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" />
            Mis Pacientes
          </Link>
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
        </div>

        {/* Left Sidebar - Health Profile */}
        <HealthSidebar
          medications={health?.medications ?? []}
          conditions={health?.conditions ?? []}
          allergies={health?.allergies ?? []}
          healthHabit={health?.health_habit ?? null}
          familyHistory={health?.family_history ?? []}
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
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Exámenes
                </TabsTrigger>
                <TabsTrigger value="vitals" className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" />
                  Signos Vitales
                </TabsTrigger>
                <TabsTrigger value="plan" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Plan
                </TabsTrigger>

                <div className="flex-1 flex justify-end gap-1">
                  {isReadOnly ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                      <Eye className="h-4 w-4" />
                      Solo lectura
                    </span>
                  ) : (
                    <div className="relative" ref={actionMenuRef}>
                      <div className="flex items-center">
                        <Link href={`/doctor/patients/${patientId}/records/new`}>
                          <Button
                            className="flex items-center gap-2 rounded-r-none border-r border-emerald-700/30"
                            variant="default"
                          >
                            <Plus className="h-4 w-4" />
                            Nuevo Registro
                          </Button>
                        </Link>
                        <Button
                          variant="default"
                          className="px-2 rounded-l-none"
                          onClick={() => setActionMenuOpen((prev) => !prev)}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${actionMenuOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>
                      {actionMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                          <Link
                            href={`/doctor/patients/${patientId}/records/new-tabbed`}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={() => setActionMenuOpen(false)}
                          >
                            <LayoutGrid className="h-4 w-4" />
                            Nuevo (Tabs)
                          </Link>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setActionMenuOpen(false);
                              setUploadModalOpen(true);
                            }}
                          >
                            <Paperclip className="h-4 w-4" />
                            Examenes
                          </button>
                          <div className="border-t border-gray-100 my-1" />
                          <Link
                            href={`/doctor/patients/${patientId}/health-history`}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={() => setActionMenuOpen(false)}
                          >
                            <ClipboardList className="h-4 w-4 text-purple-600" />
                            Historial de Salud
                          </Link>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setActionMenuOpen(false);
                              setVitalModalOpen(true);
                            }}
                          >
                            <Activity className="h-4 w-4 text-rose-600" />
                            Signos Vitales
                          </button>
                        </div>
                      )}
                    </div>
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

              {/* Documents Tab */}
              <TabsContent value="documents" className="p-0">
                {allDocuments.length === 0 ? (
                  <div className="p-12 text-center">
                    <Paperclip className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sin documentos</h3>
                    <p className="text-gray-500 mb-6">Este paciente no tiene documentos adjuntos</p>
                    {!isReadOnly && (
                      <Button onClick={() => setUploadModalOpen(true)}>
                        <Paperclip className="h-4 w-4 mr-2" />
                        Adjuntar Documento
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col p-2 gap-2">
                    {allDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {doc.filename}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {doc.recordCategory && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  {doc.recordCategory}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                {formatDate(doc.recordDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => window.open(getDocumentUrl(doc.url), '_blank')}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Vital Signs History Tab */}
              <TabsContent value="vitals" className="p-0">
                {vitalSigns.length === 0 ? (
                  <div className="p-12 text-center">
                    <HeartPulse className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sin signos vitales</h3>
                    <p className="text-gray-500">No hay registros de signos vitales para este paciente</p>
                  </div>
                ) : (
                  <div className="p-4 overflow-x-auto">
                    {/* Table header */}
                    <div className="flex min-w-[900px] text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 rounded-t border border-slate-200 px-3 py-2">
                      <div className="w-28 flex-shrink-0">Fecha</div>
                      <div className="flex-1 text-center">FC</div>
                      <div className="flex-1 text-center">PA</div>
                      <div className="flex-1 text-center">Temp</div>
                      <div className="flex-1 text-center">FR</div>
                      <div className="flex-1 text-center">SpO₂</div>
                      <div className="flex-1 text-center">Peso</div>
                      <div className="flex-1 text-center">Talla</div>
                      <div className="flex-1 text-center">Gluc.</div>
                      <div className="flex-1 text-center">C. Abd.</div>
                    </div>
                    {/* Table rows */}
                    {vitalSigns
                      .slice((vsPage - 1) * VS_PAGE_SIZE, vsPage * VS_PAGE_SIZE)
                      .map((vs) => (
                        <div
                          key={vs.id}
                          className="flex min-w-[900px] items-center px-3 py-2.5 border-x border-b border-slate-200 hover:bg-slate-50 transition-colors text-sm"
                        >
                          <div className="w-28 flex-shrink-0 text-xs text-slate-600 font-medium">
                            {new Date(vs.measured_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                            <div className="text-[10px] text-blue-600">
                              {new Date(vs.measured_at).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                          <div className={`flex-1 text-center ${getVitalColor('heart_rate', vs.heart_rate)}`}>
                            {vs.heart_rate != null ? <span>{vs.heart_rate} <span className="text-[10px] text-slate-400">bpm</span></span> : '—'}
                          </div>
                          <div className={`flex-1 text-center ${getBpColor(vs.systolic_bp, vs.diastolic_bp)}`}>
                            {vs.systolic_bp != null && vs.diastolic_bp != null
                              ? <span>{vs.systolic_bp}/{vs.diastolic_bp}</span>
                              : vs.systolic_bp != null ? `${vs.systolic_bp}/—`
                              : vs.diastolic_bp != null ? `—/${vs.diastolic_bp}`
                              : '—'}
                          </div>
                          <div className={`flex-1 text-center ${getVitalColor('temperature', vs.temperature)}`}>
                            {vs.temperature != null ? <span>{vs.temperature} <span className="text-[10px] text-slate-400">°C</span></span> : '—'}
                          </div>
                          <div className={`flex-1 text-center ${getVitalColor('respiratory_rate', vs.respiratory_rate)}`}>
                            {vs.respiratory_rate != null ? <span>{vs.respiratory_rate} <span className="text-[10px] text-slate-400">rpm</span></span> : '—'}
                          </div>
                          <div className={`flex-1 text-center ${getVitalColor('oxygen_saturation', vs.oxygen_saturation)}`}>
                            {vs.oxygen_saturation != null ? <span>{vs.oxygen_saturation}<span className="text-[10px] text-slate-400">%</span></span> : '—'}
                          </div>
                          <div className="flex-1 text-center text-slate-700">
                            {vs.weight != null ? <span>{vs.weight} <span className="text-[10px] text-slate-400">kg</span></span> : '—'}
                          </div>
                          <div className="flex-1 text-center text-slate-700">
                            {vs.height != null ? <span>{vs.height} <span className="text-[10px] text-slate-400">cm</span></span> : '—'}
                          </div>
                          <div className={`flex-1 text-center ${getVitalColor('blood_glucose', vs.blood_glucose)}`}>
                            {vs.blood_glucose != null ? <span>{vs.blood_glucose} <span className="text-[10px] text-slate-400">mg/dL</span></span> : '—'}
                          </div>
                          <div className="flex-1 text-center text-slate-700">
                            {vs.waist_circumference != null ? <span>{vs.waist_circumference} <span className="text-[10px] text-slate-400">cm</span></span> : '—'}
                          </div>
                        </div>
                      ))}
                    <Pagination
                      currentPage={vsPage}
                      totalPages={Math.max(1, Math.ceil(vitalSigns.length / VS_PAGE_SIZE))}
                      totalItems={vitalSigns.length}
                      pageSize={VS_PAGE_SIZE}
                      onPageChange={setVsPage}
                      itemLabel="registros"
                    />
                  </div>
                )}
              </TabsContent>

              {/* Plan Tab (Prescriptions + Orders) */}
              <TabsContent value="plan" className="p-0">
                <div className="p-4 space-y-6">
                  {/* Prescriptions Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                      <Pill className="h-4 w-4 text-blue-500" />
                      Recetas
                      <span className="text-xs font-normal text-slate-400">({allPrescriptions.length})</span>
                    </h3>
                    {allPrescriptions.length === 0 ? (
                      <div className="py-6 text-center border border-dashed border-slate-200 rounded-lg">
                        <Pill className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">Sin recetas</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-2">
                          {allPrescriptions
                            .slice((rxPage - 1) * PLAN_PAGE_SIZE, rxPage * PLAN_PAGE_SIZE)
                            .map((rx) => (
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
                        {allPrescriptions.length > PLAN_PAGE_SIZE && (
                          <Pagination
                            currentPage={rxPage}
                            totalPages={Math.ceil(allPrescriptions.length / PLAN_PAGE_SIZE)}
                            totalItems={allPrescriptions.length}
                            pageSize={PLAN_PAGE_SIZE}
                            onPageChange={setRxPage}
                            itemLabel="recetas"
                          />
                        )}
                      </>
                    )}
                  </div>

                  {/* Divider */}
                  <hr className="border-slate-200" />

                  {/* Orders Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                      <ClipboardList className="h-4 w-4 text-amber-500" />
                      Órdenes
                      <span className="text-xs font-normal text-slate-400">({allOrders.length})</span>
                    </h3>
                    {allOrders.length === 0 ? (
                      <div className="py-6 text-center border border-dashed border-slate-200 rounded-lg">
                        <ClipboardList className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">Sin órdenes</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-2">
                          {allOrders
                            .slice((ordersPage - 1) * PLAN_PAGE_SIZE, ordersPage * PLAN_PAGE_SIZE)
                            .map((order) => (
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
                        {allOrders.length > PLAN_PAGE_SIZE && (
                          <Pagination
                            currentPage={ordersPage}
                            totalPages={Math.ceil(allOrders.length / PLAN_PAGE_SIZE)}
                            totalItems={allOrders.length}
                            pageSize={PLAN_PAGE_SIZE}
                            onPageChange={setOrdersPage}
                            itemLabel="órdenes"
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
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
        onEdit={selectedRecord ? () => {
          setModalOpen(false);
          router.push(`/doctor/patients/${patientId}/records/${selectedRecord.id}/edit`);
        } : undefined}
      />

      {/* Document Upload Modal */}
      <DocumentUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        patientId={patientId}
        onSuccess={() => refetch()}
      />

      {/* Vital Signs Modal */}
      <VitalSignsModal
        open={vitalModalOpen}
        onOpenChange={setVitalModalOpen}
        patientId={patientId}
        patientName={patientName}
      />
    </div>
  );
}
