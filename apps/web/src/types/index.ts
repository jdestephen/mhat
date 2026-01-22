export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  country?: string;
  is_active: boolean;
  role: UserRole;
}

export interface Medication {
  id: number;
  patient_profile_id: string;
  name: string;
  dosage: string;
  frequency: string;
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
  UNVERIFIED = 'unverified',
  BACKED_BY_DOCUMENT = 'backed_by_document',
  VERIFIED = 'verified',
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  motive: string;
  diagnosis?: string;
  diagnosis_code?: string;
  diagnosis_code_system?: string;
  notes?: string;
  category_id?: string;
  category?: { id: number; name: string };
  tags?: string[];
  status: RecordStatus;
  created_by: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  documents?: Document[];
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
