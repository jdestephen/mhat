'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClinicalOrderForm, OrderFormData, EMPTY_ORDER } from './ClinicalOrderForm';
import { useCreateStandaloneOrder } from '@/hooks/mutations/useCreateStandaloneOrder';
import { ClipboardList } from 'lucide-react';

interface ClinicalOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName?: string;
}

export function ClinicalOrderModal({
  open,
  onOpenChange,
  patientId,
  patientName,
}: ClinicalOrderModalProps) {
  const [orders, setOrders] = useState<OrderFormData[]>([{ ...EMPTY_ORDER }]);
  const [error, setError] = useState<string | null>(null);
  const createOrder = useCreateStandaloneOrder();

  const handleSubmit = async () => {
    setError(null);

    const validOrders = orders.filter(
      (o) => o.items.length > 0 && o.description.trim(),
    );

    if (validOrders.length === 0) {
      setError('Selecciona al menos un ítem y agrega un motivo.');
      return;
    }

    try {
      for (const order of validOrders) {
        await createOrder.mutateAsync({
          patientId,
          order_type: order.order_type,
          items: order.items,
          description: order.description,
          urgency: order.urgency,
          reason: order.reason || undefined,
          referral_to: order.referral_to || undefined,
        });
      }

      setOrders([{ ...EMPTY_ORDER }]);
      setError(null);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Error al crear orden clínica';
      setError(message);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setOrders([{ ...EMPTY_ORDER }]);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader onOpenChange={handleClose}>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              Nueva Orden Clínica
            </span>
          </DialogTitle>
          {patientName && (
            <p className="text-sm text-slate-500 mt-1">
              Paciente: <span className="font-medium text-slate-700">{patientName}</span>
            </p>
          )}
        </DialogHeader>

        <div className="mt-4">
          <ClinicalOrderForm
            orders={orders}
            onChange={setOrders}
            collapsible={false}
            defaultOpen={true}
            standalone={true}
          />
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createOrder.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {createOrder.isPending ? 'Guardando...' : 'Guardar Orden'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
