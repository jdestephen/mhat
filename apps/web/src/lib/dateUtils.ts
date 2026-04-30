/**
 * Compute a human-readable age label from an ISO date-of-birth string.
 *
 * - Under 6 months  → weeks  (e.g. "12 semanas")
 * - Under 2 years   → months (e.g. "14 meses")
 * - 2 years or more → years  (e.g. "34 años")
 *
 * Returns `null` if the input is undefined/empty.
 */
export function computeAge(dob: string | undefined | null): string | null {
  if (!dob) return null;

  const birth = new Date(dob);
  const today = new Date();

  // Total difference in milliseconds → approximate days
  const diffMs = today.getTime() - birth.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (totalDays < 0) return null;

  // Under ~6 months (182 days) → show weeks
  if (totalDays < 182) {
    const weeks = Math.floor(totalDays / 7);
    return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }

  // Under 2 years → show months
  let months =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth());
  if (today.getDate() < birth.getDate()) months--;

  if (months < 24) {
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  // 2+ years → show years
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    years--;
  }
  return `${years} ${years === 1 ? 'año' : 'años'}`;
}
