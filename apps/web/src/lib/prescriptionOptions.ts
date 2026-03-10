// Prescription form predefined options
// Source of truth for dosage, frequency, route, and duration selectors

export const DOSAGE_QUANTITIES = [
  '0.25', '0.5', '1', '1.5', '2', '2.5', '3', '4', '5',
  '7.5', '10', '12.5', '15', '20', '25', '30', '40', '50',
  '75', '100', '150', '200', '250', '300', '400', '500',
  '600', '750', '800', '1000',
];

export const DOSAGE_UNITS = [
  { value: 'mg', label: 'mg' },
  { value: 'g', label: 'g' },
  { value: 'mcg', label: 'mcg' },
  { value: 'mL', label: 'mL' },
  { value: 'UI', label: 'UI' },
  { value: 'gotas', label: 'Gotas' },
  { value: 'tableta', label: 'Tableta(s)' },
  { value: 'cápsula', label: 'Cápsula(s)' },
  { value: 'cucharadita', label: 'Cucharadita (5mL)' },
  { value: 'cucharada', label: 'Cucharada (15mL)' },
  { value: 'ampolla', label: 'Ampolla(s)' },
  { value: 'supositorio', label: 'Supositorio(s)' },
  { value: 'parche', label: 'Parche(s)' },
  { value: 'inhalación', label: 'Inhalación(es)' },
  { value: 'aplicación', label: 'Aplicación(es)' },
];

export interface FrequencyGroup {
  group: string;
  options: { value: string; label: string }[];
}

export const FREQUENCY_OPTIONS: FrequencyGroup[] = [
  {
    group: 'Por horas',
    options: [
      { value: 'Cada 4 horas', label: 'Cada 4 horas (6 veces/día)' },
      { value: 'Cada 6 horas', label: 'Cada 6 horas (4 veces/día)' },
      { value: 'Cada 8 horas', label: 'Cada 8 horas (3 veces/día)' },
      { value: 'Cada 12 horas', label: 'Cada 12 horas (2 veces/día)' },
      { value: 'Cada 24 horas', label: 'Cada 24 horas (1 vez/día)' },
    ],
  },
  {
    group: 'Por día',
    options: [
      { value: 'Una vez al día', label: 'Una vez al día' },
      { value: 'Dos veces al día', label: 'Dos veces al día' },
      { value: 'Tres veces al día', label: 'Tres veces al día' },
    ],
  },
  {
    group: 'Semanal / Mensual',
    options: [
      { value: 'Cada 48 horas', label: 'Cada 48 horas' },
      { value: 'Una vez a la semana', label: 'Una vez a la semana' },
      { value: 'Cada 2 semanas', label: 'Cada 2 semanas' },
      { value: 'Una vez al mes', label: 'Una vez al mes' },
    ],
  },
  {
    group: 'Relativa a comidas',
    options: [
      { value: 'Antes de cada comida', label: 'Antes de cada comida' },
      { value: 'Después de cada comida', label: 'Después de cada comida' },
      { value: 'En ayunas', label: 'En ayunas' },
    ],
  },
  {
    group: 'Otras',
    options: [
      { value: 'Al acostarse', label: 'Al acostarse' },
      { value: 'Según necesidad (PRN)', label: 'Según necesidad (PRN)' },
      { value: 'Dosis única', label: 'Dosis única' },
    ],
  },
];

export const ROUTE_OPTIONS = [
  { value: 'oral', label: 'Oral' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'intramuscular', label: 'Intramuscular (IM)' },
  { value: 'intravenosa', label: 'Intravenosa (IV)' },
  { value: 'subcutánea', label: 'Subcutánea (SC)' },
  { value: 'tópica', label: 'Tópica' },
  { value: 'rectal', label: 'Rectal' },
  { value: 'oftálmica', label: 'Oftálmica' },
  { value: 'ótica', label: 'Ótica' },
  { value: 'nasal', label: 'Nasal' },
  { value: 'inhalatoria', label: 'Inhalatoria' },
  { value: 'transdérmica', label: 'Transdérmica' },
  { value: 'vaginal', label: 'Vaginal' },
];

export const DURATION_QUANTITIES = [
  '1', '2', '3', '4', '5', '6', '7', '8', '10', '14', '15',
  '21', '28', '30', '60', '90',
];

export const DURATION_UNITS = [
  { value: 'días', label: 'Día(s)' },
  { value: 'semanas', label: 'Semana(s)' },
  { value: 'meses', label: 'Mes(es)' },
  { value: 'dosis', label: 'Dosis' },
];
