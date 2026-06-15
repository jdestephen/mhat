'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, CheckCircle, Loader2 } from 'lucide-react';

interface DocumentUploadProps {
  label: string;
  description?: string;
  accept?: string;
  maxSizeMB?: number;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  previewUrl?: string | null;
}

export function DocumentUpload({
  label,
  description,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  maxSizeMB = 10,
  onFileSelect,
  selectedFile,
  previewUrl,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    setError(null);
    const allowedTypes = accept.split(',').map((t) => t.trim());
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de archivo no válido. Usa JPG, PNG, WEBP o PDF.');
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`El archivo excede ${maxSizeMB}MB.`);
      return false;
    }
    return true;
  };

  const handleFile = (file: File) => {
    if (!validateFile(file)) {
      onFileSelect(null);
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setLocalPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setLocalPreview(null);
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    onFileSelect(null);
    setLocalPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const preview = localPreview || previewUrl;
  const isImage = selectedFile?.type.startsWith('image/') || previewUrl;
  const isPdf = selectedFile?.type === 'application/pdf';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>

      {selectedFile ? (
        <div className="relative border border-emerald-200 bg-emerald-50/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            {/* Preview */}
            {preview && isImage ? (
              <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border border-slate-200">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                {isPdf ? (
                  <FileText className="w-8 h-8 text-red-500" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>
            )}

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-400">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex items-center gap-1 text-emerald-600 text-xs mt-0.5">
                <CheckCircle className="w-3 h-3" />
                Listo para subir
              </div>
            </div>

            {/* Remove */}
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="Quitar archivo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
            ${dragActive
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/50'
            }
          `}
        >
          <Upload className={`w-8 h-8 mx-auto mb-2 ${dragActive ? 'text-emerald-500' : 'text-slate-400'}`} />
          <p className="text-sm text-slate-600">
            <span className="font-medium text-emerald-700">Haz clic</span> o arrastra un archivo
          </p>
          {description && (
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          )}
          <p className="text-xs text-slate-300 mt-1">
            JPG, PNG, WEBP o PDF — máx. {maxSizeMB}MB
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
