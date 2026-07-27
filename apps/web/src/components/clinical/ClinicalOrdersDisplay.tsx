'use client';

import { ClipboardList } from 'lucide-react';
import { ClinicalOrder, OrderType, OrderUrgency } from '@/types';

const ORDER_TYPE_LABELS: Record<string, string> = {
  [OrderType.LAB]: 'Laboratorio',
  [OrderType.IMAGING]: 'Imagen',
  [OrderType.REFERRAL]: 'Referencia',
  [OrderType.PROCEDURE]: 'Procedimiento',
};

const URGENCY_LABELS: Record<string, string> = {
  [OrderUrgency.ROUTINE]: 'Rutina',
  [OrderUrgency.URGENT]: 'Urgente',
  [OrderUrgency.STAT]: 'STAT',
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  [OrderType.LAB]: 'bg-purple-100 text-purple-700',
  [OrderType.IMAGING]: 'bg-blue-100 text-blue-700',
  [OrderType.REFERRAL]: 'bg-amber-100 text-amber-700',
  [OrderType.PROCEDURE]: 'bg-gray-100 text-gray-700',
};

const URGENCY_BADGE_STYLES: Record<string, string> = {
  [OrderUrgency.ROUTINE]: 'bg-gray-100 text-gray-600',
  [OrderUrgency.URGENT]: 'bg-amber-100 text-amber-700',
  [OrderUrgency.STAT]: 'bg-red-100 text-red-700',
};

interface ClinicalOrdersDisplayProps {
  orders: ClinicalOrder[];
  className?: string;
}

export function ClinicalOrdersDisplay({ orders, className = '' }: ClinicalOrdersDisplayProps) {
  if (!orders || orders.length === 0) return null;

  return (
    <div className={className}>
      <label className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-2">
        <ClipboardList className="w-4 h-4" /> Órdenes Clínicas ({orders.length})
      </label>
      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            {/* Type + Urgency badges */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                  TYPE_BADGE_STYLES[order.order_type] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                  URGENCY_BADGE_STYLES[order.urgency] || 'bg-gray-100 text-gray-600'
                }`}
              >
                {URGENCY_LABELS[order.urgency] || order.urgency}
              </span>
            </div>

            {/* Items as pills */}
            {order.items && order.items.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {order.items.map((item, itemIdx) => (
                  <span
                    key={itemIdx}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-slate-50 text-slate-700 rounded-full border border-slate-200"
                    title={item.code ? `${item.code_system || ''}: ${item.code}` : undefined}
                  >
                    {item.display}
                  </span>
                ))}
              </div>
            ) : order.description ? (
              /* Backward compatibility: show description as content if no items */
              <p className="font-medium text-slate-900 text-sm mb-1">{order.description}</p>
            ) : null}

            {/* Description as motive (when items exist) */}
            {order.items && order.items.length > 0 && order.description && (
              <p className="text-sm text-slate-600 mb-1">
                <span className="font-medium text-slate-500">Motivo:</span> {order.description}
              </p>
            )}

            {/* Reason */}
            {order.reason && (
              <p className="text-sm text-slate-600 mt-1">{order.reason}</p>
            )}

            {/* Referral to */}
            {order.referral_to && (
              <p className="text-xs font-medium text-slate-500 mt-2 bg-slate-50 p-2 rounded">
                Referir a: {order.referral_to}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
