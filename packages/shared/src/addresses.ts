/** The sub-cities of Addis Ababa, as they are stored in the database. */
export const SUB_CITIES = [
  'ADDIS_KETEMA',
  'AKAKY_KALITI',
  'ARADA',
  'BOLE',
  'GULLELE',
  'KIRKOS',
  'KOLFE_KERANIO',
  'LEMI_KURA',
  'LIDETA',
  'NIFAS_SILK_LAFTO',
  'YEKA',
] as const;

export type SubCity = (typeof SUB_CITIES)[number];

/** The name of a sub-city, the way it is shown to a person. */
export const SUB_CITY_LABELS: Record<SubCity, string> = {
  ADDIS_KETEMA: 'Addis Ketema',
  AKAKY_KALITI: 'Akaky Kaliti',
  ARADA: 'Arada',
  BOLE: 'Bole',
  GULLELE: 'Gullele',
  KIRKOS: 'Kirkos',
  KOLFE_KERANIO: 'Kolfe Keranio',
  LEMI_KURA: 'Lemi Kura',
  LIDETA: 'Lideta',
  NIFAS_SILK_LAFTO: 'Nifas Silk-Lafto',
  YEKA: 'Yeka',
};

/** The sub-cities, sorted the way they are shown in the address form. */
export const SORTED_SUB_CITIES: readonly SubCity[] = [...SUB_CITIES].sort((a, b) =>
  SUB_CITY_LABELS[a].localeCompare(SUB_CITY_LABELS[b]),
);
