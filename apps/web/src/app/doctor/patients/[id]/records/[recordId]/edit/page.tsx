'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { MedicalRecord } from '@/types';
import api from '@/lib/api';

/**
 * Doctor Edit Record page — fetches the existing record and dynamically imports
 * the shared tabbed form (new-tabbed) with the record data passed as initialData.
 * This avoids duplicating the 800+ line tabbed form component.
 */

// Dynamically import the tabbed form content
import TabbedRecordForm from '../../new-tabbed/page';

export default function EditRecordPage({ params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id: patientId, recordId } = use(params);
  const router = useRouter();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await api.get(`/doctor/records/${recordId}`);
        setRecord(res.data);
      } catch (err) {
        console.error('Failed to load record', err);
        setError('No se pudo cargar el registro médico.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [recordId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="max-w-4xl mx-auto pb-20">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
          <p className="text-red-600">{error || 'Error al cargar el registro.'}</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-emerald-700 hover:underline">
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  // Render the tabbed form with initialData for edit mode
  return <TabbedRecordForm params={params} initialData={record} />;
}
