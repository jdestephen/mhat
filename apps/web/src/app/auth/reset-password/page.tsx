'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { PasswordStrengthBar, isPasswordStrong } from '@/components/ui/PasswordStrengthBar';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-8 text-center text-slate-500">Cargando...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      setError('La contraseña no cumple con los requisitos de seguridad.');
      return;
    }

    if (!token) {
      setError('Token de restablecimiento no encontrado.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { detail?: string } } };
      setError(
        apiError.response?.data?.detail || 'Error al restablecer la contraseña. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border border-[var(--border-light)] text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Enlace inválido</h1>
          <p className="text-slate-600">Este enlace de restablecimiento no es válido.</p>
          <a href="/auth/forgot-password">
            <Button className="w-full mt-4">Solicitar nuevo enlace</Button>
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border border-[var(--border-light)] text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">¡Contraseña restablecida!</h1>
          <p className="text-slate-600">
            Tu contraseña ha sido actualizada exitosamente. Serás redirigido al inicio de sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border border-[var(--border-light)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Nueva Contraseña</h1>
          <p className="text-slate-500 text-sm mt-2">
            Ingresa tu nueva contraseña.
          </p>
        </div>

        {error && <p className="text-red-500 text-center text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nueva Contraseña</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <PasswordStrengthBar password={newPassword} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirmar Contraseña</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-red-500 text-xs mt-1">Las contraseñas no coinciden.</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading || !isPasswordStrong(newPassword)}>
            {loading ? 'Guardando...' : 'Restablecer Contraseña'}
          </Button>
        </form>
      </div>
    </div>
  );
}
