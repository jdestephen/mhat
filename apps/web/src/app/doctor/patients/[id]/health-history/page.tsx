'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { PatientProfile } from '@/types';
import { PatientHealthHistory } from '@/app/profile/components/patient-health-history';
import { MedicationList } from '@/app/profile/components/medication-list';
import { HabitsTab } from '@/app/profile/components/HabitsTab';
import { FamilyHistoryTab } from '@/app/profile/components/FamilyHistoryTab';
import { SurgeriesTab } from '@/app/profile/components/surgeries-tab';
import { VaccinesTab } from '@/app/profile/components/VaccinesTab';
import { ArrowLeft, Activity, Pill, Scissors, Coffee, Users, Syringe } from 'lucide-react';
import { PatientInfoBanner } from '@/components/doctor/PatientInfoBanner';
import { useMyPatients } from '@/hooks/queries/useMyPatients';

type Section = 'menu' | 'history' | 'medications' | 'surgeries' | 'vaccines' | 'habits' | 'family-history';

export default function DoctorHealthHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const apiPrefix = `/doctor/patients/${patientId}`;

  const { data: patients = [] } = useMyPatients();
  const patient = patients.find((p) => p.patient_id === patientId);

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('menu');

  const fetchProfile = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await api.get(`/doctor/patients/${patientId}/health`);
      const healthData = res.data;
      setProfile({
        id: patientId,
        conditions: (healthData.conditions || []).map((c: Record<string, unknown>) => ({
          ...c,
          patient_profile_id: patientId,
          created_at: c.created_at || new Date().toISOString(),
          deleted: false,
        })),
        allergies: (healthData.allergies || []).map((a: Record<string, unknown>) => ({
          ...a,
          patient_profile_id: patientId,
          created_at: a.created_at || new Date().toISOString(),
          deleted: false,
        })),
        medications: (healthData.medications || []).map((m: Record<string, unknown>) => ({
          ...m,
          patient_profile_id: patientId,
          created_at: m.created_at || new Date().toISOString(),
          deleted: false,
        })),
        surgeries: (healthData.surgeries || []).map((s: Record<string, unknown>) => ({
          ...s,
          patient_profile_id: patientId,
          created_at: s.created_at || new Date().toISOString(),
          deleted: false,
        })),
        vaccines: (healthData.vaccines || []).map((v: Record<string, unknown>) => ({
          ...v,
          patient_profile_id: patientId,
          created_at: v.created_at || new Date().toISOString(),
          deleted: false,
        })),
      } as unknown as PatientProfile);
    } catch (err) {
      console.error('Error loading patient health data', err);
      setError('No se pudo cargar el historial de salud del paciente.');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) fetchProfile(true);
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto pb-20">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
          <p className="text-red-600">{error || 'Error al cargar datos.'}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'history', title: 'Condiciones y Alergias', desc: 'Registro de enfermedades y alergias del paciente', icon: Activity },
    { id: 'medications', title: 'Medicamentos', desc: 'Gestión y control de medicamentos recetados', icon: Pill },
    { id: 'surgeries', title: 'Cirugías', desc: 'Historial de intervenciones quirúrgicas', icon: Scissors },
    { id: 'vaccines', title: 'Vacunas', desc: 'Registro de vacunas e inmunizaciones aplicadas', icon: Syringe },
    { id: 'habits', title: 'Hábitos', desc: 'Hábitos de vida, consumo de sustancias y riesgos', icon: Coffee },
    { id: 'family-history', title: 'Antecedentes Familiares', desc: 'Información médica del núcleo familiar', icon: Users },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/doctor/patients/${patientId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold text-emerald-950">
          Historial de Salud
        </h1>
      </div>

      {patient && (
        <div className="mb-6">
          <PatientInfoBanner
            patient={patient}
            variant='extended'
            layout="row"
            collapsible
            defaultCollapsed
          />
        </div>
      )}

      <div className="relative w-full overflow-hidden min-h-[500px]">
        {/* Menu View */}
        <div 
          className={`transition-all duration-500 ease-in-out w-full ${
            activeSection === 'menu'
              ? 'opacity-100 translate-x-0 relative z-10'
              : 'opacity-0 -translate-x-12 absolute top-0 pointer-events-none z-0'
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {menuItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveSection(item.id as Section)}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-start text-left hover:border-emerald-400 hover:shadow-md hover:cursor-pointer hover:-translate-y-1 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-emerald-100 transition-transform duration-300">
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Section View */}
        <div 
          className={`transition-all duration-500 ease-in-out w-full ${
            activeSection !== 'menu'
              ? 'opacity-100 translate-x-0 relative z-10'
              : 'opacity-0 translate-x-12 absolute top-0 pointer-events-none z-0'
          }`}
        >
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
            {/* Header / Back Button */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-slate-100">
              <Button 
                variant="ghost" 
                onClick={() => setActiveSection('menu')}
                className="text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 w-fit -ml-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al menú
              </Button>
              <div className="hidden sm:flex sm:ml-auto items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                {menuItems.find(i => i.id === activeSection)?.icon && React.createElement(menuItems.find(i => i.id === activeSection)!.icon, { className: "w-4 h-4" })}
                {menuItems.find(i => i.id === activeSection)?.title}
              </div>
            </div>
            
            {/* Forms Content */}
            <div className="min-h-[400px]">
              {profile && activeSection === 'history' && (
                <PatientHealthHistory profile={profile} onRefresh={fetchProfile} apiPrefix={apiPrefix} />
              )}
              {profile && activeSection === 'medications' && (
                <MedicationList profile={profile} onRefresh={fetchProfile} apiPrefix={apiPrefix} />
              )}
              {profile && activeSection === 'surgeries' && (
                <SurgeriesTab profile={profile} onRefresh={fetchProfile} apiPrefix={apiPrefix} />
              )}
              {profile && activeSection === 'vaccines' && (
                <VaccinesTab profile={profile} onRefresh={fetchProfile} apiPrefix={apiPrefix} />
              )}
              {activeSection === 'habits' && (
                <HabitsTab onRefresh={fetchProfile} apiPrefix={apiPrefix} />
              )}
              {activeSection === 'family-history' && (
                <FamilyHistoryTab onRefresh={fetchProfile} apiPrefix={apiPrefix} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
