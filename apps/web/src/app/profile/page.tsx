'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import api from '@/lib/api';
import { User, UserRole, PatientProfile, DoctorProfile } from '@/types';

import { PatientHealthHistory } from './components/patient-health-history';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PatientProfile | DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Patient Fields
  const [dob, setDob] = useState('');
  const [bloodType, setBloodType] = useState('');
  
  // Doctor Fields
  const [degree, setDegree] = useState('');
  const [shortBio, setShortBio] = useState('');

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
          setDob(profileRes.data.date_of_birth || '');
          setBloodType(profileRes.data.blood_type || '');
      } else {
          const profileRes = await api.get<DoctorProfile>('/profiles/doctor');
          setProfile(profileRes.data);
          setDegree(profileRes.data.degree || '');
          setShortBio(profileRes.data.short_bio || '');
      }

    } catch (error) {
      console.error("Error fetching profile", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      if (user.role === UserRole.PATIENT) {
        await api.put('/profiles/patient', {
          date_of_birth: dob || null,
          blood_type: bloodType || null
        });
      } else {
        await api.put('/profiles/doctor', {
          date_of_birth: dob || null,
          degree: degree || null,
          short_bio: shortBio || null
        });
      }
      alert('Profile updated!');
    } catch (error) {
      console.error(error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
      <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
  );
  if (!user) return <div className="p-8">Error loading user</div>;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <h1 className="text-3xl font-bold mb-8 text-emerald-950">My Profile</h1>
      
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="mb-0">
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          {user.role === UserRole.PATIENT && (
             <TabsTrigger value="history">Health History</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info">
          <div className="bg-white p-6 rounded-b-lg rounded-tr-lg shadow-sm border border-[var(--border-light)]">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Basic Info (Read Only) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Full Name</label>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-800">
                        {user.first_name} {user.last_name}
                    </div>
                </div>
                <div>
                     <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
                     <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-800">
                        {user.email}
                    </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-medium mb-1">Date of Birth</label>
                   <Input 
                     type="date" 
                     value={dob} 
                     onChange={(e) => setDob(e.target.value)} 
                   />
                </div>
                
                {user.role === UserRole.PATIENT && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Blood Type</label>
                    <Input 
                      value={bloodType} 
                      onChange={(e) => setBloodType(e.target.value)} 
                      placeholder="e.g. O+"
                    />
                  </div>
                )}

                {user.role === UserRole.DOCTOR && (
                   <div>
                    <label className="block text-sm font-medium mb-1">Degree</label>
                    <Input 
                      value={degree} 
                      onChange={(e) => setDegree(e.target.value)} 
                      placeholder="e.g. MD, PhD"
                    />
                  </div>
                )}
              </div>

              {user.role === UserRole.DOCTOR && (
                <div>
                  <label className="block text-sm font-medium mb-1">Short Bio</label>
                  <textarea 
                    className="w-full min-h-[100px] rounded-md border border-slate-200 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                    value={shortBio}
                    onChange={(e) => setShortBio(e.target.value)}
                  />
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={saving} className="bg-emerald-900 hover:bg-emerald-800 text-white min-w-[150px]">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-white p-6 rounded-b-lg rounded-tr-lg shadow-sm border border-[var(--border-light)]">
            {user.role === UserRole.PATIENT && profile && (
                <PatientHealthHistory 
                   profile={profile as PatientProfile} 
                   onRefresh={fetchData}
                />
            )}
            {/* If unrelated to patient, or empty state needed, handle here */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
