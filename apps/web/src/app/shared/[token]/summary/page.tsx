'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Clock, User, FileText } from 'lucide-react';
import { RecordDetailModal, RecordDetailData } from '@/components/records/RecordDetailModal';
import { RecordCard, RecordCardData } from '@/components/records/RecordCard';
import { HealthSidebar } from '@/components/patient/HealthSidebar';

interface RecentRecord {
  id: string;
  motive: string;
  diagnoses: Array<{ diagnosis: string }>;
  category: { id: string; name: string } | null;
  status: string;
  red_flags: string[] | null;
  key_finding: string | null;
  documents: Array<{ id: string; filename: string; url: string }>;
  created_at: string;
}

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
  recent_records: RecentRecord[];
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
  const [selectedRecord, setSelectedRecord] = useState<RecordDetailData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);

  const handleViewRecord = async (recordId: string) => {
    setLoadingRecord(true);
    try {
      const response = await api.get(`/hx/shared/${token}/record/${recordId}`);
      const raw = response.data;
      // Transform API response to match RecordDetailData
      const transformed: RecordDetailData = {
        ...raw,
        diagnoses: raw.diagnosis
          ? [{ diagnosis: raw.diagnosis }]
          : [],
      };
      setSelectedRecord(transformed);
      setModalOpen(true);
    } catch (err: unknown) {
      console.error('Failed to load record:', err);
      alert('Error al cargar el registro');
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleCardViewDetail = (cardData: RecordCardData) => {
    handleViewRecord(cardData.id);
  };

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get(`/hx/shared/${token}/summary`);
        setData(response.data);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || 'Error al cargar el resumen médico');
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
          <HealthSidebar
            medications={data.active_medications}
            conditions={data.conditions}
            allergies={data.allergies}
          />

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
                <div className="flex flex-col gap-2">
                  {data.recent_records.map((record, index) => (
                    <RecordCard
                      key={record.id}
                      record={record}
                      index={index}
                      onViewDetail={handleCardViewDetail}
                    />
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

      <RecordDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        record={selectedRecord}
      />
    </div>
  );
}
