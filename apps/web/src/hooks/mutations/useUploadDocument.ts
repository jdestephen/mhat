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

      const res = await api.post(`/hx/${recordId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || file.size;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          onProgress?.(percent);
        },
      });

      return res.data;
    },
  });
}
