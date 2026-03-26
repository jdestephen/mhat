/**
 * Vital Signs Range Utilities
 *
 * Clinically-standard ranges for adult vital signs.
 * Returns a Tailwind text color class based on whether
 * the value is normal, borderline, or critical.
 */

type RangeStatus = 'normal' | 'warning' | 'critical';

interface RangeDef {
  criticalLow?: number;
  warningLow?: number;
  warningHigh?: number;
  criticalHigh?: number;
}

const RANGES: Record<string, RangeDef> = {
  heart_rate:         { criticalLow: 50, warningLow: 60, warningHigh: 100, criticalHigh: 120 },
  systolic_bp:        { criticalLow: 80, warningLow: 90, warningHigh: 140, criticalHigh: 180 },
  diastolic_bp:       { criticalLow: 50, warningLow: 60, warningHigh: 90,  criticalHigh: 120 },
  temperature:        { criticalLow: 35, warningLow: 36, warningHigh: 37.5, criticalHigh: 38.5 },
  respiratory_rate:   { criticalLow: 8,  warningLow: 12, warningHigh: 20,  criticalHigh: 30 },
  oxygen_saturation:  { criticalLow: 90, warningLow: 94 },
  blood_glucose:      { criticalLow: 54, warningLow: 70, warningHigh: 140, criticalHigh: 200 },
};

const STATUS_COLORS: Record<RangeStatus, string> = {
  normal:   'text-slate-700',
  warning:  'text-amber-600',
  critical: 'text-red-600',
};

function getStatus(value: number, range: RangeDef): RangeStatus {
  if (range.criticalLow != null && value < range.criticalLow) return 'critical';
  if (range.criticalHigh != null && value > range.criticalHigh) return 'critical';
  if (range.warningLow != null && value < range.warningLow) return 'warning';
  if (range.warningHigh != null && value > range.warningHigh) return 'warning';
  return 'normal';
}

/**
 * Returns a Tailwind text color class for a vital sign value.
 *
 * @param key   Field name from VitalSigns (e.g. 'heart_rate', 'systolic_bp')
 * @param value The numeric value (null/undefined returns default color)
 *
 * @example
 * <span className={getVitalColor('heart_rate', 120)}>120 bpm</span>
 */
export function getVitalColor(key: string, value: number | null | undefined): string {
  if (value == null) return STATUS_COLORS.normal;
  const range = RANGES[key];
  if (!range) return STATUS_COLORS.normal;
  return STATUS_COLORS[getStatus(value, range)];
}

/**
 * Returns a Tailwind color class for a blood-pressure pair.
 * Uses the worst status between systolic and diastolic.
 */
export function getBpColor(
  systolic: number | null | undefined,
  diastolic: number | null | undefined,
): string {
  const sStatus = systolic != null ? getStatus(systolic, RANGES.systolic_bp) : 'normal';
  const dStatus = diastolic != null ? getStatus(diastolic, RANGES.diastolic_bp) : 'normal';

  const priority: RangeStatus[] = ['critical', 'warning', 'normal'];
  const worst = priority.find((s) => s === sStatus || s === dStatus) ?? 'normal';
  return STATUS_COLORS[worst];
}
