'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Select, SelectOption } from '@/components/ui/select';
import api from '@/lib/api';
import { MedicalRecord, Document } from '@/types';
import { UploadCloud, CheckCircle2, FileText, X } from 'lucide-react';

interface Category {
    id: number;
    name: string;
}

export default function NewRecordPage() {
  const router = useRouter();
  
  // Record Details
  const [motive, setMotive] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState<string | undefined>();
  const [diagnosisCodeSystem, setDiagnosisCodeSystem] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  
  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // Data
  const [categories, setCategories] = useState<Category[]>([]);

  // Uploads
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string>('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
      try {
          const res = await api.get('/hx/categories');
          setCategories(res.data);
      } catch (e) {
          console.error("Failed to load categories", e);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removeFile = (idx: number) => {
      setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const val = tagInput.trim();
          if (val && !tags.includes(val)) {
              setTags(prev => [...prev, val]);
              setTagInput('');
          }
      } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
          setTags(prev => prev.slice(0, -1));
      }
  };

  const removeTag = (idx: number) => {
      setTags(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionStatus('Creating record...');

    try {
      // 1. Create Record
      const payload: any = {
        motive,
        diagnosis,
        diagnosis_code: diagnosisCode,
        diagnosis_code_system: diagnosisCodeSystem,
        notes,
        tags
      };
      if (categoryId) payload.category_id = parseInt(categoryId);

      const res = await api.post<MedicalRecord>('/hx/', payload);
      const recordId = res.data.id;

      // 2. Upload Files
      if (files.length > 0) {
          setSubmissionStatus('Uploading files...');
          
          await Promise.all(files.map(async (file) => {
             const formData = new FormData();
             formData.append('file', file);
             try {
                await api.post(`/hx/${recordId}/documents`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const total = progressEvent.total || file.size;
                        const percent = Math.round((progressEvent.loaded * 100) / total);
                        setUploadProgress(prev => ({ ...prev, [file.name]: percent }));
                    }
                });
             } catch (err) {
                 console.error(`Failed to upload ${file.name}`, err);
             }
          }));
      }

      setSubmissionStatus('Done! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 500);

    } catch (error) {
      console.error(error);
      alert('Failed to create record');
      setIsSubmitting(false);
      setSubmissionStatus('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-4">
         <h1 className="text-3xl font-bold text-emerald-950">New Medical Record</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Main Details Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
            <h2 className="text-lg font-semibold text-emerald-900 mb-4 border-b pb-2">Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                   <label className="block text-sm font-medium mb-1">Motive / Title <span className="text-red-500">*</span></label>
                   <Input 
                     value={motive} 
                     onChange={(e) => setMotive(e.target.value)} 
                     placeholder="e.g. Annual Checkup, Knee Pain Consultation"
                     required
                     onKeyDown={handleKeyDown}
                   />
                </div>
                
                <div>
                   <label className="block text-sm font-medium mb-1">Category</label>
                   <Select
                     options={categories.map(c => ({ value: c.id, label: c.name }))}
                     value={categoryId}
                     onChange={(val) => setCategoryId(val.toString())}
                     placeholder="Select a category..."
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium mb-1">Tags</label>
                   <div className="flex flex-wrap gap-2 p-2 border border-slate-200 rounded-md min-h-[42px] bg-white focus-within:outline-none focus-within:ring-1 focus-within:ring-emerald-600 focus-within:ring-offset-0">
                      {tags.map((tag, idx) => (
                          <div key={idx} className="bg-emerald-100 text-emerald-800 text-sm px-2 py-1 rounded-full flex items-center gap-1">
                              <span>{tag}</span>
                              <button type="button" onClick={() => removeTag(idx)} className="hover:text-emerald-900">
                                  <X className="h-3 w-3" />
                              </button>
                          </div>
                      ))}
                      <input 
                        className="flex-1 outline-none min-w-[50px] bg-transparent text-sm"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder={tags.length === 0 ? "Type & Enter..." : ""}
                      />
                   </div>
                </div>

                <div className="col-span-2">
                   <label className="block text-sm font-medium mb-1">Diagnosis</label>
                   <Autocomplete
                     endpoint="/catalog/conditions"
                     placeholder="Search diagnosis (e.g., Diabetes)"
                     onSelect={(opt) => {
                       setDiagnosis(opt.display);
                       setDiagnosisCode(opt.code);
                       setDiagnosisCodeSystem(opt.code_system);
                     }}
                     onChange={(val) => {
                       setDiagnosis(val);
                       setDiagnosisCode(undefined);
                       setDiagnosisCodeSystem(undefined);
                     }}
                     value={diagnosis}
                   />                </div>

                <div className="col-span-2">
                   <label className="block text-sm font-medium mb-1">Notes</label>
                   <textarea 
                      className="w-full min-h-[120px] rounded-md border border-slate-200 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Doctor's notes, observations, prescriptions..."
                   />
                </div>
            </div>
        </div>

        {/* File Upload Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--border-light)]">
            <h2 className="text-lg font-semibold text-emerald-900 mb-4 border-b pb-2">Documents</h2>
            
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                 onClick={() => document.getElementById('file-upload')?.click()}
            >
                 <UploadCloud className="h-10 w-10 mb-2 text-emerald-600" />
                 <p className="text-sm font-medium text-slate-700">Click to upload files</p>
                 <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG supported</p>
                 <Input 
                   type="file" 
                   multiple 
                   onChange={handleFileChange} 
                   className="hidden" 
                   id="file-upload"
                 />
            </div>

            {files.length > 0 && (
                <div className="mt-6 space-y-3">
                    {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-100">
                            <FileText className="h-5 w-5 text-slate-400" />
                            <div className="flex-1 min-w-0">
                               <p className="text-sm font-medium truncate">{file.name}</p>
                               <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            
                            {/* Upload Progress Bar for this file */}
                            {isSubmitting && uploadProgress[file.name] !== undefined && (
                                <div className="w-24">
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 transition-all duration-300"
                                            style={{ width: `${uploadProgress[file.name]}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {!isSubmitting && (
                                <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <div className="flex items-center gap-4">
                {submissionStatus && <span className="text-sm text-emerald-700 font-medium">{submissionStatus}</span>}
                <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                    {isSubmitting ? 'Saving...' : 'Create Record'}
                </Button>
            </div>
        </div>

      </form>
    </div>
  );
}
