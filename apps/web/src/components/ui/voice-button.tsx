import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface VoiceButtonProps {
  isRecording: boolean;
  isSupported: boolean;
  onToggle: () => void;
  disabled?: boolean;
  error?: Error | null;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function VoiceButton({
  isRecording,
  isSupported,
  onToggle,
  disabled = false,
  error = null,
  size = 'default',
  className = '',
}: VoiceButtonProps) {
  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  const getIcon = () => {
    if (isRecording) {
      return <Mic className="h-4 w-4" />;
    }
    if (error) {
      return <MicOff className="h-4 w-4" />;
    }
    return <Mic className="h-4 w-4" />;
  };

  const getButtonClass = () => {
    const baseClass = 'transition-all';
    
    if (isRecording) {
      return `${baseClass} bg-red-100 text-red-600 hover:bg-red-200 animate-pulse`;
    }
    
    if (error) {
      return `${baseClass} bg-red-50 text-red-500 hover:bg-red-100`;
    }
    
    return `${baseClass} bg-slate-100 text-slate-600 hover:bg-slate-200`;
  };

  const getTooltip = () => {
    if (isRecording) {
      return 'Grabando... Haz clic para detener';
    }
    if (error) {
      return error.message;
    }
    return 'Usar micrófono';
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={onToggle}
      disabled={disabled}
      className={`${getButtonClass()} ${className}`}
      title={getTooltip()}
      aria-label={getTooltip()}
    >
      {getIcon()}
      {isRecording && (
        <span className="ml-1 h-2 w-2 rounded-full bg-red-600 animate-pulse" />
      )}
    </Button>
  );
}
