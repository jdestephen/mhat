export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
}

export enum Sex {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  sex?: Sex;
  city?: string;
  country?: string;
  is_active: boolean;
  role: UserRole;
}

export enum MedicationStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  STOPPED = 'STOPPED',
  ON_HOLD = 'ON_HOLD',
  ENTERED_IN_ERROR = 'ENTERED_IN_ERROR',
  NOT_TAKEN = 'NOT_TAKEN',
}

export enum MedicationSource {
  PRESCRIBED = 'PRESCRIBED',
  OTC = 'OTC',
  SELF_REPORTED = 'SELF_REPORTED',
  TRANSFERRED = 'TRANSFERRED',
}

export enum DiagnosisRank {
  PRIMARY = 1,
  SECONDARY = 2,
  TERTIARY = 3,
  QUATERNARY = 4,
  QUINARY = 5,
}

export enum DiagnosisStatus {
  CONFIRMED = 'CONFIRMED',
  PROVISIONAL = 'PROVISIONAL',
  DIFFERENTIAL = 'DIFFERENTIAL',
  REFUTED = 'REFUTED',
  ENTERED_IN_ERROR = 'ENTERED_IN_ERROR',
}

export interface Medication {
  id: number;
  patient_profile_id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  status: MedicationStatus;
  status_reason?: string;
  start_date?: string;
  end_date?: string;
  source: MedicationSource;
  prescribed_by_id?: string;
  external_prescriber_name?: string;
  condition_id?: number;
  instructions?: string;
  notes?: string;
  recorded_at: string;
  created_by_id: string;
  updated_at?: string;
}

export interface PatientProfile {
  id: string;
  user_id: string;
  date_of_birth?: string;
  blood_type?: string;
  medications?: Medication[];
  allergies?: Allergy[];
  conditions?: Condition[];
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  date_of_birth?: string;
  degree?: string;
  short_bio?: string;
  workplaces?: string[];
}

export interface Document {
  id: string;
  medical_record_id: string;
  s3_key: string;
  filename: string;
  url: string;
  media_type: string;
  tags?: string[];
  ocr_text?: string;
  created_at: string;
}

export enum RecordStatus {
  UNVERIFIED = 'UNVERIFIED',
  BACKED_BY_DOCUMENT = 'BACKED_BY_DOCUMENT',
  VERIFIED = 'VERIFIED',
}

export interface MedicalDiagnosis {
  id?: string;
  medical_record_id?: string;
  diagnosis: string;
  diagnosis_code?: string | null;
  diagnosis_code_system?: string | null;
  rank: number;
  status: DiagnosisStatus;
  notes?: string | null;
  created_at?: string;
  created_by?: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  motive: string;
  notes?: string;
  category_id?: string;
  category?: { id: number; name: string };
  tags?: string[];
  status: RecordStatus;
  diagnoses: MedicalDiagnosis[];
  created_by: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  documents?: Document[];
  brief_history?: string;
  has_red_flags?: boolean;
  red_flags?: string[];
  key_finding?: string;
  clinical_impression?: string;
  actions_today?: string[];
  plan_bullets?: string[];
  follow_up_interval?: string;
  follow_up_with?: string;
  patient_instructions?: string;
  prescriptions?: Prescription[];
  clinical_orders?: ClinicalOrder[];
}

export enum AllergyType {
  MEDICATION = 'medication',
  FOOD = 'food',
  SUBSTANCE = 'substance',
  OTHER = 'other',
}

export enum AllergySeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  UNKNOWN = 'unknown',
}

export enum AllergySource {
  DOCTOR = 'doctor',
  SUSPECTED = 'suspected',
  NOT_SURE = 'not_sure',
}

export enum AllergyStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
}

export interface Allergy {
  id: number;
  patient_profile_id: string;
  verified_by?: string;
  verified_at?: string;
  allergen: string;
  code: string;
  code_system: string;
  type: AllergyType;
  reaction?: string;
  severity: AllergySeverity;
  source: AllergySource;
  status: AllergyStatus;
  created_at: string;
  deleted: boolean;
  deleted_at?: string;
}

export enum ConditionStatus {
  ACTIVE = 'active',
  CONTROLLED = 'controlled',
  RESOLVED = 'resolved',
  UNKNOWN = 'unknown',
}

export enum ConditionSource {
  DOCTOR = 'doctor',
  SUSPECTED = 'suspected',
}

export interface Condition {
  id: number;
  verified_by?: string;
  verified_at?: string;
  patient_profile_id: string;
  name: string;
  code: string;
  code_system: string;
  since_year?: string;
  status: ConditionStatus;
  source: ConditionSource;
  notes?: string;
  created_at: string;
  deleted: boolean;
  deleted_at?: string;
}

// ================================
// Doctor Workflow Types
// ================================

export enum AccessLevel {
  READ_ONLY = 'READ_ONLY',
  WRITE = 'WRITE',
}

export enum RecordSource {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  IMPORTED = 'IMPORTED',
}

export enum OrderType {
  LAB = 'LAB',
  IMAGING = 'IMAGING',
  REFERRAL = 'REFERRAL',
  PROCEDURE = 'PROCEDURE',
}

export enum OrderUrgency {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
}

export interface PatientAccess {
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  sex?: string;
  access_level: AccessLevel;
  granted_at: string;
}

export interface AccessInvitation {
  id: string;
  code: string;
  access_level: AccessLevel;
  access_type: 'PERMANENT' | 'TEMPORARY';
  expires_in_days?: number;
  code_expires_at: string;
  claimed_by?: string;
  claimed_at?: string;
  is_revoked: boolean;
  created_at: string;
}

export interface DoctorAccessInfo {
  access_id: string;
  doctor_id: string;
  doctor_name: string;
  specialty?: string;
  access_level: string;
  access_type: string;
  granted_at?: string;
}

export interface Prescription {
  id: string;
  medical_record_id: string;
  medication_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  quantity?: string;
  instructions?: string;
  created_at: string;
  created_by: string;
}

export interface ClinicalOrder {
  id: string;
  medical_record_id: string;
  order_type: OrderType;
  description: string;
  urgency: OrderUrgency;
  reason?: string;
  notes?: string;
  referral_to?: string;
  created_at: string;
  created_by: string;
}

// Extended medical record for doctor view
export interface DoctorMedicalRecord extends MedicalRecord {
  record_source: RecordSource;
  brief_history?: string;
  has_red_flags?: boolean;
  red_flags?: string[];
  key_finding?: string;
  clinical_impression?: string;
  actions_today?: string[];
  plan_bullets?: string[];
  follow_up_interval?: string;
  follow_up_with?: string;
  patient_instructions?: string;
  prescriptions?: Prescription[];
  clinical_orders?: ClinicalOrder[];
}

