'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentUpload } from '@/components/ui/DocumentUpload';
import api from '@/lib/api';

import { PasswordStrengthBar, isPasswordStrong } from '@/components/ui/PasswordStrengthBar';
import { useAuthConfig } from '@/hooks/queries/useAuthConfig';

import { UserRole } from '@/types';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PATIENT);

  // Doctor-specific fields
  const [collegeNumber, setCollegeNumber] = useState('');
  const [verificationPhone, setVerificationPhone] = useState('');
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [collegeFile, setCollegeFile] = useState<File | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  // OCR auto-fill state
  const [ocrSuggestions, setOcrSuggestions] = useState<{
    dni?: string;
    college_number?: string;
  }>({});
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const { data: authConfig } = useAuthConfig();
  const devMode = authConfig?.dev_mode ?? false;

  const isDoctor = role === UserRole.DOCTOR;
  const passwordValid = isPasswordStrong(password, devMode);

  const collegeNumberValid =
    !isDoctor || (collegeNumber.trim().length >= 5 && collegeNumber.trim().length <= 15);
  const phoneValid = !isDoctor || verificationPhone.trim().length > 0;

  const formValid =
    passwordValid && (!isDoctor || (collegeNumberValid && phoneValid));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      setError('Por favor completa todos los campos requeridos correctamente.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Step 1: Register user
      const registerRes = await api.post('/auth/register', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
        ...(isDoctor && {
          college_number: collegeNumber.trim(),
          verification_phone: verificationPhone.trim(),
        }),
      });

      // Step 2: If doctor has documents, upload them
      if (isDoctor && (identityFile || collegeFile)) {
        try {
          // Login to get token for document upload
          const loginRes = await api.post('/auth/login', new URLSearchParams({
            username: email,
            password: password,
          }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });

          const token = loginRes.data.access_token;
          setUploadingDocs(true);

          const formData = new FormData();
          if (identityFile) formData.append('identity_document', identityFile);
          if (collegeFile) formData.append('college_document', collegeFile);

          const ocrRes = await api.post('/auth/doctor/upload-documents', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            },
          });

          if (ocrRes.data.auto_filled) {
            setOcrSuggestions(ocrRes.data.auto_filled);
          }
        } catch (uploadErr) {
          // Document upload is non-blocking — registration still succeeds
          console.error('Document upload failed:', uploadErr);
        } finally {
          setUploadingDocs(false);
        }
      }

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
          <h1 className="text-2xl font-bold text-slate-800">
            {devMode ? '¡Registro exitoso!' : '¡Revisa tu correo!'}
          </h1>
          {devMode ? (
            <p className="text-slate-600">
              Tu cuenta ha sido creada y activada automáticamente.
              Ya puedes iniciar sesión.
            </p>
          ) : (
            <p className="text-slate-600">
              Hemos enviado un enlace de verificación a <span className="font-medium">{email}</span>.
              Haz clic en el enlace para activar tu cuenta.
            </p>
          )}
          {isDoctor && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                <p className="text-amber-800 text-sm font-medium">⏳ Aprobación pendiente</p>
                <p className="text-amber-700 text-xs mt-1">
                  Después de verificar tu correo, un administrador revisará tu información
                  y recibirás una notificación cuando tu cuenta sea aprobada.
                </p>
              </div>
              {(identityFile || collegeFile) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-left">
                  <p className="text-emerald-800 text-sm font-medium">📄 Documentos recibidos</p>
                  <p className="text-emerald-700 text-xs mt-1">
                    Tus documentos de verificación han sido procesados y estarán disponibles
                    para el administrador durante la revisión.
                  </p>
                  {Object.keys(ocrSuggestions).length > 0 && (
                    <div className="mt-2 text-xs text-emerald-600">
                      <p className="font-medium">Datos extraídos automáticamente:</p>
                      {ocrSuggestions.dni && <p>• DNI: {ocrSuggestions.dni}</p>}
                      {ocrSuggestions.college_number && <p>• Colegiación: {ocrSuggestions.college_number}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {!devMode && (
            <p className="text-slate-400 text-xs">
              Si no encuentras el correo, revisa tu carpeta de spam.
            </p>
          )}
          <div className="space-y-3 pt-2">
            {!devMode && <ResendButton email={email} />}
            <a href="/auth/login">
              <Button variant="outline" className="w-full">Ir al inicio de sesión</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center py-6 px-4">
      <div className={`w-full p-6 sm:p-8 space-y-6 bg-white rounded-lg shadow-md border border-[var(--border-light)] transition-all duration-300 ${isDoctor ? 'max-w-3xl' : 'max-w-md'}`}>
        <h1 className="text-2xl font-bold text-center text-slate-800">Crear Cuenta</h1>

        {/* Role toggle — first thing the user selects */}
        <div className="flex justify-center">
          <div className="inline-flex bg-slate-100 rounded-full p-1 gap-1">
            <button
              type="button"
              onClick={() => setRole(UserRole.PATIENT)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                role === UserRole.PATIENT
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Paciente
            </button>
            <button
              type="button"
              onClick={() => setRole(UserRole.DOCTOR)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                role === UserRole.DOCTOR
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Médico
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-center text-sm">{error}</p>}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className={`${isDoctor ? 'grid md:grid-cols-2 gap-6' : ''}`}>
            {/* Column 1: All text fields */}
            <div className="space-y-4">
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
                <PasswordStrengthBar password={password} relaxed={devMode} />
              </div>

              {/* Doctor text fields — same column */}
              {isDoctor && (
                <>
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-500 mb-3">
                      Datos necesarios para verificar tu identidad como médico.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Número de Colegiación <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={collegeNumber}
                          onChange={(e) => setCollegeNumber(e.target.value)}
                          placeholder="Ej: 12345"
                          maxLength={15}
                        />
                        {collegeNumber.trim().length > 0 && !collegeNumberValid && (
                          <p className="text-red-500 text-xs mt-1">
                            Debe tener entre 5 y 15 caracteres.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Teléfono de Contacto <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="tel"
                          value={verificationPhone}
                          onChange={(e) => setVerificationPhone(e.target.value)}
                          placeholder="Ej: +504 9999-9999"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Un administrador podrá contactarte para verificar tu información.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Column 2: Document uploads only (doctor) */}
            {isDoctor && (
              <div className="space-y-4 md:border-l md:pl-6 border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    Documentos de Verificación
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    Sube fotos de tu documento de identidad y constancia de colegiación.
                    Los datos se extraerán automáticamente si no los ingresaste manualmente.
                  </p>
                </div>
                <DocumentUpload
                  label="Documento de Identidad (DNI/DPI)"
                  description="Foto clara del frente de tu documento de identidad"
                  selectedFile={identityFile}
                  onFileSelect={setIdentityFile}
                />
                <DocumentUpload
                  label="Constancia de Colegiación"
                  description="Foto o escaneo de tu constancia o carné de colegiación"
                  selectedFile={collegeFile}
                  onFileSelect={setCollegeFile}
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || uploadingDocs || !formValid}
          >
            {uploadingDocs
              ? 'Procesando documentos...'
              : loading
                ? 'Registrando...'
                : 'Registrarse'}
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
