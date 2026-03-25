'use client';

import React from 'react';
import { Heart, Thermometer, Wind, Droplets, Weight, Ruler, Activity, CircleDot } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

/**
 * Normal ranges for vital signs (adult).
 * Used for color-coded input indicators.
 */
const VITAL_RANGES = {
  heart_rate: { min: 60, max: 100, unit: 'lpm', criticalLow: 40, criticalHigh: 150 },
  systolic_bp: { min: 90, max: 120, unit: 'mmHg', criticalLow: 70, criticalHigh: 180 },
  diastolic_bp: { min: 60, max: 80, unit: 'mmHg', criticalLow: 40, criticalHigh: 120 },
  temperature: { min: 36.1, max: 37.2, unit: '°C', criticalLow: 35.0, criticalHigh: 39.5 },
  respiratory_rate: { min: 12, max: 20, unit: 'rpm', criticalLow: 8, criticalHigh: 30 },
  oxygen_saturation: { min: 95, max: 100, unit: '%', criticalLow: 90, criticalHigh: 100 },
  blood_glucose: { min: 70, max: 100, unit: 'mg/dL', criticalLow: 54, criticalHigh: 250 },
} as const;

type VitalKey = keyof typeof VITAL_RANGES;

function getRangeStatus(key: VitalKey, value: number | undefined): 'normal' | 'warning' | 'critical' | 'none' {
  if (value === undefined || value === null) return 'none';
  const range = VITAL_RANGES[key];
  if (value <= range.criticalLow || value >= range.criticalHigh) return 'critical';
  if (value < range.min || value > range.max) return 'warning';
  return 'normal';
}

const STATUS_STYLES = {
  none: 'border-slate-300 focus:border-blue-500',
  normal: 'border-emerald-400 bg-emerald-50/30 focus:border-emerald-500',
  warning: 'border-amber-400 bg-amber-50/30 focus:border-amber-500',
  critical: 'border-red-400 bg-red-50/30 focus:border-red-500',
};

export interface VitalSignsFormData {
  heart_rate?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  blood_glucose?: number;
  waist_circumference?: number;
  notes?: string;
  measured_at?: string;
}

interface VitalSignsFormProps {
  data: VitalSignsFormData;
  onChange: (data: VitalSignsFormData) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Hide the date/time picker (e.g. when embedded inside medical record form) */
  hideDateTimePicker?: boolean;
  /** Initial value for DateTimePicker (edit mode) */
  initialMeasuredAt?: string;
}

