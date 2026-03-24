'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

type VerifyState = 'loading' | 'success' | 'error' | 'expired';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState('');

  const verifyEmail = useCallback(async () => {
    if (!token) {
      setState('error');
      setMessage('No se proporcionó un token de verificación.');
      return;
    }

    try {
      const res = await api.post('/auth/verify-email', { token });
      setState('success');
      setMessage(res.data.message);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      const detail = error.response?.data?.detail || '';

      if (detail.includes('expirado')) {
        setState('expired');
      } else {
        setState('error');
      }
      setMessage(detail || 'Error al verificar el correo electrónico.');
    }
  }, [token]);

  useEffect(() => {
    verifyEmail();
  }, [verifyEmail]);

  const iconMap = {
    loading: (
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700 mx-auto" />
    ),
    success: (
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
    error: (
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    ),
    expired: (
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
  };

  const titleMap = {
    loading: 'Verificando...',
    success: '¡Correo verificado!',
    error: 'Error de verificación',
    expired: 'Enlace expirado',
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border border-[var(--border-light)] text-center">
        {iconMap[state]}
        <h1 className="text-2xl font-bold text-slate-800">{titleMap[state]}</h1>
        <p className="text-slate-600">{message}</p>

        {state === 'success' && (
          <a href="/auth/login">
            <Button className="w-full mt-4">Iniciar Sesión</Button>
          </a>
        )}

        {(state === 'error' || state === 'expired') && (
          <div className="space-y-3 mt-4">
            <a href="/auth/login">
              <Button variant="outline" className="w-full">Volver al inicio de sesión</Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
