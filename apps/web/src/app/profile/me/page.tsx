'use client';

import React, { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { User, UserRole, PatientProfile, DoctorProfile } from '@/types';
import api from '@/lib/api';
import { PatientProfileForm } from './PatientProfileForm';
import { DoctorProfileForm } from './DoctorProfileForm';
import { PersonalReferencesTab } from './PersonalReferencesTab';

export default function PersonalInfoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PatientProfile | DoctorProfile | null>(null);
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
      } else {
        const profileRes = await api.get<DoctorProfile>('/profiles/doctor');
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

  if (!user || !profile) {
    return <div className="p-8">Error al cargar usuario</div>;
  }

  const isPatient = user.role === UserRole.PATIENT;

  return (
    <div className="max-w-2xl mx-auto pb-20 px-4 sm:px-0">
      <h1 className="text-3xl font-bold mb-8 text-emerald-950">Mi Perfil</h1>

      {isPatient ? (
        <Tabs defaultValue="personal">
          <TabsList>
            <TabsTrigger value="personal">Datos Personales</TabsTrigger>
            <TabsTrigger value="references">Contactos de Emergencia</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
              <PatientProfileForm
                user={user}
                profile={profile as PatientProfile}
                onSaved={fetchData}
              />
            </div>
          </TabsContent>

          <TabsContent value="references">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
              <PersonalReferencesTab
                references={(profile as PatientProfile).personal_references || []}
                onRefresh={fetchData}
              />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
          <DoctorProfileForm
            user={user}
            profile={profile as DoctorProfile}
            onSaved={fetchData}
          />
        </div>
      )}
    </div>
  );
}
