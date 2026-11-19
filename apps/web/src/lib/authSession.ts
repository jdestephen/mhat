import type { QueryClient } from '@tanstack/react-query';

const ACCOUNT_STORAGE_KEYS = [
  'token',
  'refreshToken',
  'numa_active_mode',
  'numa_active_profile_id',
  'numa_active_hc_id',
  'numa_tour_completed',
  'numa_setup_completed',
] as const;

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Cancel account-bound requests and remove every cached response before the
 * browser starts using another authenticated session.
 */
function clearAccountCache(queryClient: QueryClient): void {
  // QueryClient.clear destroys every query, which also cancels its active request.
  queryClient.clear();
}

function clearAccountStorage(): void {
  if (typeof window === 'undefined') return;
  for (const key of ACCOUNT_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

/** Clear all client state that can contain data from the signed-out account. */
export function clearAuthenticatedSession(
  queryClient: QueryClient,
): void {
  // Remove the token first so observers notified by clear() cannot refetch with
  // credentials from the account that is being discarded.
  clearAccountStorage();
  clearAccountCache(queryClient);
}

/** Replace any previous account state and persist a newly authenticated session. */
export function establishAuthenticatedSession(
  queryClient: QueryClient,
  tokens: SessionTokens,
): void {
  clearAuthenticatedSession(queryClient);
  localStorage.setItem('token', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}
