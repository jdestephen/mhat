'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { UserRole } from '@/types';

const HC_STORAGE_KEY = 'numa_active_hc_id';

interface HealthCenterMembership {
  id: string;
  health_center_id: string;
  health_center_name: string;
  health_center_type: string;
  role: string;
  specialty: string | null;
  is_primary: boolean;
  verification_status: string;
}

/**
 * Hook to manage the doctor/assistant's active Health Center.
 *
 * - Loads HC memberships from the API
 * - Persists the active HC ID in localStorage
 * - Auto-selects primary HC on first load
 */
export function useActiveHealthCenter() {
  const { data: user } = useCurrentUser();
  const isClinicalUser =
    user?.role === UserRole.DOCTOR || user?.role === UserRole.ASSISTANT;

  const [activeHCId, setActiveHCIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(HC_STORAGE_KEY);
    }
    return null;
  });

  const { data: memberships = [], isLoading } = useQuery<HealthCenterMembership[]>({
    queryKey: ['health-centers', 'mine'],
    queryFn: async () => {
      const res = await api.get('/health-centers/mine');
      return res.data;
    },
    enabled: isClinicalUser,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-select primary HC on first load
  useEffect(() => {
    if (!memberships.length || activeHCId) return;

    const primary = memberships.find((m) => m.is_primary);
    const fallback = memberships[0];
    const selected = primary || fallback;

    if (selected) {
      setActiveHCIdState(selected.health_center_id);
      localStorage.setItem(HC_STORAGE_KEY, selected.health_center_id);
    }
  }, [memberships, activeHCId]);

  const setActiveHCId = useCallback((id: string) => {
    setActiveHCIdState(id);
    localStorage.setItem(HC_STORAGE_KEY, id);
  }, []);

  const activeHC = memberships.find(
    (m) => m.health_center_id === activeHCId,
  ) ?? null;

  return {
    activeHCId,
    activeHC,
    healthCenters: memberships,
    setActiveHCId,
    isLoading,
    hasHealthCenters: memberships.length > 0,
  };
}
