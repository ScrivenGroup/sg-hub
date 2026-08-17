export type CatalogDam = {
  id: string;
  name: string;
  ciYears: number[];
  srYears: number[];
  ai: boolean;
};

const RAW: (Omit<CatalogDam, "id"> & { id: number })[] = [
  { id: 36, name: "Leslie Dam", ciYears: [2024, 2029, 2034, 2039, 2044], srYears: [2039], ai: true },
  { id: 219, name: "Bjelke-Petersen Dam", ciYears: [2024, 2029, 2034, 2039, 2044], srYears: [2024, 2044], ai: true },
  { id: 227, name: "Boondooma Dam", ciYears: [2024, 2029, 2034, 2039, 2044], srYears: [2039], ai: true },
  { id: 236, name: "Burdekin Falls Dam", ciYears: [2022, 2027, 2032, 2037, 2042], srYears: [2022, 2042], ai: true },
  { id: 239, name: "Callide Dam", ciYears: [2024, 2029, 2034, 2039, 2044], srYears: [2039], ai: true },
  { id: 242, name: "Cania Dam", ciYears: [2024, 2029, 2034, 2039, 2044], srYears: [2039], ai: true },
  { id: 254, name: "Coolmunda Dam", ciYears: [2020, 2025, 2030, 2035, 2040, 2045], srYears: [2020, 2040], ai: true },
  { id: 266, name: "Eungella Dam", ciYears: [2024, 2029, 2034, 2039, 2044], srYears: [], ai: false },
  { id: 268, name: "E J Beardmore Dam", ciYears: [2023, 2028, 2033, 2038, 2043], srYears: [2023, 2043], ai: true },
  { id: 269, name: "Fairbairn Dam", ciYears: [2023, 2028, 2033, 2038, 2043], srYears: [2038], ai: true },
  { id: 272, name: "Fred Haigh Dam", ciYears: [2021, 2026, 2031, 2036, 2041, 2046], srYears: [2039], ai: true },
  { id: 278, name: "Glenlyon Dam", ciYears: [2020, 2025, 2030, 2035, 2040, 2045], srYears: [2020, 2040], ai: true },
  { id: 297, name: "Julius Dam", ciYears: [2020, 2025, 2030, 2035, 2040, 2045], srYears: [2020, 2040], ai: false },
  { id: 301, name: "Kinchant Dam", ciYears: [2023, 2028, 2033, 2038, 2043], srYears: [2038], ai: true },
  { id: 340, name: "Peter Faust Dam", ciYears: [2024, 2029, 2034, 2039, 2044], srYears: [2024, 2044], ai: true },
  { id: 370, name: "Tinaroo Falls Dam", ciYears: [2024, 2029, 2034, 2039, 2044], srYears: [2029], ai: true },
  { id: 378, name: "Wuruma Dam", ciYears: [2022, 2027, 2032, 2037, 2042], srYears: [2022, 2042], ai: true },
  { id: 527, name: "Kroombit Dam", ciYears: [2021, 2026, 2031, 2036, 2041, 2046], srYears: [2021, 2041], ai: true },
  { id: 874, name: "Teemburra Dam", ciYears: [2020, 2025, 2030, 2035, 2040, 2045], srYears: [2035], ai: true },
  { id: 1997, name: "Paradise Dam", ciYears: [2021, 2026, 2031, 2036, 2041, 2046], srYears: [2021, 2041], ai: true },
  { id: 2031, name: "Woongarra Balancing Storage", ciYears: [2022, 2027, 2032, 2037, 2042], srYears: [2027], ai: false },
  { id: 2033, name: "Moura Offstream Storage", ciYears: [2022, 2027, 2032, 2037, 2042], srYears: [2027], ai: false },
  { id: 2233, name: "Isis Balancing Storage", ciYears: [2022, 2027, 2032, 2037, 2042], srYears: [], ai: false },
  { id: 2493, name: "West Barron Balancing Storage", ciYears: [2023, 2028, 2033, 2038, 2043], srYears: [], ai: false },
];

export const CATALOG_DAMS: CatalogDam[] = RAW.map((d) => ({
  ...d,
  id: String(d.id),
}));
