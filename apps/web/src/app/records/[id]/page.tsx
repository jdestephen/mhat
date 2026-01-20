'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { MedicalRecord } from '@/types';
import { ArrowLeft, Calendar, FileText, Paperclip, XIcon } from 'lucide-react';
import Link from 'next/link';

export default function ViewRecordPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params.id as string;

  const { data: record, isLoading } = useQuery<MedicalRecord>({
    queryKey: ['medical-record', recordId],
    queryFn: async () => {
      const res = await api.get(`/hx/${recordId}`);
      return res.data;
    },
  });

  const getStatusBadge = (status: string) => {
    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    const formatted = status.replace(/_/g, ' ').split(' ').map(capitalize).join(' ');
    
    const styles: Record<string, string> = {
      'unverified': 'bg-slate-200 text-slate-700',
      'backed_by_document': 'bg-blue-100 text-blue-800',
      'verified': 'bg-emerald-100 text-emerald-800'
    };
    
    return (
      <span className={`px-3 py-1 text-sm rounded-full font-medium ${styles[status] || styles.unverified}`}>
        {formatted}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <div className="text-center">Loading record...</div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <div className="text-center">Record not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto rounded-lg border border-[var(--border-light)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 rounded-t-lg bg-white p-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-col items-start gap-0 mt-1 pl-2">
              {record.category && (
                <span className="inline-flex text-lg font-semibold text-emerald-800">
                  {record.category.name}
                </span>
              )}
              <span className="flex items-center text-xs text-slate-500">
                {new Date(record.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mb-0 border-0"
        >
          <XIcon className="w-6 h-6" />
        </Button>
      </div>

      {/* Record Details Card */}
      <div className="bg-white p-8 rounded-b-lg">
        <div className="space-y-6">
          {/* Motive */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Motive</label>
              {getStatusBadge(record.status)}
            </div>
            <Input 
              value={record.motive} 
              disabled
              className="bg-slate-50"
            />
          </div>


          {/* Diagnosis */}
          {record.diagnosis && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Diagnosis</label>
              <Input 
                value={record.diagnosis} 
                disabled
                className="bg-slate-50"
              />
              {record.diagnosis_code && (
                <p className="text-xs text-slate-500 mt-1">
                  Code: {record.diagnosis_code}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <textarea 
                value={record.notes} 
                disabled
                className="w-full px-3 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-md resize-none"
                rows={4}
              />
            </div>
          )}

          {/* Tags */}
          {record.tags && record.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {record.tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm border border-slate-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {record.documents && record.documents.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Attachments ({record.documents.length})
              </label>
              <div className="space-y-2">
                {record.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Paperclip size={16} className="text-slate-400" />
                      <span className="text-sm text-slate-700 group-hover:text-emerald-700">
                        {doc.filename}
                      </span>
                    </div>
                    <FileText size={16} className="text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
