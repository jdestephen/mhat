'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VitalSignsForm, VitalSignsFormData } from '@/components/clinical/VitalSignsForm';
import { Activity } from 'lucide-react';

interface VitalSignsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName?: string;
}

export function VitalSignsModal({ open, onOpenChange, patientId, patientName }: VitalSignsModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<VitalSignsFormData>({});
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: VitalSignsFormData) => {
      const res = await api.post(`/doctor/patients/${patientId}/vital-signs`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-vital-signs', patientId] });
      setFormData({});
      setError(null);
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail || 'Error al guardar signos vitales';
      setError(message);
    },
  });

  const handleSubmit = () => {
    // Check at least one vital sign is filled
    const hasData = Object.entries(formData).some(
      ([key, val]) => key !== 'measured_at' && key !== 'notes' && val !== undefined && val !== '',
    );
    if (!hasData) {
      setError('Debe completar al menos un signo vital');
      return;
    }
    setError(null);
    createMutation.mutate(formData);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setFormData({});
      setError(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader onOpenChange={handleClose}>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              Signos Vitales {patientName ? `— ${patientName}` : ''}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <VitalSignsForm data={formData} onChange={setFormData} />

          {error && (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          )}

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
