import { useState, useRef, useEffect, useCallback } from 'react';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognition,
  getSpeechErrorMessage,
} from '@/lib/speech-recognition';

export interface UseVoiceInputOptions {
  language?: 'es-ES' | 'en-US';
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string) => void;
  onError?: (error: Error) => void;
}

export interface UseVoiceInputReturn {
  isRecording: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  startRecording: () => void;
  stopRecording: () => void;
  resetTranscript: () => void;
  error: Error | null;
}

export function useVoiceInput(
  options: UseVoiceInputOptions = {}
): UseVoiceInputReturn {
  const {
    language = 'es-ES',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [isSupported] = useState(isSpeechRecognitionSupported());

  const recognitionRef = useRef<any>(null);

  // Initialize recognition instance
  useEffect(() => {
    if (!isSupported) return;

    const recognition = createSpeechRecognition({
      language,
      continuous,
      interimResults,
    });

    if (!recognition) return;

    // Handle results
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const resultTranscript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += resultTranscript + ' ';
        } else {
          interim += resultTranscript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
        if (onResult) {
          onResult(finalTranscript.trim());
        }
      }

      setInterimTranscript(interim);
    };

    // Handle errors
    recognition.onerror = (event: any) => {
      const errorMessage = getSpeechErrorMessage(event.error);
      const error = new Error(errorMessage);
      setError(error);
      setIsRecording(false);
      
      if (onError) {
        onError(error);
      }
    };

    // Handle end
    recognition.onend = () => {
      setIsRecording(false);
      setInterimTranscript('');
    };

    // Handle start
    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [language, continuous, interimResults, onResult, onError, isSupported]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current || isRecording) return;

    try {
      setError(null);
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setError(error as Error);
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current || !isRecording) return;

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }, [isRecording]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isRecording,
    isSupported,
    transcript,
    interimTranscript,
    startRecording,
    stopRecording,
    resetTranscript,
    error,
  };
}
