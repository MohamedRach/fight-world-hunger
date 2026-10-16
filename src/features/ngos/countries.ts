/**
 * Static ISO 3166-1 alpha-2 country list used by the NGO feature until
 * Developer 2's `Country` entity exists (see docs/DATABASE_SCHEMA.md).
 * Intentionally scoped to this feature — not a shared module.
 */
export const COUNTRIES: Record<string, string> = {
  AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AO: "Angola",
  AR: "Argentina", AM: "Armenia", AU: "Australia", AT: "Austria",
  AZ: "Azerbaijan", BD: "Bangladesh", BY: "Belarus", BE: "Belgium",
  BJ: "Benin", BO: "Bolivia", BA: "Bosnia and Herzegovina", BW: "Botswana",
  BR: "Brazil", BG: "Bulgaria", BF: "Burkina Faso", BI: "Burundi",
  KH: "Cambodia", CM: "Cameroon", CA: "Canada", CF: "Central African Republic",
  TD: "Chad", CL: "Chile", CN: "China", CO: "Colombia",
  CD: "Congo (DRC)", CG: "Congo (Republic)", CR: "Costa Rica", CI: "Côte d'Ivoire",
  HR: "Croatia", CU: "Cuba", CY: "Cyprus", CZ: "Czechia",
  DK: "Denmark", DJ: "Djibouti", DO: "Dominican Republic", EC: "Ecuador",
  EG: "Egypt", SV: "El Salvador", ER: "Eritrea", EE: "Estonia",
  SZ: "Eswatini", ET: "Ethiopia", FI: "Finland", FR: "France",
  GA: "Gabon", GM: "Gambia", GE: "Georgia", DE: "Germany",
  GH: "Ghana", GR: "Greece", GT: "Guatemala", GN: "Guinea",
  GW: "Guinea-Bissau", HT: "Haiti", HN: "Honduras", HU: "Hungary",
  IS: "Iceland", IN: "India", ID: "Indonesia", IR: "Iran",
  IQ: "Iraq", IE: "Ireland", IL: "Israel", IT: "Italy",
  JM: "Jamaica", JP: "Japan", JO: "Jordan", KZ: "Kazakhstan",
  KE: "Kenya", KR: "South Korea", KW: "Kuwait", KG: "Kyrgyzstan",
  LA: "Laos", LV: "Latvia", LB: "Lebanon", LS: "Lesotho",
  LR: "Liberia", LY: "Libya", LT: "Lithuania", LU: "Luxembourg",
  MG: "Madagascar", MW: "Malawi", MY: "Malaysia", ML: "Mali",
  MR: "Mauritania", MX: "Mexico", MD: "Moldova", MN: "Mongolia",
  ME: "Montenegro", MA: "Morocco", MZ: "Mozambique", MM: "Myanmar",
  NA: "Namibia", NP: "Nepal", NL: "Netherlands", NZ: "New Zealand",
  NI: "Nicaragua", NE: "Niger", NG: "Nigeria", MK: "North Macedonia",
  NO: "Norway", OM: "Oman", PK: "Pakistan", PA: "Panama",
  PG: "Papua New Guinea", PY: "Paraguay", PE: "Peru", PH: "Philippines",
  PL: "Poland", PT: "Portugal", QA: "Qatar", RO: "Romania",
  RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia", SN: "Senegal",
  RS: "Serbia", SL: "Sierra Leone", SG: "Singapore", SK: "Slovakia",
  SI: "Slovenia", SO: "Somalia", ZA: "South Africa", SS: "South Sudan",
  ES: "Spain", LK: "Sri Lanka", SD: "Sudan", SE: "Sweden",
  CH: "Switzerland", SY: "Syria", TW: "Taiwan", TJ: "Tajikistan",
  TZ: "Tanzania", TH: "Thailand", TL: "Timor-Leste", TG: "Togo",
  TN: "Tunisia", TR: "Türkiye", TM: "Turkmenistan", UG: "Uganda",
  UA: "Ukraine", AE: "United Arab Emirates", GB: "United Kingdom",
  US: "United States", UY: "Uruguay", UZ: "Uzbekistan", VE: "Venezuela",
  VN: "Vietnam", YE: "Yemen", ZM: "Zambia", ZW: "Zimbabwe",
};

export const COUNTRY_CODES = Object.keys(COUNTRIES);

export function countryName(code: string): string {
  return COUNTRIES[code] ?? code;
}

export function isCountryCode(code: string): boolean {
  return code in COUNTRIES;
}
