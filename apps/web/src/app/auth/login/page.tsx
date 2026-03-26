'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowResend(false);

    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      localStorage.setItem('token', response.data.access_token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const apiError = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = apiError.response?.status;
      const detail = apiError.response?.data?.detail;

      if (status === 403 && detail?.includes('verificar')) {
        setError(detail);
        setShowResend(true);
      } else {
        setError(detail || 'Credenciales inválidas');
      }
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-verification', { email });
      setError('');
      setShowResend(false);
      alert('Enlace de verificación reenviado. Revisa tu correo.');
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border border-[var(--border-light)]">
        <h1 className="text-2xl font-bold text-center text-slate-800">Iniciar Sesión en MHAT</h1>
        {error && (
          <div className="text-center">
            <p className="text-red-500">{error}</p>
            {showResend && (
              <button
                onClick={handleResend}
                className="text-emerald-800 hover:underline text-sm font-medium mt-1"
              >
                Reenviar correo de verificación
              </button>
            )}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <Button type="submit" className="w-full">Iniciar Sesión</Button>
        </form>
        <div className="text-center space-y-2">
          <p className="text-sm">
            <a href="/auth/forgot-password" className="text-emerald-800 hover:underline font-medium">
              ¿Olvidaste tu contraseña?
            </a>
          </p>
          <p className="text-sm">
            ¿No tienes una cuenta? <a href="/auth/register" className="text-emerald-800 hover:underline font-medium">Regístrate</a>
          </p>
        </div>
      </div>
    </div>
  );
}
