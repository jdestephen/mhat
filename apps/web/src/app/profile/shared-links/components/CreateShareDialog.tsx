'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Copy, Check, Clock, User, Mail, FileHeart, FileText } from 'lucide-react';
import api from '@/lib/api';

interface CreateShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateShareDialog({ open, onOpenChange, onSuccess }: CreateShareDialogProps) {
  const [shareType, setShareType] = useState<'SUMMARY' | 'SPECIFIC_RECORDS'>('SUMMARY');
  const [expiration, setExpiration] = useState('60');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isSingleUse, setIsSingleUse] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [copied, setCopied] = useState(false);

  const expirationOptions = [
    { value: '20', label: '20 minutos' },
    { value: '30', label: '30 minutos' },
    { value: '60', label: '1 hora' },
    { value: '240', label: '4 horas' },
    { value: '1440', label: '24 horas' },
    { value: '10080', label: '7 días' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const payload: any = {
        share_type: shareType,
        expiration_minutes: parseInt(expiration),
        is_single_use: isSingleUse,
        recipient_name: recipientName || undefined,
        recipient_email: recipientEmail || undefined,
        purpose: purpose || undefined,
      };

      // For specific records, we'd need to collect record IDs
      // For now, we're focusing on SUMMARY type
      if (shareType === 'SPECIFIC_RECORDS') {
        // This would require a record selector component
        alert('La selección de registros específicos se implementará próximamente');
        setIsGenerating(false);
        return;
      }

      const response = await api.post('/hx/share', payload);

      setShareUrl(response.data.share_url);
      setExpiresAt(response.data.expires_at);
    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert('Error al generar enlace para compartir. Por favor, inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleClose = () => {
    setShareUrl('');
    setExpiresAt('');
    setRecipientName('');
    setRecipientEmail('');
    setPurpose('');
    setIsSingleUse(false);
    setCopied(false);
    setShareType('SUMMARY');
    onOpenChange(false);
    if (shareUrl) {
      onSuccess(); // Refresh parent list
    }
  };

  const formatExpirationDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Compartir Historial Médico</DialogTitle>
          <DialogDescription>
            Genera un enlace seguro y de tiempo limitado para compartir tu información médica
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-4 py-4">
            {/* Share Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Compartición</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShareType('SUMMARY')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    shareType === 'SUMMARY'
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <FileHeart className={`h-6 w-6 mx-auto mb-2 ${
                    shareType === 'SUMMARY' ? 'text-emerald-600' : 'text-slate-400'
                  }`} />
                  <p className="text-sm font-medium">Resumen Completo</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Historial, medicamentos, condiciones y alergias
                  </p>
                </button>

                <button
                  onClick={() => setShareType('SPECIFIC_RECORDS')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    shareType === 'SPECIFIC_RECORDS'
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  disabled
                >
                  <FileText className={`h-6 w-6 mx-auto mb-2 ${
                    shareType === 'SPECIFIC_RECORDS' ? 'text-emerald-600' : 'text-slate-400'
                  }`} />
                  <p className="text-sm font-medium">Registros Específicos</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Seleccionar registros individuales
                  </p>
                  <p className="text-xs text-amber-600 mt-1">(Próximamente)</p>
                </button>
              </div>
            </div>

            {/* Expiration Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tiempo de Expiración
              </label>
              <Select
                options={expirationOptions}
                value={expiration}
                onChange={(val) => setExpiration(val.toString())}
              />
            </div>

            {/* Single Use Toggle */}
            <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-md">
              <input
                type="checkbox"
                id="singleUse"
                checked={isSingleUse}
                onChange={(e) => setIsSingleUse(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
              />
              <label htmlFor="singleUse" className="text-sm cursor-pointer">
                <span className="font-medium">Enlace de un solo uso</span>
                <span className="text-slate-500 block text-xs">El enlace solo puede ser accedido una vez</span>
              </label>
            </div>

            {/* Recipient Info (Optional) */}
            <div className="space-y-3 p-3 border border-slate-200 rounded-md bg-slate-50">
              <p className="text-sm font-medium text-slate-700">Información del Destinatario (Opcional)</p>
              
              <div className="space-y-2">
                <label className="text-xs text-slate-600 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Nombre del Doctor
                </label>
                <Input
                  placeholder="Dr. Juan Pérez"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-600 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Correo Electrónico
                </label>
                <Input
                  type="email"
                  placeholder="doctor@hospital.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-600">Propósito</label>
                <Input
                  placeholder="ej., Consulta de emergencia"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="w-full bg-emerald-900 hover:bg-emerald-800"
            >
              {isGenerating ? 'Generando...' : 'Generar Enlace para Compartir'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Success Message */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md">
              <p className="text-sm font-medium text-emerald-900">✓ ¡Enlace para compartir generado exitosamente!</p>
              <p className="text-xs text-emerald-700 mt-1">
                Expira: {formatExpirationDate(expiresAt)}
              </p>
            </div>

            {/* Share URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Enlace para Compartir</label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="px-3"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-600">✓ Copiado al portapapeles</p>
              )}
            </div>

            {/* Instructions */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <p className="text-sm font-medium text-slate-700">Próximos Pasos:</p>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                <li>Copia el enlace y compártelo con el destinatario</li>
                <li>El enlace expirará en {expirationOptions.find(o => o.value === expiration)?.label}</li>
                {isSingleUse && <li>Este enlace solo puede ser accedido una vez</li>}
                <li>Puedes revocar el acceso en cualquier momento desde esta página</li>
              </ul>
            </div>

            {/* Close Button */}
            <Button onClick={handleClose} variant="outline" className="w-full">
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
