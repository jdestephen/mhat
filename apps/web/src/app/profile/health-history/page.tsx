'use client';

import React, { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import api from '@/lib/api';
import { User, UserRole, PatientProfile } from '@/types';
import { PatientHealthHistory } from '../components/patient-health-history';
import { MedicationList } from '../components/medication-list';
import { HabitsTab } from '../components/HabitsTab';
import { FamilyHistoryTab } from '../components/FamilyHistoryTab';

export default function HealthHistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await api.get<User>('/auth/me');
      setUser(userRes.data);

      if (userRes.data.role === UserRole.PATIENT) {
        const profileRes = await api.get<PatientProfile>('/profiles/patient');
        setProfile(profileRes.data);
      }
    } catch (error) {
      console.error('Error fetching profile', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
    );
  }
  
  if (!user) {
    return <div className="p-8">Error al cargar usuario</div>;
  }

  if (user.role !== UserRole.PATIENT) {
    return (
      <div className="max-w-7xl mx-auto pb-20">
        <h1 className="text-3xl font-bold mb-8 text-emerald-950">Historial de Salud</h1>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
          <p className="text-slate-600">Esta sección es solo para pacientes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <h1 className="text-3xl font-bold mb-8 text-emerald-950">Historial de Salud</h1>
      
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="mb-0 w-full flex-wrap">
          <TabsTrigger value="history" className="flex-1 rounded-tl-lg">Condiciones y Alergías</TabsTrigger>
          <TabsTrigger value="medications" className="flex-1">Medicamentos</TabsTrigger>
          <TabsTrigger value="habits" className="flex-1">Hábitos</TabsTrigger>
          <TabsTrigger value="family-history" className="flex-1 rounded-tr-lg">Antecedentes Familiares</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <div className="bg-white p-6 rounded-b-lg rounded-tr-lg shadow-sm border border-[var(--border-light)]">
            {profile && (
              <PatientHealthHistory
                profile={profile}
                onRefresh={fetchData}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="medications">
          <div className="bg-white p-6 rounded-b-lg shadow-sm border border-[var(--border-light)]">
            {profile && (
              <MedicationList
                profile={profile}
                onRefresh={fetchData}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="habits">
          <div className="bg-white p-6 rounded-b-lg shadow-sm border border-[var(--border-light)]">
            <HabitsTab onRefresh={fetchData} />
          </div>
        </TabsContent>

        <TabsContent value="family-history">
          <div className="bg-white p-6 rounded-b-lg shadow-sm border border-[var(--border-light)]">
            <FamilyHistoryTab onRefresh={fetchData} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

