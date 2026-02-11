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
      const errorMessage = err.response?.data?.detail || 'El registro falló. Por favor, inténtalo de nuevo.';
      setError(errorMessage);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border border-[var(--border-light)]">
        <h1 className="text-2xl font-bold text-center text-slate-800">Crear Cuenta</h1>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellido</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {password.length > 0 && password.length < 8 && (
              <p className="text-red-500 text-xs mt-1">La contraseña debe tener al menos 8 caracteres.</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
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
                <span className="text-sm">Paciente</span>
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
                <span className="text-sm">Médico</span>
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full">Registrarse</Button>
        </form>
        <p className="text-center text-sm">
          ¿Ya tienes una cuenta? <a href="/auth/login" className="text-emerald-800 hover:underline font-medium">Iniciar Sesión</a>
        </p>
      </div>
    </div>
  );
}
