'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { RecordSearchBar } from '@/components/search/RecordSearchBar';
import { Plus, FileText, Calendar, Stethoscope, Paperclip, MoreVertical, Eye, Share2 } from 'lucide-react';
import Link from 'next/link';
import { MedicalRecord, RecordStatus } from '@/types';

export default function DashboardPage() {
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  
  const [searchFilters, setSearchFilters] = useState({
    query: '',
    categoryId: undefined as number | undefined,
    dateFrom: undefined as string | undefined,
    dateTo: undefined as string | undefined,
  });

  // Debounce text search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchFilters.query);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchFilters.query]);

  const { data: records, isLoading } = useQuery<MedicalRecord[]>({
    queryKey: ['medical-records', debouncedQuery, searchFilters.categoryId, 
               searchFilters.dateFrom, searchFilters.dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('q', debouncedQuery);
      if (searchFilters.categoryId) params.append('category_id', searchFilters.categoryId.toString());
      if (searchFilters.dateFrom) params.append('date_from', searchFilters.dateFrom);
      if (searchFilters.dateTo) params.append('date_to', searchFilters.dateTo);
      
      const res = await api.get(`/hx/${params.toString() ? '?' + params.toString() : ''}`);
      return res.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/hx/categories');
      return res.data;
    },
  });

  const getStatusBadge = (status: RecordStatus) => {
    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    const formatted = status.replace(/_/g, ' ').split(' ').map(capitalize).join(' ');
    
    const styles = {
      [RecordStatus.UNVERIFIED]: 'bg-slate-200 text-slate-700',
      [RecordStatus.BACKED_BY_DOCUMENT]: 'bg-blue-100 text-blue-800',
      [RecordStatus.VERIFIED]: 'bg-emerald-100 text-emerald-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded font-medium ${styles[status]}`}>
        {formatted}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <Link href="/records/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> New Record
          </Button>
        </Link>
      </div>
      
      <RecordSearchBar
        onSearch={(filters) => setSearchFilters({
          query: filters.query,
          categoryId: filters.categoryId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })}
        categories={categories || []}
      />
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Medical Timeline</h2>
        
        {isLoading ? (
          <div className="text-center py-10">Loading records...</div>
        ) : (
          <>
            {records?.length === 0 && (
              <div className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-300">
                <Stethoscope className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500 mb-2">No medical records found.</p>
                <Link href="/records/new">
                  <Button variant="outline">Create your first record</Button>
                </Link>
              </div>
            )}

            {/* Desktop Table View (md and up) */}
            {records && records.length > 0 && (
              <div className="hidden md:block bg-white rounded-lg border border-[var(--border-light)] shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Motive/Category</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Diagnosis</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Documents</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                        {/* Date */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-slate-600">
                            <Calendar size={14} className="mr-2 text-slate-400" />
                            {new Date(record.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </div>
                        </td>

                        {/* Motive */}
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{record.motive}</p>
                            {record.category && (
                              <p className="text-xs text-slate-500 mt-1">{record.category.name}</p>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {record.diagnosis ? (
                            <span className="">
                              {record.diagnosis}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>

                        {/* Documents */}
                        <td className="px-4 py-4">
                          {record.documents && record.documents.length > 0 ? (
                            <div className="flex items-center gap-2">
                              {record.documents.length === 1 ? (
                                <a
                                  key={record.documents[0].id}
                                  href={record.documents[0].url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
                                >
                                  <Paperclip size={14} className="text-slate-400 pr-1" />
                                  {record.documents[0].filename}
                                </a>
                              ) : (
                                <>
                                  <Paperclip size={14} className="text-slate-400 pr-1" />
                                  <span className="text-sm text-slate-600">{record.documents.length} Documents</span>  
                                </>  
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(record.status)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === record.id ? null : record.id)}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                          >
                            <MoreVertical size={16} className="text-slate-600" />
                          </button>
                          
                          {openDropdown === record.id && (
                            <>
                              {/* Backdrop to close dropdown */}
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenDropdown(null)}
                              />
                              
                              {/* Dropdown Menu */}
                              <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-20">
                                <button
                                  className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                  onClick={() => {
                                    setOpenDropdown(null);
                                    window.location.href = `/records/${record.id}`;
                                  }}
                                >
                                  <Eye size={14} className="mr-2" />
                                  View
                                </button>
                                <button
                                  className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                  onClick={() => {
                                    setOpenDropdown(null);
                                    // Share functionality will be implemented later
                                  }}
                                >
                                  <Share2 size={14} className="mr-2" />
                                  Share
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile Card View (below md) */}
            {records && records.length > 0 && (
              <div className="md:hidden space-y-4">
                {records.map((record) => (
                  <div key={record.id} className="bg-white p-6 rounded-lg border border-[var(--border-light)] shadow-sm">
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
                        <div className="flex flex-col gap-2 items-end">
                          {record.category && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200 shadow-sm whitespace-nowrap">
                              {record.category.name}
                            </span>
                          )}
                          {getStatusBadge(record.status)}
                        </div>
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
          </>
        )}
      </div>
    </div>
  );
}
