export interface DoctorPrintSettings {
  name_override: string | null;
  degree_override: string | null;
  clinic_name: string | null;
  phone_1: string | null;
  phone_2: string | null;
  address: string | null;
  public_email: string | null;
  show_duration: boolean;
  paper_size: 'A4' | 'LETTER';
  default_name: string;
  default_degree: string | null;
  logo_present: boolean;
}
