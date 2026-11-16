'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import api from '@/lib/api';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { UserRole } from '@/types';

/**
 * Permission enum values matching the backend AssistantPermission.
 */
export enum AssistantPermission {
  PATIENT_INFO_READ = 'PATIENT_INFO_READ',
  PATIENT_INFO_WRITE = 'PATIENT_INFO_WRITE',
  HEALTH_HISTORY_READ = 'HEALTH_HISTORY_READ',
  HEALTH_HISTORY_WRITE = 'HEALTH_HISTORY_WRITE',
  VITAL_SIGNS_READ = 'VITAL_SIGNS_READ',
  VITAL_SIGNS_WRITE = 'VITAL_SIGNS_WRITE',
  RECORDS_READ = 'RECORDS_READ',
  RECORDS_WRITE = 'RECORDS_WRITE',
  DOCUMENTS_READ = 'DOCUMENTS_READ',
  DOCUMENTS_WRITE = 'DOCUMENTS_WRITE',
}

interface DoctorAssignment {
  assignment_id: string;
  doctor_id: string;
  doctor_first_name: string | null;
  doctor_last_name: string | null;
  health_center_id: string;
  health_center_name: string;
  permissions: string[];
  is_active: boolean;
}

/**
 * Hook for assistant permission checking.
 *
 * - Doctors always have all permissions (returns true for everything)
 * - Patients have no clinical permissions
 * - Assistants: permissions are loaded from their active assignments
 *
 * RECORDS_READ/WRITE automatically grants DOCUMENTS_READ/WRITE.
 */
export function useAssistantPermissions() {
  const { data: user } = useCurrentUser();
  const isDoctor = user?.role === UserRole.DOCTOR;
  const isAssistant = user?.role === UserRole.ASSISTANT;

  // Only load assignments for assistants
  const { data: assignments = [] } = useQuery<DoctorAssignment[]>({
    queryKey: ['assistant', 'my-doctors'],
    queryFn: async () => {
      const res = await api.get('/assistant/my-doctors');
      return res.data;
    },
    enabled: isAssistant,
    staleTime: 5 * 60 * 1000,
  });

  // Collect all permissions across active assignments
  const allPermissions = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.is_active) {
      for (const p of assignment.permissions) {
        allPermissions.add(p);
      }
    }
  }

  // Apply cascading: RECORDS → DOCUMENTS
  if (allPermissions.has(AssistantPermission.RECORDS_READ)) {
    allPermissions.add(AssistantPermission.DOCUMENTS_READ);
  }
  if (allPermissions.has(AssistantPermission.RECORDS_WRITE)) {
    allPermissions.add(AssistantPermission.DOCUMENTS_WRITE);
  }

  const hasPermission = useCallback(
    (permission: AssistantPermission): boolean => {
      if (isDoctor) return true; // Doctors have all permissions
      if (!isAssistant) return false;
      return allPermissions.has(permission);
    },
    [isDoctor, isAssistant, allPermissions],
  );

  const hasAnyPermission = useCallback(
    (...permissions: AssistantPermission[]): boolean => {
      return permissions.some((p) => hasPermission(p));
    },
    [hasPermission],
  );

  return {
    hasPermission,
    hasAnyPermission,
    permissions: allPermissions,
    assignments,
    isDoctor,
    isAssistant,
  };
}
