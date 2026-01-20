'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Calendar, Stethoscope, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { MedicalRecord } from '@/types';

export default function DashboardPage() {
  const { data: records, isLoading } = useQuery<MedicalRecord[]>({
    queryKey: ['medical-records'],
    queryFn: async () => {
      const res = await api.get('/hx/');
      return res.data;
    },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <Link href="/records/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> New Record
          </Button>
        </Link>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Medical Timeline</h2>
        
        {isLoading ? (
          <div className="text-center py-10">Loading records...</div>
        ) : (
          <div className="space-y-6">
             {records?.length === 0 && (
                <div className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-300">
                  <Stethoscope className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-2">No medical records found.</p>
                  <Link href="/records/new">
                    <Button variant="outline">Create your first record</Button>
                  </Link>
                </div>
             )}

             {records?.map((record) => (
              <div key={record.id} className="bg-white p-6 rounded-lg border border-[var(--border-light)] shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-3 mb-2">
                  <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                    <Stethoscope size={20} />
                  </div>
                      <div className="flex justify-between items-start w-full">
                         <div>
                            <h3 className="font-bold text-lg text-slate-900">{record.motive}</h3>
                            <div className="flex items-center text-xs text-slate-500 gap-2 mt-1 flex-wrap">
                                <span className="flex items-center">
                                   <Calendar size={12} className="mr-1" />
                                   {new Date(record.created_at).toLocaleDateString()}
                                </span>
                                {record.tags && record.tags.length > 0 && (
                                    <>
                                        <span className="text-slate-300">•</span>
                                        <div className="flex gap-1">
                                            {record.tags.map((tag, idx) => (
                                                <span key={idx} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                         </div>
                         {record.category && (
                             <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200 shadow-sm ml-2 whitespace-nowrap">
                                 {record.category.name}
                             </span>
                         )}
                      </div>
                </div>

                <div className="pl-13 ml-1"> 
                  {record.diagnosis && (
                    <div className="mb-2">
                      <span className="font-semibold text-xs uppercase tracking-wide text-slate-400">Diagnosis</span>
                      <p className="text-slate-700">{record.diagnosis}</p>
                    </div>
                  )}
                  
                  {record.documents && record.documents.length > 0 && (
                     <div className="mt-4 pt-3 border-t border-slate-50">
                        <span className="font-semibold text-xs uppercase tracking-wide text-slate-400 mb-2 block">Attachments</span>
                        <div className="flex flex-wrap gap-2">
                          {record.documents.map(doc => (
                              <a 
                                key={doc.id} 
                                href={doc.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
                              >
                                <Paperclip size={12} className="mr-1.5" />
                                {doc.filename}
                              </a>
                          ))}
                        </div>
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
