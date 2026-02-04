'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Clock, User, Pill, Activity, AlertTriangle, FileText } from 'lucide-react';

interface SummaryData {
  patient_info: {
    full_name: string;
    date_of_birth: string;
    age_display: string;
    sex: string;
  };
  active_medications: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
  }>;
  conditions: Array<{
    id: string;
    name: string;
    severity: string;
  }>;
  allergies: Array<{
    id: string;
    allergen: string;
    reaction: string;
    severity: string;
  }>;
  recent_records: Array<{
    id: string;
    motive: string;
    diagnosis: string;
    category: { name: string };
    created_at: string;
    has_documents: boolean;
  }>;
  shared_by: string;
  expires_at: string;
  purpose: string;
  is_expired: boolean;
  access_count: number;
}

export default function SummaryPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get(`/hx/shared/${token}/summary`);
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error al cargar el resumen médico');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (!data || data.is_expired) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(data.expires_at).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expirado');
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col justify-center items-center h-screen px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-800 font-medium mb-2">Enlace no válido</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (data.is_expired) {
    return (
      <div className="flex flex-col justify-center items-center h-screen px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-amber-800 font-medium mb-2">Enlace Expirado</p>
          <p className="text-amber-600 text-sm">
            Este enlace para compartir ha expirado. Por favor, solicita un nuevo enlace al paciente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <User className="w-6 h-6 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{data.patient_info.full_name}</h1>
              <p className="text-sm text-slate-600">
                {data.patient_info.age_display} • {data.patient_info.sex}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-medium">
            <Clock className="w-5 h-5" />
            <span>Expira en: {timeLeft}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - 1/4 width */}
          <div className="lg:col-span-1 space-y-4">
            {/* Active Medications */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Pill className="w-5 h-5 text-blue-600" />
                Medicamentos Activos
              </h2>
              {data.active_medications.length === 0 ? (
                <p className="text-sm text-slate-500">Ninguno</p>
              ) : (
                <ul className="space-y-2">
                  {data.active_medications.map((med) => (
                    <li key={med.id} className="text-sm">
                      <p className="font-medium text-slate-800">{med.name}</p>
                      {med.dosage && <p className="text-xs text-slate-600">{med.dosage}</p>}
                      {med.frequency && <p className="text-xs text-slate-600">{med.frequency}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Active Conditions */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-purple-600" />
                Condiciones Activas
              </h2>
              {data.conditions.length === 0 ? (
                <p className="text-sm text-slate-500">Ninguna</p>
              ) : (
                <ul className="space-y-2">
                  {data.conditions.map((cond) => (
                    <li key={cond.id} className="text-sm">
                      <p className="font-medium text-slate-800">{cond.name}</p>
                      {cond.severity && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          cond.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                          cond.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {cond.severity}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Allergies */}
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4 bg-red-50">
              <h2 className="font-semibold text-red-900 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Alergias
              </h2>
              {data.allergies.length === 0 ? (
                <p className="text-sm text-red-600">Ninguna conocida</p>
              ) : (
                <ul className="space-y-2">
                  {data.allergies.map((allergy) => (
                    <li key={allergy.id} className="text-sm">
                      <p className="font-medium text-red-800">{allergy.allergen}</p>
                      {allergy.reaction && <p className="text-xs text-red-700">{allergy.reaction}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Content - 3/4 width */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <FileText className="w-6 h-6 text-emerald-600" />
                Últimos 7 Registros Médicos
              </h2>

              {data.recent_records.length === 0 ? (
                <p className="text-slate-500">No hay registros disponibles</p>
              ) : (
                <div className="space-y-4">
                  {data.recent_records.map((record) => (
                    <div key={record.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{record.motive}</h3>
                          {record.category && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded mt-1 inline-block">
                              {record.category.name}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-slate-500">
                          {new Date(record.created_at).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      {record.diagnosis && (
                        <p className="text-sm text-slate-700 mt-2">
                          <span className="font-medium">Diagnóstico:</span> {record.diagnosis}
                        </p>
                      )}
                      {record.has_documents && (
                        <p className="text-xs text-blue-600 mt-2">📎 Contiene documentos adjuntos</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="mt-4 p-4 bg-slate-100 rounded-lg text-sm text-slate-600">
              <p>Compartido por: <span className="font-medium">{data.shared_by}</span></p>
              {data.purpose && <p className="mt-1">Propósito: {data.purpose}</p>}
              <p className="mt-2 text-xs text-slate-500">
                Este resumen es solo para consulta. No debe usarse como única base para diagnóstico o tratamiento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
