import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface AuthConfig {
  dev_mode: boolean;
  require_strong_password: boolean;
  email_verification_required: boolean;
}

/**
 * Fetches public auth configuration from the backend.
 * Used to adapt frontend behavior (password rules, email verification)
 * based on whether the backend is running in dev or prod mode.
 */
export function useAuthConfig() {
  return useQuery<AuthConfig>({
    queryKey: ['auth', 'config'],
    queryFn: async () => {
      const res = await api.get<AuthConfig>('/auth/config');
      return res.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes — config rarely changes
  });
}
