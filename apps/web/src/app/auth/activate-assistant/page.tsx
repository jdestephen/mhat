'use client';

import { Suspense, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { CheckCircle2, CircleAlert, Stethoscope } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

type AccountStatus = 'new' | 'existing_assistant' | 'conflict';

interface InvitationPreview {
  assistant_name: string;
  email: string;
  doctor_name: string;
  health_center_name: string;
  account_status: AccountStatus;
}

type PageState = 'loading' | 'ready' | 'error' | 'success';

function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

export default function ActivateAssistantPage() {
  return (
    <Suspense fallback={<ActivationShell><LoadingState /></ActivationShell>}>
      <ActivateAssistantContent />
    </Suspense>
  );
}

function ActivationShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-800 text-white">
            <Stethoscope aria-hidden="true" className="h-7 w-7" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">Numa</p>
          <p className="mt-1 text-sm text-slate-500">Historial Médico</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="py-8 text-center" role="status">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
      <p className="text-sm text-slate-600">Cargando invitación...</p>
    </div>
  );
}

function ActivateAssistantContent() {
  const token = useSearchParams().get('token')?.trim() ?? '';
  const [state, setState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('El enlace de invitación no contiene un token válido. Solicita uno nuevo al médico que te invitó.');
      setState('error');
      return;
    }

    let active = true;
    const loadInvitation = async () => {
      try {
        const response = await api.post<InvitationPreview>('/auth/assistant-invitation/preview', { token });
        if (active) {
          setInvitation(response.data);
          setState('ready');
        }
      } catch (requestError: unknown) {
        if (active) {
          setError(apiErrorMessage(requestError, 'No pudimos cargar esta invitación. Inténtalo de nuevo más tarde.'));
          setState('error');
        }
      }
    };

    void loadInvitation();
    return () => { active = false; };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invitation || isSubmitting) return;

    setError('');
    if (invitation.account_status === 'new') {
      if (password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/activate-assistant', {
        token,
        ...(invitation.account_status === 'new' ? { password } : {}),
      });
      setState('success');
    } catch (requestError: unknown) {
      setError(apiErrorMessage(requestError, 'No pudimos activar la invitación. Inténtalo de nuevo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('numa_active_mode');
    localStorage.removeItem('numa_active_profile_id');
    window.location.assign('/auth/login');
  };

  return (
    <ActivationShell>
      {state === 'loading' && <LoadingState />}

      {state === 'error' && (
        <div className="space-y-5 text-center">
          <CircleAlert aria-hidden="true" className="mx-auto h-12 w-12 text-amber-600" />
          <h1 className="text-xl font-semibold text-slate-900">No se puede abrir la invitación</h1>
          <p className="text-sm leading-6 text-slate-600" role="alert">{error}</p>
          <Link href="/auth/login" className="inline-block text-sm font-medium text-emerald-800 hover:underline">
            Ir al inicio de sesión
          </Link>
        </div>
      )}

      {state === 'success' && (
        <div className="space-y-5 text-center">
          <CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12 text-emerald-700" />
          <h1 className="text-xl font-semibold text-slate-900">¡Invitación aceptada!</h1>
          <p className="text-sm leading-6 text-slate-600" role="status">
            {invitation?.account_status === 'new'
              ? 'Tu cuenta de asistente está lista. Ya puedes iniciar sesión en Numa.'
              : 'Ya tienes acceso a esta asignación. Inicia sesión con la cuenta que recibió la invitación.'}
          </p>
          <Button type="button" onClick={handleContinue} className="w-full">Ir a inicio de sesión</Button>
          <p className="text-xs text-slate-500">Se cerrará cualquier otra sesión abierta en este navegador.</p>
        </div>
      )}

      {state === 'ready' && invitation && (
        <div>
          <h1 className="text-center text-xl font-semibold text-slate-900">
            Invitación para asistente
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            Hola, {invitation.assistant_name}. Revisa los detalles antes de aceptar.
          </p>

          <div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-slate-700">
            <p><span className="font-medium text-slate-900">Médico:</span> {invitation.doctor_name}</p>
            <p className="mt-2"><span className="font-medium text-slate-900">Centro de salud:</span> {invitation.health_center_name}</p>
            <p className="mt-2 break-all"><span className="font-medium text-slate-900">Cuenta:</span> {invitation.email}</p>
          </div>

          {invitation.account_status === 'conflict' ? (
            <div className="mt-6 space-y-4 text-center">
              <p className="text-sm text-amber-800" role="alert">
                Este correo ya pertenece a una cuenta de otro tipo. Contacta al administrador para resolver la invitación.
              </p>
              <Link href="/auth/login" className="text-sm font-medium text-emerald-800 hover:underline">
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {invitation.account_status === 'new' ? (
                <>
                  <p className="text-sm text-slate-600">Crea una contraseña para tu nueva cuenta de asistente.</p>
                  <div>
                    <label htmlFor="assistant-password" className="mb-1 block text-sm font-medium text-slate-800">Contraseña</label>
                    <Input
                      id="assistant-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">Al menos 8 caracteres.</p>
                  </div>
                  <div>
                    <label htmlFor="assistant-confirm-password" className="mb-1 block text-sm font-medium text-slate-800">Confirmar contraseña</label>
                    <Input
                      id="assistant-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm leading-6 text-slate-600">
                  Ya tienes una cuenta de asistente. Acepta la invitación para añadir esta asignación a tu cuenta.
                </p>
              )}

              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Procesando...' : invitation.account_status === 'new' ? 'Crear cuenta y aceptar' : 'Aceptar invitación'}
              </Button>
              <p className="text-center text-xs text-slate-500">Esta invitación vence 48 horas después de enviarse.</p>
            </form>
          )}
        </div>
      )}
    </ActivationShell>
  );
}
