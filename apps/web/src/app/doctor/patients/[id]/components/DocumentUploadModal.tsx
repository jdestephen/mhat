'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/hooks/queries/useCategories';
import { useCreateDoctorRecord } from '@/hooks/mutations/useCreateDoctorRecord';
import { useUploadDocument } from '@/hooks/mutations/useUploadDocument';
import {
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle,
} from 'lucide-react';

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  onSuccess: () => void;
}

export function DocumentUploadModal({
  open,
  onOpenChange,
  patientId,
  onSuccess,
}: DocumentUploadModalProps) {
  const { data: categories = [] } = useCategories();
  const createRecord = useCreateDoctorRecord();
  const uploadDocument = useUploadDocument();

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentCategories = useMemo(
    () => categories.filter((c) => c.documents),
    [categories],
  );

  const resetForm = () => {
    setSelectedCategoryId(null);
    setFiles([]);
    setNote('');
    setUploadProgress({});
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles = Array.from(selectedFiles);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!selectedCategoryId || files.length === 0) return;

    setIsSubmitting(true);

    try {
      // Step 1: Create a lightweight MedicalRecord
      const selectedCategory = documentCategories.find((c) => c.id === selectedCategoryId);
      const record = await createRecord.mutateAsync({
        patientId,
        motive: selectedCategory?.name ?? 'Documento',
        notes: note || undefined,
        category_id: selectedCategoryId,
        tags: ['document-upload'],
      });

      // Step 2: Upload each file to the new record
      for (let i = 0; i < files.length; i++) {
        await uploadDocument.mutateAsync({
          recordId: record.id,
          file: files[i],
          onProgress: (percent) => {
            setUploadProgress((prev) => ({ ...prev, [i]: percent }));
          },
        });
      }

      // Done
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error uploading documents:', error);
      setIsSubmitting(false);
    }
  };

  const canSubmit = selectedCategoryId !== null && files.length > 0 && !isSubmitting;

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return '🖼️';
    }
    if (ext === 'pdf') {
      return '📄';
    }
    return '📎';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] min-w-[550px] overflow-y-auto">
        <DialogHeader onOpenChange={handleClose}>
          <DialogTitle>
            <span className="text-xl font-bold text-gray-900">
              Adjuntar Documentos
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-3">
          {/* Category Selector — Badge Buttons */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-3 block">
              Tipo de Documento
            </label>
            <div className="flex flex-wrap gap-2">
              {documentCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                    border cursor-pointer
                    ${selectedCategoryId === cat.id
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {selectedCategoryId === cat.id && (
                    <CheckCircle className="inline-block h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                  )}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload Area */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-3 block">
              Archivos
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                transition-all duration-200
                ${isDragOver
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                }
              `}
            >
              <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 font-medium">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PDF, imágenes u otros documentos
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept="image/*,.pdf,.doc,.docx"
            />

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-lg flex-shrink-0">{getFileIcon(file.name)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        {uploadProgress[index] !== undefined ? (
                          <span className="text-xs text-emerald-600 font-medium">
                            {uploadProgress[index]}%
                          </span>
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4 text-slate-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-2 block">
              Nota <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
              placeholder="Añade una nota sobre estos documentos..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                disabled:opacity-50 disabled:bg-slate-100
                resize-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Guardar Documentos
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
