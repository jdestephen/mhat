import React, { useCallback } from 'react';
import { VoiceButton } from '@/components/ui/voice-button';
import { useVoiceInput } from '@/hooks/use-voice-input';

export interface TextareaWithVoiceProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  language?: 'es-ES' | 'en-US';
  mode?: 'append' | 'replace';
  voiceLabel?: string;
}

export function TextareaWithVoice({
  value,
  onChange,
  language = 'es-ES',
  mode = 'append',
  voiceLabel,
  className = '',
  disabled = false,
  ...textareaProps
}: TextareaWithVoiceProps) {
  const handleVoiceResult = useCallback(
    (transcript: string) => {
      // Create a synthetic event to match the onChange signature
      const newValue = mode === 'append' ? value + transcript : transcript;
      
      const syntheticEvent = {
        target: { value: newValue },
        currentTarget: { value: newValue },
      } as React.ChangeEvent<HTMLTextAreaElement>;

      onChange(syntheticEvent);
    },
    [value, mode, onChange]
  );

  const {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    error,
  } = useVoiceInput({
    language,
    continuous: false,
    interimResults: true,
    onResult: handleVoiceResult,
  });

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10">
        <VoiceButton
          isRecording={isRecording}
          isSupported={isSupported}
          onToggle={handleVoiceToggle}
          disabled={disabled}
          error={error}
          size="sm"
        />
      </div>
      <textarea
        {...textareaProps}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full min-h-[80px] rounded-md border border-slate-200 bg-background px-3 py-2 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      />
    </div>
  );
}
