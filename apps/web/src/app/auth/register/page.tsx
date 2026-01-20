'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

import { UserRole } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PATIENT);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role
      });
      // Auto login or redirect to login
      router.push('/auth/login');
    } catch (err: any) {
      setError('Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border border-[var(--border-light)]">
        <h1 className="text-2xl font-bold text-center text-slate-800">Create Account</h1>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value={UserRole.PATIENT} 
                  checked={role === UserRole.PATIENT}
                  onChange={() => setRole(UserRole.PATIENT)}
                  className="w-4 h-4 text-emerald-800 focus:ring-emerald-500"
                />
                <span className="text-sm">Patient</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value={UserRole.DOCTOR} 
                  checked={role === UserRole.DOCTOR}
                  onChange={() => setRole(UserRole.DOCTOR)}
                   className="w-4 h-4 text-emerald-800 focus:ring-emerald-500"
                />
                <span className="text-sm">Doctor</span>
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full">Sign Up</Button>
        </form>
        <p className="text-center text-sm">
          Already have an account? <a href="/auth/login" className="text-emerald-800 hover:underline font-medium">Login</a>
        </p>
      </div>
    </div>
  );
}
