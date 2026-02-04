'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Link2, Clock, User, FileText, AlertCircle } from 'lucide-react';

interface ShareLinkCardProps {
  share: {
    id: string;
    token: string;
    created_at: string;
    expires_at: string;
    is_expired: boolean;
    is_revoked: boolean;
    is_single_use: boolean;
    record_count: number;
    access_count: number;
    recipient_name?: string;
    recipient_email?: string;
    purpose?: string;
    share_type?: string;
  };
  onRevoke: () => void;
  onRefresh: () => void;
}

export function ShareLinkCard({ share, onRevoke, onRefresh }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Calculate time remaining
  useEffect(() => {
    if (share.is_expired || share.is_revoked) {
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(share.expires_at).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expirado');
        onRefresh(); // Refresh to update expired status
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m restantes`);
      } else {
        setTimeLeft(`${minutes}m restantes`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [share.expires_at, share.is_expired, share.is_revoked]);

  const shareUrl = share.share_type === 'SUMMARY'
    ? `${window.location.origin}/shared/${share.token}/summary`
    : `${window.location.origin}/shared/${share.token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isActive = !share.is_expired && !share.is_revoked;

  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border ${
      isActive ? 'border-slate-200' : 'border-slate-150 bg-slate-50'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900">
              {share.share_type === 'SUMMARY' ? 'Resumen Completo' : `${share.record_count} Registro${share.record_count > 1 ? 's' : ''}`}
              {share.recipient_name && ` - ${share.recipient_name}`}
            </h3>
          </div>

          {share.purpose && (
            <p className="text-sm text-slate-600 mb-2">{share.purpose}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-slate-500">
            {isActive ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Clock className="w-3 h-3" />
                {timeLeft}
              </span>
            ) : share.is_revoked ? (
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                Revocado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3 h-3" />
                Expirado
              </span>
            )}

            <span>Visto: {share.access_count} {share.access_count === 1 ? 'vez' : 'veces'}</span>
            
            {share.is_single_use && (
              <span className="text-amber-600">Un solo uso</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {isActive && (
            <>
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
              <Button
                onClick={onRevoke}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Revocar
              </Button>
            </>
          )}
        </div>
      </div>

      {copied && (
        <p className="text-xs text-emerald-600 mb-2">✓ Enlace copiado al portapapeles</p>
      )}

      {isActive && (
        <div className="mt-4 p-2 bg-slate-50 rounded border border-slate-200">
          <p className="text-xs font-mono text-slate-600 break-all">{shareUrl}</p>
        </div>
      )}
    </div>
  );
}
