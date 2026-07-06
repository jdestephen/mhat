import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

interface UploadDocumentParams {
  recordId: string;
  file: File;
  onProgress?: (percent: number) => void;
}

export function useUploadDocument() {
  return useMutation({
    mutationFn: async ({ recordId, file, onProgress }: UploadDocumentParams) => {
      const formData = new FormData();
      formData.append('file', file);

      // Setting Content-Type to undefined clears the default 'application/json'
      // from the axios instance, letting the browser auto-set
      // 'multipart/form-data' with the correct boundary from FormData.
      const res = await api.post(`/hx/${recordId}/documents`, formData, {
        headers: { 'Content-Type': undefined },
        onUploadProgress: (progressEvent) => {
          try {
            const total = progressEvent.total || file.size;
            const percent = Math.round((progressEvent.loaded * 100) / total);
            onProgress?.(percent);
          } catch {
            // Swallow progress errors so they don't crash the upload
          }
        },
      });

      return res.data;
    },
  });
}
