'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { User, UserRole, PatientProfile } from '@/types';
import { PatientHealthHistory } from '../components/patient-health-history';
import { MedicationList } from '../components/medication-list';
import { SurgeriesTab } from '../components/surgeries-tab';
import { HabitsTab } from '../components/HabitsTab';
import { FamilyHistoryTab } from '../components/FamilyHistoryTab';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { ArrowLeft, Activity, Pill, Scissors, Coffee, Users } from 'lucide-react';

type Section = 'menu' | 'history' | 'medications' | 'surgeries' | 'habits' | 'family-history';

export default function HealthHistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>('menu');
  const { activeProfileId } = useActiveProfile();

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

  const menuItems = [
    { id: 'history', title: 'Condiciones y Alergias', desc: 'Registra tus enfermedades crónicas y alergias conocidas', icon: Activity },
    { id: 'medications', title: 'Medicamentos', desc: 'Gestiona tus medicamentos actuales e historial', icon: Pill },
    { id: 'surgeries', title: 'Cirugías', desc: 'Historial de intervenciones quirúrgicas pasadas', icon: Scissors },
    { id: 'habits', title: 'Hábitos', desc: 'Registro de estilo de vida, consumo de tabaco y alcohol', icon: Coffee },
    { id: 'family-history', title: 'Antecedentes Familiares', desc: 'Historial médico de tus familiares directos', icon: Users },
  ];

  return (
    <div className="max-w-4xl md:max-w-6xl mx-auto pb-20 lg:px-4 md:px-0 sm:px-0">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 text-emerald-950">Historial de Salud</h1>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6">
        <p className="text-xs text-blue-700">
          💡 Aquí puedes registrar tu historial de salud. Esta información será marcada
          como &quot;auto-reportada&quot; y un médico podrá verificarla durante tu consulta.
          Si no estás seguro de algún dato, puedes indicarlo como &quot;sospechado&quot;.
        </p>
      </div>

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
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-start text-left hover:border-emerald-400 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
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
                <PatientHealthHistory profile={profile} onRefresh={fetchData} profileId={activeProfileId || undefined} />
              )}
              {profile && activeSection === 'medications' && (
                <MedicationList profile={profile} onRefresh={fetchData} profileId={activeProfileId || undefined} />
              )}
              {profile && activeSection === 'surgeries' && (
                <SurgeriesTab profile={profile} onRefresh={fetchData} profileId={activeProfileId || undefined} />
              )}
              {activeSection === 'habits' && (
                <HabitsTab onRefresh={fetchData} profileId={activeProfileId || undefined} />
              )}
              {activeSection === 'family-history' && (
                <FamilyHistoryTab onRefresh={fetchData} profileId={activeProfileId || undefined} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