export function VitalSignsForm({ data, onChange, disabled = false, compact = false, hideDateTimePicker = false, initialMeasuredAt }: VitalSignsFormProps) {
  const updateField = <K extends keyof VitalSignsFormData>(key: K, value: VitalSignsFormData[K]) => {
    onChange({ ...data, [key]: value });
  };

  const parseNumber = (val: string, isFloat = false): number | undefined => {
    if (!val || val === '') return undefined;
    const num = isFloat ? parseFloat(val) : parseInt(val, 10);
    return isNaN(num) ? undefined : num;
  };

  const bmi = data.weight && data.height
    ? (data.weight / ((data.height / 100) ** 2)).toFixed(1)
    : null;

  const inputClass = (key?: VitalKey, value?: number) => {
    const status = key ? getRangeStatus(key, value) : 'none';
    return `w-full px-3 py-2 text-sm rounded-md border ${STATUS_STYLES[status]} outline-none placeholder-gray-300 transition-colors disabled:bg-slate-100 disabled:text-slate-400`;
  };

  return (
    <div className="space-y-4">
      {/* Date/Time Picker */}
      {!hideDateTimePicker && (
        <DateTimePicker
          value={initialMeasuredAt || data.measured_at}
          onChange={(iso) => updateField('measured_at', iso)}
          disabled={disabled}
          liveUpdate={!initialMeasuredAt}
          label="Fecha y Hora de Medición"
        />
      )}
      {/* All vital sign inputs in a single grid — flows as 2-col on mobile, 3-col on sm+ */}
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-3`}>
        {/* Heart Rate */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Heart className="h-3.5 w-3.5 text-red-400" />
            Frecuencia Cardíaca
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.heart_rate ?? ''}
              onChange={(e) => updateField('heart_rate', parseNumber(e.target.value))}
              placeholder="72"
              className={inputClass('heart_rate', data.heart_rate)}
              disabled={disabled}
              min={0}
              max={300}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">lpm</span>
          </div>
        </div>

        {/* Systolic BP */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            Presión Sistólica
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.systolic_bp ?? ''}
              onChange={(e) => updateField('systolic_bp', parseNumber(e.target.value))}
              placeholder="120"
              className={inputClass('systolic_bp', data.systolic_bp)}
              disabled={disabled}
              min={0}
              max={300}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">mmHg</span>
          </div>
        </div>

        {/* Diastolic BP */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Activity className="h-3.5 w-3.5 text-indigo-400" />
            Presión Diastólica
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.diastolic_bp ?? ''}
              onChange={(e) => updateField('diastolic_bp', parseNumber(e.target.value))}
              placeholder="80"
              className={inputClass('diastolic_bp', data.diastolic_bp)}
              disabled={disabled}
              min={0}
              max={200}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">mmHg</span>
          </div>
        </div>

        {/* Temperature */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Thermometer className="h-3.5 w-3.5 text-orange-400" />
            Temperatura
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={data.temperature ?? ''}
              onChange={(e) => updateField('temperature', parseNumber(e.target.value, true))}
              placeholder="36.5"
              className={inputClass('temperature', data.temperature)}
              disabled={disabled}
              min={30}
              max={45}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">°C</span>
          </div>
        </div>

        {/* SpO2 */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Droplets className="h-3.5 w-3.5 text-sky-400" />
            Saturación O₂
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.oxygen_saturation ?? ''}
              onChange={(e) => updateField('oxygen_saturation', parseNumber(e.target.value))}
              placeholder="98"
              className={inputClass('oxygen_saturation', data.oxygen_saturation)}
              disabled={disabled}
              min={0}
              max={100}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
          </div>
        </div>

        {/* Respiratory Rate */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Wind className="h-3.5 w-3.5 text-teal-400" />
            Frec. Respiratoria
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.respiratory_rate ?? ''}
              onChange={(e) => updateField('respiratory_rate', parseNumber(e.target.value))}
              placeholder="16"
              className={inputClass('respiratory_rate', data.respiratory_rate)}
              disabled={disabled}
              min={0}
              max={60}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">rpm</span>
          </div>
        </div>

        {/* Weight */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Weight className="h-3.5 w-3.5 text-purple-400" />
            Peso
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={data.weight ?? ''}
              onChange={(e) => updateField('weight', parseNumber(e.target.value, true))}
              placeholder="70.0"
              className={inputClass()}
              disabled={disabled}
              min={0}
              max={500}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">kg</span>
          </div>
        </div>

        {/* Height */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Ruler className="h-3.5 w-3.5 text-emerald-400" />
            Talla
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={data.height ?? ''}
              onChange={(e) => updateField('height', parseNumber(e.target.value, true))}
              placeholder="170.0"
              className={inputClass()}
              disabled={disabled}
              min={0}
              max={300}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">cm</span>
          </div>
        </div>

        {/* BMI (auto-calculated) */}
        {bmi && (
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
              IMC (calculado)
            </label>
            <div className="px-3 py-2 text-sm rounded-md border border-slate-200 bg-slate-50 text-slate-700 font-medium">
              {bmi} kg/m²
            </div>
          </div>
        )}

        {/* Blood Glucose */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <CircleDot className="h-3.5 w-3.5 text-rose-400" />
            Glicemia
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={data.blood_glucose ?? ''}
              onChange={(e) => updateField('blood_glucose', parseNumber(e.target.value, true))}
              placeholder="90"
              className={inputClass('blood_glucose', data.blood_glucose)}
              disabled={disabled}
              min={0}
              max={600}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">mg/dL</span>
          </div>
        </div>

        {/* Waist Circumference */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Ruler className="h-3.5 w-3.5 text-amber-500" />
            Circ. Abdominal
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={data.waist_circumference ?? ''}
              onChange={(e) => updateField('waist_circumference', parseNumber(e.target.value, true))}
              placeholder="85"
              className={inputClass()}
              disabled={disabled}
              min={0}
              max={300}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">cm</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {!compact && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
          <textarea
            value={data.notes ?? ''}
            onChange={(e) => updateField('notes', e.target.value || undefined)}
            placeholder="Observaciones adicionales..."
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 outline-none focus:border-blue-500 transition-colors resize-none disabled:bg-slate-100"
            rows={2}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
