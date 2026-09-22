'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { OrderType, OrderUrgency, OrderItem } from '@/types';
import { useOrderOptions } from '@/hooks/queries/useOrderOptions';
import { OrderPillSelector } from './OrderPillSelector';

export interface OrderFormData {
  order_type: OrderType;
  items: OrderItem[];
  description: string;
  urgency: OrderUrgency;
  reason: string;
  referral_to: string;
}

export const EMPTY_ORDER: OrderFormData = {
  order_type: OrderType.LAB,
  items: [],
  description: '',
  urgency: OrderUrgency.ROUTINE,
  reason: '',
  referral_to: '',
};

const ORDER_TYPE_CONFIG: Record<OrderType, { label: string; accent: string }> = {
  [OrderType.LAB]: { label: 'Laboratorio', accent: 'purple' },
  [OrderType.IMAGING]: { label: 'Imagen', accent: 'blue' },
  [OrderType.REFERRAL]: { label: 'Referencia', accent: 'amber' },
  [OrderType.PROCEDURE]: { label: 'Procedimiento', accent: 'gray' },
};

const URGENCY_OPTIONS = [
  { value: OrderUrgency.ROUTINE, label: 'Rutina' },
  { value: OrderUrgency.URGENT, label: 'Urgente' },
  { value: OrderUrgency.STAT, label: 'STAT' },
];

interface ClinicalOrderFormProps {
  orders: OrderFormData[];
  onChange: (orders: OrderFormData[]) => void;
  /** Whether to show as a collapsible accordion (default: true) */
  collapsible?: boolean;
  /** Initial open state when collapsible (default: false) */
  defaultOpen?: boolean;
  /** When true, description becomes required (motive for standalone orders) */
  standalone?: boolean;
}

export function ClinicalOrderForm({
  orders,
  onChange,
  collapsible = true,
  defaultOpen = false,
  standalone = false,
}: ClinicalOrderFormProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || orders.length > 0);
  const { data: allOptions } = useOrderOptions();

  const addOrder = () => {
    onChange([...orders, { ...EMPTY_ORDER }]);
    if (!isOpen) setIsOpen(true);
  };

  const removeOrder = (idx: number) => {
    onChange(orders.filter((_, i) => i !== idx));
  };

  const updateOrder = (idx: number, updates: Partial<OrderFormData>) => {
    onChange(orders.map((o, i) => (i === idx ? { ...o, ...updates } : o)));
  };

  const header = (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => collapsible && setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
      >
        {collapsible && (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
        <ClipboardList className="h-4 w-4 text-emerald-600" />
        Órdenes Clínicas
        {orders.length > 0 && (
          <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
            {orders.length}
          </span>
        )}
      </button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addOrder}
        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
      >
        <Plus className="h-4 w-4 mr-1" />
        Agregar
      </Button>
    </div>
  );

  if (collapsible && !isOpen) {
    return <div className="py-2">{header}</div>;
  }

  return (
    <div className="space-y-4">
      {header}

      {orders.map((order, idx) => {
        const config = ORDER_TYPE_CONFIG[order.order_type];
        const typeOptions = allOptions?.[order.order_type];

        return (
          <div
            key={idx}
            className="border border-slate-200 rounded-xl p-4 space-y-4 bg-white shadow-sm"
          >
            {/* Header: Type tabs + Remove */}
            <div className="flex items-center justify-between">
              {/* Type tabs */}
              <div className="flex gap-1 flex-wrap">
                {Object.entries(ORDER_TYPE_CONFIG).map(([type, cfg]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateOrder(idx, {
                      order_type: type as OrderType,
                      items: [],
                    })}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150
                      ${order.order_type === type
                        ? `bg-${cfg.accent === 'purple' ? 'purple' : cfg.accent === 'blue' ? 'blue' : cfg.accent === 'amber' ? 'amber' : 'slate'}-100 text-${cfg.accent === 'purple' ? 'purple' : cfg.accent === 'blue' ? 'blue' : cfg.accent === 'amber' ? 'amber' : 'slate'}-700 ring-1 ring-${cfg.accent === 'purple' ? 'purple' : cfg.accent === 'blue' ? 'blue' : cfg.accent === 'amber' ? 'amber' : 'slate'}-300 font-semibold`
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }
                    `}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOrder(idx)}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-7 w-7"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Pill selector */}
            {typeOptions && (
              <OrderPillSelector
                groups={typeOptions.groups}
                codeSystem={typeOptions.code_system}
                selectedItems={order.items}
                onSelectionChange={(items) => updateOrder(idx, { items })}
                accentColor={config.accent}
              />
            )}

            {/* Selected items summary */}
            {order.items.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                {order.items.map((item) => (
                  <span
                    key={item.display}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200"
                  >
                    {item.display}
                    <button
                      type="button"
                      onClick={() =>
                        updateOrder(idx, {
                          items: order.items.filter((i) => i.display !== item.display),
                        })
                      }
                      className="ml-0.5 text-emerald-500 hover:text-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Urgency + Description row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Urgency */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Urgencia
                </label>
                <select
                  value={order.urgency}
                  onChange={(e) => updateOrder(idx, { urgency: e.target.value as OrderUrgency })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                >
                  {URGENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description / Motive */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {standalone ? 'Motivo *' : 'Motivo (opcional)'}
                </label>
                <input
                  type="text"
                  value={order.description}
                  onChange={(e) => updateOrder(idx, { description: e.target.value })}
                  placeholder={standalone ? 'Ej: Control anual' : 'Ej: Control anual (opcional)'}
                  required={standalone}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Reason (optional) */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Justificación clínica (opcional)
              </label>
              <input
                type="text"
                value={order.reason}
                onChange={(e) => updateOrder(idx, { reason: e.target.value })}
                placeholder="Ej: Paciente diabético, control periódico"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>

            {/* Referral_to (only for REFERRAL type) */}
            {order.order_type === OrderType.REFERRAL && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Referir a (nombre de especialista/clínica)
                </label>
                <input
                  type="text"
                  value={order.referral_to}
                  onChange={(e) => updateOrder(idx, { referral_to: e.target.value })}
                  placeholder="Ej: Dr. García, Hospital Escuela"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>
            )}
          </div>
        );
      })}

      {orders.length === 0 && isOpen && (
        <div className="text-center py-6 text-sm text-slate-400">
          No hay órdenes clínicas. Haz clic en &quot;Agregar&quot; para crear una.
        </div>
      )}
    </div>
  );
}
