'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

import { PasswordStrengthBar, isPasswordStrong } from '@/components/ui/PasswordStrengthBar';

import { UserRole } from '@/types';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PATIENT);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const passwordValid = isPasswordStrong(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      setError('La contraseña no cumple con los requisitos de seguridad.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role
      });
      setRegistered(true);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { detail?: string } } };
      const errorMessage = apiError.response?.data?.detail || 'El registro falló. Por favor, inténtalo de nuevo.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border border-[var(--border-light)] text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">¡Revisa tu correo!</h1>
          <p className="text-slate-600">
            Hemos enviado un enlace de verificación a <span className="font-medium">{email}</span>.
            Haz clic en el enlace para activar tu cuenta.
          </p>
          <p className="text-slate-400 text-xs">
            Si no encuentras el correo, revisa tu carpeta de spam.
          </p>
          <div className="space-y-3 pt-2">
            <ResendButton email={email} />
            <a href="/auth/login">
              <Button variant="outline" className="w-full">Ir al inicio de sesión</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

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
              required
            />
            <PasswordStrengthBar password={password} />
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

          <Button type="submit" className="w-full" disabled={loading || !passwordValid}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </Button>
        </form>
        <p className="text-center text-sm">
          ¿Ya tienes una cuenta? <a href="/auth/login" className="text-emerald-800 hover:underline font-medium">Iniciar Sesión</a>
        </p>
      </div>
    </div>
  );
}

/** Small inline component for resending verification */
function ResendButton({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setSent(true);
    } catch {
      // Silent fail — endpoint always returns 200
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return <p className="text-emerald-700 text-sm">Enlace de verificación reenviado.</p>;
  }

  return (
    <Button variant="ghost" className="w-full text-emerald-800" onClick={handleResend} disabled={loading}>
      {loading ? 'Reenviando...' : 'Reenviar correo de verificación'}
    </Button>
  );
}
