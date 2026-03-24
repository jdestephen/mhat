import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/**
 * Derives the backend origin (e.g. http://localhost:8000) from the API URL.
 * Used to build full URLs for static assets like uploaded documents.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
export const BACKEND_ORIGIN = new URL(apiUrl).origin;

/** Builds a full URL for a document served by the backend or cloud storage. */
export const getDocumentUrl = (path: string): string =>
  path.startsWith('http') ? path : `${BACKEND_ORIGIN}${path}`;

export default api;
