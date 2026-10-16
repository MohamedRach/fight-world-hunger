/**
 * Country list used by the NGO feature, keyed by ISO 3166-1 alpha-3 code —
 * the convention adopted by the map/discovery feature (Developer 2, see
 * `NgoSummary.operatingCountryCodes` in src/features/discovery/types.ts).
 * Kosovo uses `XKX`, matching the discovery feature's provider override.
 * Used until a shared `Country` entity exists (see docs/DATABASE_SCHEMA.md).
 */
export const COUNTRIES: Record<string, string> = {
  AFG: "Afghanistan", ALB: "Albania", DZA: "Algeria", AGO: "Angola",
  ARG: "Argentina", ARM: "Armenia", AUS: "Australia", AUT: "Austria",
  AZE: "Azerbaijan", BGD: "Bangladesh", BLR: "Belarus", BEL: "Belgium",
  BLZ: "Belize", BEN: "Benin", BTN: "Bhutan", BOL: "Bolivia",
  BIH: "Bosnia and Herzegovina", BWA: "Botswana", BRA: "Brazil", BGR: "Bulgaria",
  BFA: "Burkina Faso", BDI: "Burundi", CPV: "Cabo Verde", KHM: "Cambodia",
  CMR: "Cameroon", CAN: "Canada", CAF: "Central African Republic", TCD: "Chad",
  CHL: "Chile", CHN: "China", COL: "Colombia", COM: "Comoros",
  COD: "Congo (DRC)", COG: "Congo (Republic)", CRI: "Costa Rica", CIV: "Côte d'Ivoire",
  HRV: "Croatia", CUB: "Cuba", CYP: "Cyprus", CZE: "Czechia",
  DNK: "Denmark", DJI: "Djibouti", DOM: "Dominican Republic", ECU: "Ecuador",
  EGY: "Egypt", SLV: "El Salvador", GNQ: "Equatorial Guinea", ERI: "Eritrea",
  EST: "Estonia", SWZ: "Eswatini", ETH: "Ethiopia", FIN: "Finland",
  FRA: "France", GAB: "Gabon", GMB: "Gambia", GEO: "Georgia",
  DEU: "Germany", GHA: "Ghana", GRC: "Greece", GTM: "Guatemala",
  GIN: "Guinea", GNB: "Guinea-Bissau", GUY: "Guyana", HTI: "Haiti",
  HND: "Honduras", HUN: "Hungary", ISL: "Iceland", IND: "India",
  IDN: "Indonesia", IRN: "Iran", IRQ: "Iraq", IRL: "Ireland",
  ISR: "Israel", ITA: "Italy", JAM: "Jamaica", JPN: "Japan",
  JOR: "Jordan", KAZ: "Kazakhstan", KEN: "Kenya", XKX: "Kosovo",
  KWT: "Kuwait", KGZ: "Kyrgyzstan", LAO: "Laos", LVA: "Latvia",
  LBN: "Lebanon", LSO: "Lesotho", LBR: "Liberia", LBY: "Libya",
  LTU: "Lithuania", LUX: "Luxembourg", MDG: "Madagascar", MWI: "Malawi",
  MYS: "Malaysia", MLI: "Mali", MRT: "Mauritania", MUS: "Mauritius",
  MEX: "Mexico", MDA: "Moldova", MNG: "Mongolia", MNE: "Montenegro",
  MAR: "Morocco", MOZ: "Mozambique", MMR: "Myanmar", NAM: "Namibia",
  NPL: "Nepal", NLD: "Netherlands", NZL: "New Zealand", NIC: "Nicaragua",
  NER: "Niger", NGA: "Nigeria", PRK: "North Korea", MKD: "North Macedonia",
  NOR: "Norway", OMN: "Oman", PAK: "Pakistan", PSE: "Palestine",
  PAN: "Panama", PNG: "Papua New Guinea", PRY: "Paraguay", PER: "Peru",
  PHL: "Philippines", POL: "Poland", PRT: "Portugal", QAT: "Qatar",
  ROU: "Romania", RUS: "Russia", RWA: "Rwanda", STP: "São Tomé and Príncipe",
  SAU: "Saudi Arabia", SEN: "Senegal", SRB: "Serbia", SLE: "Sierra Leone",
  SGP: "Singapore", SVK: "Slovakia", SVN: "Slovenia", SOM: "Somalia",
  ZAF: "South Africa", KOR: "South Korea", SSD: "South Sudan", ESP: "Spain",
  LKA: "Sri Lanka", SDN: "Sudan", SUR: "Suriname", SWE: "Sweden",
  CHE: "Switzerland", SYR: "Syria", TWN: "Taiwan", TJK: "Tajikistan",
  TZA: "Tanzania", THA: "Thailand", TLS: "Timor-Leste", TGO: "Togo",
  TUN: "Tunisia", TUR: "Türkiye", TKM: "Turkmenistan", UGA: "Uganda",
  UKR: "Ukraine", ARE: "United Arab Emirates", GBR: "United Kingdom",
  USA: "United States", URY: "Uruguay", UZB: "Uzbekistan", VEN: "Venezuela",
  VNM: "Vietnam", YEM: "Yemen", ZMB: "Zambia", ZWE: "Zimbabwe",
};

export const COUNTRY_CODES = Object.keys(COUNTRIES);

export function countryName(code: string): string {
  return COUNTRIES[code] ?? code;
}

export function isCountryCode(code: string): boolean {
  return code in COUNTRIES;
}
