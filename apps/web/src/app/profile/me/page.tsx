'use client';

import React, { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { User, UserRole, PatientProfile, DoctorProfile } from '@/types';
import api from '@/lib/api';
import { PatientProfileForm } from './PatientProfileForm';
import { DoctorProfileForm } from './DoctorProfileForm';
import { PersonalReferencesTab } from './PersonalReferencesTab';
import { ChangePasswordForm } from './ChangePasswordForm';
import { LocationManager } from '@/components/patient/LocationManager';
import { useProductTour } from '@/hooks/useProductTour';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Compass } from 'lucide-react';

export default function PersonalInfoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PatientProfile | DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { activeProfileId, isManagingOther } = useActiveProfile();

  useEffect(() => {
    fetchData();
  }, [activeProfileId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userRes = await api.get<User>('/auth/me');
      setUser(userRes.data);

      if (userRes.data.role === UserRole.PATIENT) {
        const params = new URLSearchParams();
        if (activeProfileId) params.append('profile_id', activeProfileId);
        const profileRes = await api.get<PatientProfile>(
          `/profiles/patient${params.toString() ? '?' + params.toString() : ''}`
        );
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

  const { startTour } = useProductTour();

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
    <div className="max-w-2xl mx-auto pb-20 px-0 sm:px-0">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-emerald-950">
          {isManagingOther ? 'Perfil del Familiar' : 'Mi Perfil'}
        </h1>
        {isPatient && !isManagingOther && (
          <button
            onClick={startTour}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-600 transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Ver tour de la app</span>
          </button>
        )}
      </div>

      {isPatient ? (
        <Tabs defaultValue="personal">
          <TabsList>
            <TabsTrigger value="personal">Datos Personales</TabsTrigger>
            <TabsTrigger value="references">
              <span className="hidden sm:inline">Contactos de Emergencia</span>
              <span className="sm:hidden">Emergencia</span>
            </TabsTrigger>
            <TabsTrigger value="locations">
              <span className="hidden sm:inline">Ubicaciones</span>
              <span className="sm:hidden">Ubic.</span>
            </TabsTrigger>
            {!isManagingOther && (
              <TabsTrigger value="security">Seguridad</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="personal">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
              <PatientProfileForm
                user={user}
                profile={profile as PatientProfile}
                onSaved={fetchData}
                profileId={activeProfileId || undefined}
                isManaged={isManagingOther}
              />
            </div>
          </TabsContent>

          <TabsContent value="references">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
              <PersonalReferencesTab
                references={(profile as PatientProfile).personal_references || []}
                onRefresh={fetchData}
                profileId={activeProfileId || undefined}
              />
            </div>
          </TabsContent>

          <TabsContent value="locations">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
              <LocationManager
                locations={(profile as PatientProfile).locations || []}
                onRefresh={fetchData}
              />
            </div>
          </TabsContent>

          {!isManagingOther && (
            <TabsContent value="security">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
                <ChangePasswordForm />
              </div>
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <Tabs defaultValue="personal">
          <TabsList>
            <TabsTrigger value="personal">Datos Personales</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
              <DoctorProfileForm
                user={user}
                profile={profile as DoctorProfile}
                onSaved={fetchData}
              />
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
              <ChangePasswordForm />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
