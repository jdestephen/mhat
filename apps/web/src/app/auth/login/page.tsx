'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [isPendingDoctor, setIsPendingDoctor] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowResend(false);
    setIsPendingDoctor(false);

    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const apiError = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = apiError.response?.status;
      const detail = apiError.response?.data?.detail;

      if (status === 403 && detail?.includes('verificar')) {
        setError(detail);
        setShowResend(true);
      } else if (status === 403 && detail?.includes('pendiente de aprobación')) {
        setError(detail);
        setIsPendingDoctor(true);
      } else if (status === 403 && detail?.includes('rechazada')) {
        setError(detail);
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
      toast.success('Enlace de verificación reenviado. Revisa tu correo.');
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border border-[var(--border-light)]">
        <h1 className="text-2xl font-bold text-center text-slate-800">Iniciar Sesión en Numa</h1>
        {error && (
          <div className="text-center">
            {isPendingDoctor ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                <p className="text-amber-800 text-sm font-medium">⏳ Cuenta pendiente de aprobación</p>
                <p className="text-amber-700 text-xs mt-1">
                  Tu solicitud de cuenta de médico está siendo revisada. Recibirás un correo
                  cuando sea aprobada.
                </p>
              </div>
            ) : (
              <>
                <p className="text-red-500 text-sm">{error}</p>
                {showResend && (
                  <Button
                    variant="link"
                    onClick={handleResend}
                    className="text-sm mt-1"
                  >
                    Reenviar correo de verificación
                  </Button>
                )}
              </>
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
