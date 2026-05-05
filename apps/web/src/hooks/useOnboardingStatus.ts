import { useMemo } from 'react';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import { usePatientProfile } from '@/hooks/queries/usePatientProfile';
import { UserRole } from '@/types';

const LS_KEY_TOUR = 'mhat_tour_completed';
const LS_KEY_SETUP = 'mhat_setup_completed';

export interface OnboardingStatus {
  /** Profile is missing core fields (first_name, sex, date_of_birth) */
  isNewUser: boolean;
  /** All core personal fields are filled */
  isProfileComplete: boolean;
  /** Has at least 1 condition, allergy, or medication */
  isHealthHistoryStarted: boolean;
  /** User has completed the product tour */
  hasCompletedTour: boolean;
  /** User has completed (or skipped) the setup wizard */
  hasCompletedSetup: boolean;
  /** 0-100 profile completion percentage */
  completionPercentage: number;
  /** Still loading user/profile data */
  isLoading: boolean;
}

function getLocalFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(key) === 'true';
}

export function setTourCompleted() {
  localStorage.setItem(LS_KEY_TOUR, 'true');
}

export function setSetupCompleted() {
  localStorage.setItem(LS_KEY_SETUP, 'true');
}

export function resetOnboarding() {
  localStorage.removeItem(LS_KEY_TOUR);
  localStorage.removeItem(LS_KEY_SETUP);
}

export function useOnboardingStatus(): OnboardingStatus {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = usePatientProfile();

  return useMemo(() => {
    const isLoading = userLoading || profileLoading;

    if (isLoading || !user || user.role !== UserRole.PATIENT) {
      return {
        isNewUser: false,
        isProfileComplete: false,
        isHealthHistoryStarted: false,
        hasCompletedTour: getLocalFlag(LS_KEY_TOUR),
        hasCompletedSetup: getLocalFlag(LS_KEY_SETUP),
        completionPercentage: 0,
        isLoading,
      };
    }

    // Core fields check
    const hasName = !!(user.first_name && user.last_name);
    const hasSex = !!user.sex;
    const hasDob = !!profile?.date_of_birth;
    const hasPhone = !!profile?.phone;
    const hasDni = !!profile?.dni;
    const hasBloodType = !!profile?.blood_type;
    const hasAddress = !!profile?.address;

    const isNewUser = !hasName || !hasSex || !hasDob;
    const coreFields = [hasName, hasSex, hasDob, hasPhone, hasDni, hasBloodType, hasAddress];
    const filledCount = coreFields.filter(Boolean).length;
    const completionPercentage = Math.round((filledCount / coreFields.length) * 100);
    const isProfileComplete = filledCount === coreFields.length;

    // Health history
    const hasConditions = (profile?.conditions?.length ?? 0) > 0;
    const hasAllergies = (profile?.allergies?.length ?? 0) > 0;
    const hasMeds = (profile?.medications?.length ?? 0) > 0;
    const isHealthHistoryStarted = hasConditions || hasAllergies || hasMeds;

    return {
      isNewUser,
      isProfileComplete,
      isHealthHistoryStarted,
      hasCompletedTour: getLocalFlag(LS_KEY_TOUR),
      hasCompletedSetup: getLocalFlag(LS_KEY_SETUP),
      completionPercentage,
      isLoading: false,
    };
  }, [user, profile, userLoading, profileLoading]);
}
