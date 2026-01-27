import React, { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { VoiceButton } from '@/components/ui/voice-button';
import { useVoiceInput } from '@/hooks/use-voice-input';

export interface InputWithVoiceProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  language?: 'es-ES' | 'en-US';
  mode?: 'append' | 'replace';
  voiceLabel?: string;
}

export function InputWithVoice({
  value,
  onChange,
  language = 'es-ES',
  mode = 'append',
  voiceLabel,
  className = '',
  disabled = false,
  ...inputProps
}: InputWithVoiceProps) {
  const handleVoiceResult = useCallback(
    (transcript: string) => {
      // Create a synthetic event to match the onChange signature
      const newValue = mode === 'append' ? value + transcript : transcript;
      
      const syntheticEvent = {
        target: { value: newValue },
        currentTarget: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>;

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
    <div className="relative flex items-center">
      <Input
        {...inputProps}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`pr-12 ${className}`}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <VoiceButton
          isRecording={isRecording}
          isSupported={isSupported}
          onToggle={handleVoiceToggle}
          disabled={disabled}
          error={error}
          size="sm"
        />
      </div>
    </div>
  );
}
