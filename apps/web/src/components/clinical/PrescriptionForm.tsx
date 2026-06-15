'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { InputWithVoice } from '@/components/ui/input-with-voice';
import { Combobox } from '@/components/ui/Combobox';
import {
  DOSAGE_QUANTITIES,
  DOSAGE_UNITS,
  FREQUENCY_OPTIONS,
  ROUTE_OPTIONS,
  DURATION_QUANTITIES,
  DURATION_UNITS,
} from '@/lib/prescriptionOptions';
import { Pill, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

export interface PrescriptionFormData {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: string;
  instructions: string;
}

export const EMPTY_PRESCRIPTION: PrescriptionFormData = {
  medication_name: '',
  dosage: '',
  frequency: '',
  duration: '',
  route: '',
  quantity: '',
  instructions: '',
};

interface PrescriptionFormProps {
  prescriptions: PrescriptionFormData[];
  onChange: (prescriptions: PrescriptionFormData[]) => void;
  /** Whether to show as a collapsible accordion (default: true) */
  collapsible?: boolean;
  /** Initial open state when collapsible (default: false) */
  defaultOpen?: boolean;
}

export function PrescriptionForm({
  prescriptions,
  onChange,
  collapsible = true,
  defaultOpen = false,
}: PrescriptionFormProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const addPrescription = () => {
    onChange([...prescriptions, { ...EMPTY_PRESCRIPTION }]);
    if (!isOpen) setIsOpen(true);
  };

  const removePrescription = (idx: number) => {
    onChange(prescriptions.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, field: keyof PrescriptionFormData, value: string) => {
    const updated = [...prescriptions];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const content = (
    <div className="space-y-4">
      {prescriptions.map((rx, idx) => (
        <div key={idx} className="p-4 bg-gray-50 rounded-lg relative">
          <Button
            type="button"
            variant="danger-ghost"
            size="icon"
            onClick={() => removePrescription(idx)}
            className="absolute top-2 right-2 h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Medicamento</label>
              <InputWithVoice
                value={rx.medication_name}
                onChange={(e) => updateField(idx, 'medication_name', e.target.value)}
                placeholder="Nombre del medicamento"
                language="es-ES"
                mode="append"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium mb-1">Dosis</label>
              <div className="flex gap-2">
                <Combobox
                  options={DOSAGE_QUANTITIES.map((q) => ({ value: q, label: q }))}
                  value={rx.dosage.split(' ')[0] || ''}
                  onValueChange={(val) => {
                    const unit = rx.dosage.split(' ').slice(1).join(' ') || '';
                    updateField(idx, 'dosage', unit ? `${val} ${unit}` : String(val));
                  }}
                  placeholder="Cant."
                  searchPlaceholder="Buscar..."
                  searchable
                  creatable
                  className="w-[45%]"
                />
                <Combobox
                  options={DOSAGE_UNITS}
                  value={rx.dosage.split(' ').slice(1).join(' ') || ''}
                  onValueChange={(val) => {
                    const qty = rx.dosage.split(' ')[0] || '';
                    updateField(idx, 'dosage', qty ? `${qty} ${val}` : String(val));
                  }}
                  placeholder="Unidad"
                  searchPlaceholder="Buscar unidad..."
                  searchable
                  creatable
                  className="w-[55%]"
                />
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium mb-1">Frecuencia</label>
              <Combobox
                groups={FREQUENCY_OPTIONS.map((g) => ({
                  group: g.group,
                  options: g.options.map((o) => ({ value: o.value, label: o.label })),
                }))}
                value={rx.frequency}
                onValueChange={(val) => updateField(idx, 'frequency', String(val))}
                placeholder="Seleccionar frecuencia..."
                searchPlaceholder="Buscar frecuencia..."
                searchable
                creatable
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium mb-1">Vía</label>
              <Combobox
                options={ROUTE_OPTIONS}
                value={rx.route}
                onValueChange={(val) => updateField(idx, 'route', String(val))}
                placeholder="Seleccionar vía..."
                searchPlaceholder="Buscar vía..."
                searchable
                creatable
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium mb-1">Duración</label>
              <div className="flex gap-2">
                <Combobox
                  options={DURATION_QUANTITIES.map((q) => ({ value: q, label: q }))}
                  value={rx.duration.split(' ')[0] || ''}
                  onValueChange={(val) => {
                    const unit = rx.duration.split(' ').slice(1).join(' ') || '';
                    updateField(idx, 'duration', unit ? `${val} ${unit}` : String(val));
                  }}
                  placeholder="Cant."
                  searchPlaceholder="Buscar..."
                  searchable
                  creatable
                  className="w-[40%]"
                />
                <Combobox
                  options={DURATION_UNITS}
                  value={rx.duration.split(' ').slice(1).join(' ') || ''}
                  onValueChange={(val) => {
                    const qty = rx.duration.split(' ')[0] || '';
                    updateField(idx, 'duration', qty ? `${qty} ${val}` : String(val));
                  }}
                  placeholder="Unidad"
                  searchPlaceholder="Buscar..."
                  searchable
                  creatable
                  className="w-[60%]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Cantidad</label>
              <InputWithVoice
                value={rx.quantity}
                onChange={(e) => updateField(idx, 'quantity', e.target.value)}
                placeholder="ej. 21 tabletas"
                language="es-ES"
                mode="append"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Instrucciones</label>
              <InputWithVoice
                value={rx.instructions}
                onChange={(e) => updateField(idx, 'instructions', e.target.value)}
                placeholder="Instrucciones adicionales"
                language="es-ES"
                mode="append"
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addPrescription} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Agregar Receta
      </Button>
    </div>
  );

  if (!collapsible) {
    return content;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 h-auto"
      >
        <div className="flex items-center gap-3">
          <Pill className="h-5 w-5 text-emerald-600" />
          <span className="font-medium">Recetas ({prescriptions.length})</span>
        </div>
        {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="p-4 border-t border-gray-100">
          {content}
        </div>
      )}
    </div>
  );
}
