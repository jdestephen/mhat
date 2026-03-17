'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { VitalSignsForm, VitalSignsFormData } from '@/components/clinical/VitalSignsForm';
import { VitalSigns } from '@/types';
import { getVitalColor, getBpColor } from '@/lib/vitalSignsRanges';
import {
  HeartPulse,
  Plus,
  X,
  Calendar,
  Heart,
  Thermometer,
  Droplets,
  Activity,
} from 'lucide-react';

export default function VitalSignsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<VitalSignsFormData>({});

  const { data: vitalSigns, isLoading } = useQuery<VitalSigns[]>({
    queryKey: ['vital-signs'],
    queryFn: async () => {
      const res = await api.get('/hx/vital-signs');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: VitalSignsFormData) => {
      const res = await api.post('/hx/vital-signs', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vital-signs'] });
      setShowForm(false);
      setFormData({});
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Must have at least one measurement
    const hasValues = Object.entries(formData).some(
      ([key, val]) => key !== 'notes' && key !== 'measured_at' && val !== undefined && val !== ''
    );
    if (!hasValues) return;
    createMutation.mutate(formData);
  };

  const formatValue = (val: number | undefined, unit: string, decimals = 0) => {
    if (val === undefined || val === null) return '—';
    return `${decimals > 0 ? val.toFixed(decimals) : val} ${unit}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-rose-50 rounded-full flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-rose-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Signos Vitales</h1>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Registro
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Nuevo Registro de Signos Vitales</h2>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({});
              }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <VitalSignsForm data={formData} onChange={setFormData} />

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setFormData({});
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-center py-10 text-slate-500">Cargando registros...</div>
      ) : !vitalSigns || vitalSigns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-300">
          <HeartPulse className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 mb-2">No tienes registros de signos vitales.</p>
          <Button variant="outline" onClick={() => setShowForm(true)}>
            Registra tus signos vitales
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {vitalSigns.map((vs) => (
            <div
              key={vs.id}
              className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 hover:border-slate-300 transition-colors"
            >
              {/* Header: Date */}
              <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
                <Calendar className="h-4 w-4" />
                {new Date(vs.measured_at).toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>

              {/* Values Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {vs.heart_rate !== undefined && vs.heart_rate !== null && (
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-400">FC</div>
                      <div className={`text-sm font-semibold ${getVitalColor('heart_rate', vs.heart_rate)}`}>{formatValue(vs.heart_rate, 'lpm')}</div>
                    </div>
                  </div>
                )}
                {vs.systolic_bp !== undefined && vs.systolic_bp !== null && (
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-400">PA</div>
                      <div className={`text-sm font-semibold ${getBpColor(vs.systolic_bp, vs.diastolic_bp)}`}>
                        {vs.systolic_bp}/{vs.diastolic_bp ?? '—'} mmHg
                      </div>
                    </div>
                  </div>
                )}
                {vs.temperature !== undefined && vs.temperature !== null && (
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-orange-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-400">Temp</div>
                      <div className={`text-sm font-semibold ${getVitalColor('temperature', vs.temperature)}`}>{formatValue(vs.temperature, '°C', 1)}</div>
                    </div>
                  </div>
                )}
                {vs.oxygen_saturation !== undefined && vs.oxygen_saturation !== null && (
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-sky-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-400">SpO₂</div>
                      <div className={`text-sm font-semibold ${getVitalColor('oxygen_saturation', vs.oxygen_saturation)}`}>{formatValue(vs.oxygen_saturation, '%')}</div>
                    </div>
                  </div>
                )}
                {vs.blood_glucose !== undefined && vs.blood_glucose !== null && (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-rose-500">GL</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Glicemia</div>
                      <div className={`text-sm font-semibold ${getVitalColor('blood_glucose', vs.blood_glucose)}`}>{formatValue(vs.blood_glucose, 'mg/dL', 1)}</div>
                    </div>
                  </div>
                )}
                {vs.weight !== undefined && vs.weight !== null && (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-purple-500">KG</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Peso</div>
                      <div className="text-sm font-semibold text-slate-800">{formatValue(vs.weight, 'kg', 1)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {vs.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-sm text-slate-600">{vs.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
