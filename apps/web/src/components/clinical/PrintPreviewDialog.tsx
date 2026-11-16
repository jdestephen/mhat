'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

interface PrintPreviewDialogProps {
  title: string;
  path: string;
  filename: string;
  onClose: () => void;
}

export function PrintPreviewDialog({ title, path, filename, onClose }: PrintPreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    api.get<Blob>(path, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo generar el documento. Comprueba tu acceso e inténtalo de nuevo.');
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  const printDocument = () => {
    if (!url) return;
    try {
      const frameWindow = frameRef.current?.contentWindow;
      if (!frameWindow) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      frameWindow.focus();
      frameWindow.print();
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">Vista previa del documento final</p>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <>
                <a href={url} download={filename} className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-800 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50">
                  <Download className="h-4 w-4" /> Descargar
                </a>
                <Button size="sm" onClick={printDocument}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
              </>
            )}
            <button type="button" onClick={onClose} aria-label="Cerrar vista previa" className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {error ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-red-700">{error}</div>
        ) : url ? (
          <iframe ref={frameRef} src={url} title={title} className="min-h-0 flex-1 bg-slate-100" />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Generando documento…</div>
        )}
      </div>
    </div>
  );
}
