'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { PatientProfile } from '@/types';
import { PatientHealthHistory } from '@/app/profile/components/patient-health-history';
import { MedicationList } from '@/app/profile/components/medication-list';
import { HabitsTab } from '@/app/profile/components/HabitsTab';
import { FamilyHistoryTab } from '@/app/profile/components/FamilyHistoryTab';
import { ArrowLeft } from 'lucide-react';

export default function DoctorHealthHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const apiPrefix = `/doctor/patients/${patientId}`;

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('history');

  const fetchProfile = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      // Fetch the patient's profile data via the doctor endpoint
      const res = await api.get(`/doctor/patients/${patientId}/health`);
      // Build a PatientProfile-like object from the health data
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

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/doctor/patients/${patientId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-emerald-950">Historial de Salud del Paciente</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-0 w-full flex-wrap">
          <TabsTrigger value="history" className="flex-1 rounded-tl-lg">Condiciones y Alergías</TabsTrigger>
          <TabsTrigger value="medications" className="flex-1">Medicamentos</TabsTrigger>
          <TabsTrigger value="habits" className="flex-1">Hábitos</TabsTrigger>
          <TabsTrigger value="family-history" className="flex-1 rounded-tr-lg">Antecedentes Familiares</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <div className="bg-white p-6 rounded-b-lg rounded-tr-lg shadow-sm border border-[var(--border-light)]">
            <PatientHealthHistory
              profile={profile}
              onRefresh={fetchProfile}
              apiPrefix={apiPrefix}
            />
          </div>
        </TabsContent>

        <TabsContent value="medications">
          <div className="bg-white p-6 rounded-b-lg shadow-sm border border-[var(--border-light)]">
            <MedicationList
              profile={profile}
              onRefresh={fetchProfile}
              apiPrefix={apiPrefix}
            />
          </div>
        </TabsContent>

        <TabsContent value="habits">
          <div className="bg-white p-6 rounded-b-lg shadow-sm border border-[var(--border-light)]">
            <HabitsTab onRefresh={fetchProfile} apiPrefix={apiPrefix} />
          </div>
        </TabsContent>

        <TabsContent value="family-history">
          <div className="bg-white p-6 rounded-b-lg shadow-sm border border-[var(--border-light)]">
            <FamilyHistoryTab onRefresh={fetchProfile} apiPrefix={apiPrefix} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
