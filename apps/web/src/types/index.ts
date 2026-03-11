export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
}

export enum Sex {
  MASCULINO = 'MASCULINO',
  FEMENINO = 'FEMENINO',
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
  dni?: string;
  phone?: string;
  address?: string;
  medications?: Medication[];
  allergies?: Allergy[];
  conditions?: Condition[];
  personal_references?: PersonalReference[];
  health_habit?: HealthHabit | null;
  family_history?: FamilyHistoryCondition[];
}

export enum RelationshipType {
  PADRE = 'PADRE',
  MADRE = 'MADRE',
  HERMANO_A = 'HERMANO_A',
  ESPOSO_A = 'ESPOSO_A',
  HIJO_A = 'HIJO_A',
  TIO_A = 'TIO_A',
  ABUELO_A = 'ABUELO_A',
  AMIGO_A = 'AMIGO_A',
  GUARDIAN = 'GUARDIAN',
  OTRO = 'OTRO',
}

export interface PersonalReference {
  id: number;
  patient_profile_id: string;
  name: string;
  phone: string;
  relationship_type: RelationshipType;
}

// Health Habits
export enum TobaccoUse {
  NEVER = 'NEVER',
  EX_SMOKER = 'EX_SMOKER',
  OCCASIONAL = 'OCCASIONAL',
  ACTIVE = 'ACTIVE',
}

export enum AlcoholUse {
  NONE = 'NONE',
  OCCASIONAL = 'OCCASIONAL',
  SOCIAL = 'SOCIAL',
  FREQUENT = 'FREQUENT',
}

export enum PhysicalActivity {
  SEDENTARY = 'SEDENTARY',
  ONE_TWO = 'ONE_TWO',
  THREE_FOUR = 'THREE_FOUR',
  FIVE_PLUS = 'FIVE_PLUS',
}

export enum DietType {
  BALANCED = 'BALANCED',
  HIGH_CARB = 'HIGH_CARB',
  HIGH_FAT = 'HIGH_FAT',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  OTHER = 'OTHER',
}

export interface HealthHabit {
  id: number;
  patient_profile_id: string;
  tobacco_use?: TobaccoUse | null;
  cigarettes_per_day?: number | null;
  years_smoking?: number | null;
  years_since_quit?: number | null;
  alcohol_use?: AlcoholUse | null;
  drinks_per_week?: number | null;
  drug_use?: boolean | null;
  drug_type?: string | null;
  drug_frequency?: string | null;
  physical_activity?: PhysicalActivity | null;
  diet?: DietType | null;
  sleep_hours?: number | null;
  sleep_problems?: boolean | null;
  observations?: string | null;
}

// Family History
export enum FamilyMemberType {
  PADRE = 'PADRE',
  MADRE = 'MADRE',
  HERMANO_A = 'HERMANO_A',
  ABUELO_PATERNO = 'ABUELO_PATERNO',
  ABUELA_PATERNA = 'ABUELA_PATERNA',
  ABUELO_MATERNO = 'ABUELO_MATERNO',
  ABUELA_MATERNA = 'ABUELA_MATERNA',
  TIO_A = 'TIO_A',
  OTRO = 'OTRO',
}

export interface FamilyHistoryCondition {
  id: number;
  patient_profile_id: string;
  condition_name: string;
  family_members: string[];
  notes?: string | null;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  date_of_birth?: string;
  degree?: string;
  short_bio?: string;
  dni?: string;
  phone?: string;
  college_number?: string;
  address?: string;
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

export interface VitalSigns {
  id: string;
  patient_id: string;
  medical_record_id?: string;
  heart_rate?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  blood_glucose?: number;
  waist_circumference?: number;
  notes?: string;
  measured_at: string;
  created_by: string;
  created_at: string;
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
  vital_signs?: VitalSigns;
}

export enum AllergyType {
  MEDICATION = 'MEDICATION',
  FOOD = 'FOOD',
  SUBSTANCE = 'SUBSTANCE',
  OTHER = 'OTHER',
}

export enum AllergySeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  UNKNOWN = 'UNKNOWN',
}

export enum AllergySource {
  DOCTOR = 'DOCTOR',
  SUSPECTED = 'SUSPECTED',
  NOT_SURE = 'NOT_SURE',
}

export enum AllergyStatus {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
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
  ACTIVE = 'ACTIVE',
  CONTROLLED = 'CONTROLLED',
  RESOLVED = 'RESOLVED',
  UNKNOWN = 'UNKNOWN',
}

export enum ConditionSource {
  DOCTOR = 'DOCTOR',
  SUSPECTED = 'SUSPECTED',
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

