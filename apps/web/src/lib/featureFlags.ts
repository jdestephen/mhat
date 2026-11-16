/** Enable the doctor-facing assistant management page and navigation at build time. */
export const ASSISTANT_MANAGEMENT_ENABLED =
  process.env.NEXT_PUBLIC_ASSISTANT_MANAGEMENT_ENABLED === 'true';

/** Allow doctors to switch between clinical and personal patient mode. */
export const DOCTOR_PATIENT_MODE_ENABLED =
  process.env.NEXT_PUBLIC_DOCTOR_PATIENT_MODE_ENABLED === 'true';
