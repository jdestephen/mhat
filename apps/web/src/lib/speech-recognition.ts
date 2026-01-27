/**
 * Speech Recognition Utilities
 * 
 * Provides utilities for working with the Web Speech API,
 * including browser compatibility checks and instance creation.
 */

// Extend Window interface to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

/**
 * Check if speech recognition is supported in the current browser
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Get the SpeechRecognition constructor (handles vendor prefixes)
 */
export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

/**
 * Configuration options for speech recognition
 */
export interface SpeechRecognitionConfig {
  language: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

/**
 * Create and configure a speech recognition instance
 */
export function createSpeechRecognition(
  config: SpeechRecognitionConfig
): any | null {
  const SpeechRecognitionConstructor = getSpeechRecognition();
  
  if (!SpeechRecognitionConstructor) {
    console.warn('Speech recognition not supported in this browser');
    return null;
  }

  const recognition = new SpeechRecognitionConstructor();
  
  // Configure recognition
  recognition.lang = config.language;
  recognition.continuous = config.continuous ?? false;
  recognition.interimResults = config.interimResults ?? true;
  recognition.maxAlternatives = config.maxAlternatives ?? 1;

  return recognition;
}

/**
 * Common error messages in Spanish
 */
export const SPEECH_ERRORS_ES = {
  'no-speech': 'No se detectó ninguna voz. Intenta de nuevo.',
  'audio-capture': 'No se encontró ningún micrófono.',
  'not-allowed': 'Permiso denegado. Por favor permite el acceso al micrófono en la configuración de tu navegador.',
  'network': 'Error de red. Verifica tu conexión a internet.',
  'aborted': 'Grabación cancelada.',
  'service-not-allowed': 'Servicio de reconocimiento de voz no disponible.',
  'bad-grammar': 'Error de configuración. Intenta recargar la página.',
  'language-not-supported': 'Idioma no soportado.',
  'unknown': 'Ocurrió un error inesperado. Intenta de nuevo.',
} as const;

/**
 * Get user-friendly error message in Spanish
 */
export function getSpeechErrorMessage(error: string): string {
  return SPEECH_ERRORS_ES[error as keyof typeof SPEECH_ERRORS_ES] || SPEECH_ERRORS_ES.unknown;
}
