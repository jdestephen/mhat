'use client';

import React, { useState } from 'react';
import { useCreatePatient } from '@/hooks/mutations/useCreatePatient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Check, AlertCircle, Mail } from 'lucide-react';

interface CreatePatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (patientId: string) => void;
}

export function CreatePatientModal({ open, onOpenChange, onSuccess }: CreatePatientModalProps) {
  const createPatient = useCreatePatient();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    sex: '',
    email: '',
    phone: '',
    dni: '',
  });
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    patientId?: string;
    emailSent?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('Nombre y apellido son obligatorios');
      return;
    }
    setError(null);

    try {
      // Clean empty strings to undefined
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        ...(formData.date_of_birth && { date_of_birth: formData.date_of_birth }),
        ...(formData.sex && { sex: formData.sex }),
        ...(formData.email.trim() && { email: formData.email.trim() }),
        ...(formData.phone.trim() && { phone: formData.phone.trim() }),
        ...(formData.dni.trim() && { dni: formData.dni.trim() }),
      };

      const res = await createPatient.mutateAsync(payload);
      setResult({
        success: true,
        message: res.message,
        patientId: res.patient_id,
        emailSent: res.activation_email_sent,
      });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail || 'Error al crear paciente';
      setError(message);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        sex: '',
        email: '',
        phone: '',
        dni: '',
      });
      setResult(null);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const handleGoToPatient = () => {
    if (result?.patientId) {
      onSuccess?.(result.patientId);
    }
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader onOpenChange={handleClose}>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              Crear Paciente
            </span>
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="py-4">
            <div className="rounded-lg p-4 bg-emerald-50 border border-emerald-200">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-emerald-800">{result.message}</p>
                  {result.emailSent && (
                    <p className="text-sm text-emerald-600 mt-1 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      Se envió un correo de activación al paciente
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cerrar
              </Button>
              <Button
                onClick={handleGoToPatient}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Ver Paciente
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-2 space-y-4">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Juan"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Pérez"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                />
              </div>
            </div>

            {/* DOB and Sex */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de nacimiento
                </label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sexo
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  value={formData.sex}
                  onChange={(e) => handleChange('sex', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                </select>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                placeholder="paciente@email.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">
                Si proporcionas un email, se enviará una invitación al paciente para activar su cuenta
              </p>
            </div>

            {/* Phone and DNI */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Teléfono
                </label>
                <Input
                  placeholder="+1 234 567 8900"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cédula / DNI
                </label>
                <Input
                  placeholder="12345678"
                  value={formData.dni}
                  onChange={(e) => handleChange('dni', e.target.value)}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg p-3 bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={createPatient.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createPatient.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {createPatient.isPending ? 'Creando...' : 'Crear Paciente'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
