'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  User,
  Heart,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { usePatientProfile } from '@/hooks/queries/usePatientProfile';
import { setSetupCompleted } from '@/hooks/useOnboardingStatus';
import { useProductTour } from '@/hooks/useProductTour';
import { PatientHealthHistory } from '@/app/profile/components/patient-health-history';
import { MedicationList } from '@/app/profile/components/medication-list';
import { Sex, UserRole, PatientProfile } from '@/types';
import api from '@/lib/api';

const SEX_OPTIONS = [
  { value: '', label: 'Selecciona...' },
  { value: Sex.MASCULINO, label: 'Masculino' },
  { value: Sex.FEMENINO, label: 'Femenino' },
];

const BLOOD_TYPE_OPTIONS = [
  { value: '', label: 'Selecciona...' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const STEPS = [
  { id: 'welcome', label: 'Bienvenida', icon: Sparkles },
  { id: 'personal', label: 'Info Personal', icon: User },
  { id: 'health', label: 'Historial de Salud', icon: Heart },
  { id: 'done', label: 'Listo', icon: CheckCircle2 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = usePatientProfile();
  const { startTour } = useProductTour();

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Personal info form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<Sex | ''>('');
  const [dob, setDob] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [phone, setPhone] = useState('');
  const [dni, setDni] = useState('');

  // Populate form with existing data
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setSex((user.sex as Sex) || '');
    }
    if (profile) {
      setDob(profile.date_of_birth || '');
      setBloodType(profile.blood_type || '');
      setPhone(profile.phone || '');
      setDni(profile.dni || '');
    }
  }, [user, profile]);

  // Redirect non-patients
  useEffect(() => {
    if (!userLoading && user && user.role !== UserRole.PATIENT) {
      router.replace('/doctor');
    }
  }, [user, userLoading, router]);

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
      </div>
    );
  }

  const handleSavePersonalInfo = async () => {
    setSaving(true);
    try {
      await api.put('/auth/me', {
        first_name: firstName || null,
        last_name: lastName || null,
        sex: sex || null,
      });
      await api.put('/profiles/patient', {
        date_of_birth: dob || null,
        blood_type: bloodType || null,
        phone: phone || null,
        dni: dni || null,
      });
      await refetchProfile();
      setCurrentStep(2);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    setSetupCompleted();
    startTour();
    router.push('/dashboard');
  };

  const handleSkip = () => {
    setSetupCompleted();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-start py-8 px-4">
      {/* Progress Bar */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = i === currentStep;
            const isCompleted = i < currentStep;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center flex-1"
              >
                <div className="flex items-center w-full">
                  {i > 0 && (
                    <div
                      className={`flex-1 h-0.5 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-gray-200'
                      } transition-colors duration-300`}
                    />
                  )}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-gray-200'
                      } transition-colors duration-300`}
                    />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 text-center hidden sm:block ${
                    isActive
                      ? 'text-emerald-700 font-semibold'
                      : isCompleted
                      ? 'text-emerald-600'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="w-full max-w-2xl">
        {/* ======== STEP 0: Welcome ======== */}
        {currentStep === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="w-10 h-10 text-emerald-700" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              ¡Bienvenido a MHAT!
            </h1>
            <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
              Tu historial médico personal, seguro y accesible. Vamos a
              configurar tu cuenta en unos pocos pasos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="w-8 h-8 bg-emerald-200 rounded-lg flex items-center justify-center mb-2">
                  <User className="w-4 h-4 text-emerald-700" />
                </div>
                <p className="text-sm font-medium text-gray-800">
                  Completa tu perfil
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Información personal básica
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center mb-2">
                  <Heart className="w-4 h-4 text-blue-700" />
                </div>
                <p className="text-sm font-medium text-gray-800">
                  Historial de salud
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Condiciones, alergias y medicamentos
                </p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center mb-2">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                </div>
                <p className="text-sm font-medium text-gray-800">
                  ¡Listo para usar!
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Tu historial médico te espera
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={() => setCurrentStep(1)} className="w-full sm:w-auto px-8">
                Comenzar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <button
                onClick={handleSkip}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Llenar después
              </button>
            </div>
          </div>
        )}

        {/* ======== STEP 1: Personal Info ======== */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Información Personal
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Estos datos son importantes para que tus médicos puedan
              identificarte correctamente.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Tu apellido"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Nacimiento <span className="text-red-400">*</span>
                </label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sexo <span className="text-red-400">*</span>
                  </label>
                  <Select
                    options={SEX_OPTIONS}
                    value={sex}
                    onChange={(val) => setSex(val as Sex | '')}
                    placeholder="Selecciona sexo..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Sangre
                  </label>
                  <Select
                    options={BLOOD_TYPE_OPTIONS}
                    value={bloodType}
                    onChange={(val) => setBloodType(String(val))}
                    placeholder="Selecciona..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DNI
                  </label>
                  <Input
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="Número de identidad"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Celular
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Número de celular"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setCurrentStep(0)}
                className="flex items-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSkip}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Llenar después
                </button>
                <Button
                  onClick={handleSavePersonalInfo}
                  disabled={saving || !firstName || !lastName || !sex || !dob}
                >
                  {saving ? 'Guardando...' : 'Continuar'}
                  {!saving && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======== STEP 2: Health Basics ======== */}
        {currentStep === 2 && profile && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Historial de Salud
            </h2>
            <p className="text-sm text-gray-500 mb-2">
              Registra tus condiciones médicas, alergias y medicamentos
              actuales.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6">
              <p className="text-xs text-blue-700">
                💡 Esta información será marcada como &quot;auto-reportada&quot;.
                Un médico podrá verificarla durante tu consulta. Si no estás
                seguro de algún dato, puedes llenarlo después.
              </p>
            </div>

            {/* Conditions & Allergies */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Condiciones y Alergias
              </h3>
              <PatientHealthHistory
                profile={profile}
                onRefresh={() => refetchProfile()}
              />
            </div>

            {/* Medications */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Medicamentos
              </h3>
              <MedicationList
                profile={profile}
                onRefresh={() => refetchProfile()}
              />
            </div>

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSkip}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Llenar después
                </button>
                <Button onClick={() => setCurrentStep(3)}>
                  Continuar <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======== STEP 3: Done ======== */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              ¡Todo listo!
            </h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              Tu cuenta está configurada. Ahora puedes empezar a usar MHAT
              para gestionar tu historial médico.
            </p>

            <div className="bg-gray-50 rounded-xl p-5 mb-8 text-left max-w-sm mx-auto">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                ¿Qué puedes hacer?
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  Crear registros de tus consultas médicas
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  Subir documentos (recetas, laboratorios)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  Registrar tus signos vitales
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  Compartir tu historial con tu médico
                </li>
              </ul>
            </div>

            <Button onClick={handleFinish} className="px-8">
              Ir a mi panel <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
