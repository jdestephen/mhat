'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMyPatients } from '@/hooks/queries/useMyPatients';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { useClaimInvitation } from '@/hooks/mutations/useClaimInvitation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserRole, AccessLevel } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
  Users, 
  Search, 
  Calendar, 
  UserPlus,
  KeyRound,
  Check,
  X,
  AlertCircle,
  Eye,
  Settings,
  FileText,
  Paperclip,
  ClipboardList,
  Droplets,
  Activity,
  Mail,
  UserCircle,
  Navigation,
} from 'lucide-react';
import { VitalSignsModal } from '@/components/clinical/VitalSignsModal';
import { CreatePatientModal } from '@/components/doctor/CreatePatientModal';
import { ClaimRequestsPanel } from '@/components/doctor/ClaimRequestsPanel';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PatientPersonalInfoModal } from '@/components/doctor/PatientPersonalInfoModal';

export default function DoctorDashboardPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: patients = [], isLoading: patientsLoading } = useMyPatients();
  const claimInvitation = useClaimInvitation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claimResult, setClaimResult] = useState<{ success: boolean; message: string; patientName?: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [vitalModalOpen, setVitalModalOpen] = useState(false);
  const [vitalModalPatientId, setVitalModalPatientId] = useState<string>('');
  const [vitalModalPatientName, setVitalModalPatientName] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [personalInfoModalOpen, setPersonalInfoModalOpen] = useState(false);
  const [selectedPatientForInfo, setSelectedPatientForInfo] = useState<typeof patients[number] | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch locations for whichever patient's menu is currently open
  interface PatientLocation {
    id: number;
    label: string;
    latitude: number;
    longitude: number;
    address: string | null;
    is_default: boolean;
  }
  const { data: menuPatientLocations = [] } = useQuery<PatientLocation[]>({
    queryKey: ['patient-locations', openMenuId],
    queryFn: async () => {
      const res = await api.get<PatientLocation[]>(`/doctor/patients/${openMenuId}/locations`);
      return res.data;
    },
    enabled: !!openMenuId && patients.find(p => p.patient_id === openMenuId)?.access_level === AccessLevel.WRITE,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Redirect non-doctors
  useEffect(() => {
    if (!userLoading && user?.role !== UserRole.DOCTOR) {
      router.replace('/dashboard');
    }
  }, [userLoading, user?.role, router]);

  if (!userLoading && user?.role !== UserRole.DOCTOR) {
    return null;
  }

  // Filter patients by search
  const filteredPatients = patients.filter((p) =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (userLoading || patientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-emerald-950">Panel Médico</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Gestiona tus pacientes y registros clínicos</p>
      </div>

      {/* Claim Requests (pending patient link requests) */}
      <ClaimRequestsPanel />

      {/* Claim Invitation */}
      {showClaimForm && (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Vincular Paciente
            </h2>
            <button onClick={() => { setShowClaimForm(false); setClaimCode(''); setClaimResult(null); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {claimResult ? (
            <div className={`rounded-lg p-4 flex items-start gap-3 ${
              claimResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}>
              {claimResult.success ? (
                <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${claimResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                  {claimResult.message}
                </p>
                {claimResult.patientName && (
                  <p className="text-sm text-emerald-600 mt-1">Paciente: {claimResult.patientName}</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-3">Ingresa el código de invitación que te compartió el paciente</p>
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="ej. MHAT-A7K9M2"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                  className="font-mono text-lg tracking-wider max-w-xs"
                  autoFocus
                />
                <Button
                  onClick={async () => {
                    try {
                      const result = await claimInvitation.mutateAsync(claimCode);
                      setClaimResult({
                        success: true,
                        message: result.message,
                        patientName: result.patient_name,
                      });
                      setClaimCode('');
                    } catch (err: unknown) {
                      const error = err as { response?: { data?: { detail?: string } } };
                      setClaimResult({
                        success: false,
                        message: error.response?.data?.detail || 'Error al vincular paciente',
                      });
                    }
                  }}
                  disabled={!claimCode.trim() || claimInvitation.isPending}
                >
                  {claimInvitation.isPending ? 'Vinculando...' : 'Vincular'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patient List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Mis Pacientes</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowClaimForm(true); setClaimResult(null); }}
                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  <KeyRound className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Vincular</span>
                  <span className="sm:hidden">Vincular</span>
                </Button>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  <UserPlus className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Crear Paciente</span>
                  <span className="sm:hidden">Crear</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={searchTerm ? 'No se encontraron pacientes' : 'Sin pacientes aún'}
            description={searchTerm 
              ? 'Intenta con otro término de búsqueda'
              : 'Los pacientes aparecerán aquí cuando les otorgues acceso'}
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPatients.map((patient) => (
              <div
                key={patient.patient_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 hover:bg-gray-50/50 transition-colors gap-3"
              >
                {/* Left: Avatar + Info */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <Avatar firstName={patient.first_name} lastName={patient.last_name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {patient.first_name} {patient.last_name}
                      </p>
                      {/* Account status indicator */}
                      {patient.has_account ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700" title="Cuenta activa">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Cuenta
                        </span>
                      ) : patient.email ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700" title="Email enviado, sin cuenta">
                          <Mail className="h-2.5 w-2.5" />
                          Invitado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500" title="Sin cuenta">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Sin cuenta
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                      {patient.date_of_birth && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(patient.date_of_birth)}
                        </span>
                      )}
                      {patient.blood_type && (
                        <span className="flex items-center gap-1 text-red-600">
                          <Droplets className="h-3.5 w-3.5" />
                          {patient.blood_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Access Badge + Actions */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto sm:ml-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    patient.access_level === AccessLevel.WRITE
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {patient.access_level === AccessLevel.WRITE ? 'Escritura' : 'Lectura'}
                  </span>

                  <Link href={`/doctor/patients/${patient.patient_id}`}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>

                  {/* Gear Dropdown */}
                  <div className="relative" ref={openMenuId === patient.patient_id ? menuRef : undefined}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      onClick={() => setOpenMenuId(openMenuId === patient.patient_id ? null : patient.patient_id)}
                    >
                      <Settings className="h-4 w-4 text-gray-500" />
                    </Button>
                    {openMenuId === patient.patient_id && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <Link
                          href={`/doctor/patients/${patient.patient_id}/records/new`}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <FileText className="h-4 w-4 text-emerald-600" />
                          Nuevo Registro Médico
                        </Link>
                        <Link
                          href={`/doctor/patients/${patient.patient_id}?action=upload`}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <Paperclip className="h-4 w-4 text-blue-600" />
                          Adjuntar Examen
                        </Link>
                        <div className="border-t border-gray-100 my-1" />
                        <Link
                          href={`/doctor/patients/${patient.patient_id}/health-history`}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <ClipboardList className="h-4 w-4 text-purple-600" />
                          Historial de Salud
                        </Link>
                        <button
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setOpenMenuId(null);
                            setVitalModalPatientId(patient.patient_id);
                            setVitalModalPatientName(`${patient.first_name} ${patient.last_name}`);
                            setVitalModalOpen(true);
                          }}
                        >
                          <Activity className="h-4 w-4 text-rose-600" />
                          Signos Vitales
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setOpenMenuId(null);
                            setSelectedPatientForInfo(patient);
                            setPersonalInfoModalOpen(true);
                          }}
                        >
                          <UserCircle className="h-4 w-4 text-slate-600" />
                          Datos Personales
                        </button>
                        {menuPatientLocations.length > 0 && (
                          <>
                            <div className="border-t border-gray-100 my-1" />
                            <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Ubicaciones
                            </div>
                            {menuPatientLocations.map((loc) => (
                              <button
                                key={loc.id}
                                type="button"
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  window.open(
                                    `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`,
                                    '_blank',
                                  );
                                }}
                              >
                                <Navigation className="h-4 w-4 text-blue-500" />
                                <span className="truncate">{loc.label}</span>
                                {loc.is_default && (
                                  <span className="ml-auto text-[10px] text-emerald-600 font-medium">Principal</span>
                                )}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Vital Signs Modal */}
    <VitalSignsModal
      open={vitalModalOpen}
      onOpenChange={setVitalModalOpen}
      patientId={vitalModalPatientId}
      patientName={vitalModalPatientName}
    />

    {/* Create Patient Modal */}
    <CreatePatientModal
      open={showCreateModal}
      onOpenChange={setShowCreateModal}
      onSuccess={(patientId) => router.push(`/doctor/patients/${patientId}`)}
    />

    {/* Patient Personal Info Modal */}
    {selectedPatientForInfo && (
      <PatientPersonalInfoModal
        open={personalInfoModalOpen}
        onOpenChange={setPersonalInfoModalOpen}
        patient={selectedPatientForInfo}
        onSuccess={() => {}}
      />
    )}
    </>
  );
}
