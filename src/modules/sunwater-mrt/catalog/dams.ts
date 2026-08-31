export type CatalogDam = {
  id: string;
  name: string;
  region: string;
  /** Annual Inspection applies (from condition schedules). */
  ai: boolean;
  /** First Comprehensive Inspection year in the source series (5-year cycle). */
  ciStartYear: number;
  /** First Safety Review year, if the dam has SR. */
  srStartYear: number | null;
};

/** Regions known from the 3-dam studio seed; others are Unassigned until staff edit. */
const KNOWN_REGION: Record<string, string> = {
  "268": "South West",
  "272": "Wide Bay",
  "370": "Far North",
};

function dam(
  id: number,
  name: string,
  ai: boolean,
  ciStartYear: number,
  srStartYear: number | null,
): CatalogDam {
  const sid = String(id);
  return {
    id: sid,
    name,
    region: KNOWN_REGION[sid] || "Unassigned",
    ai,
    ciStartYear,
    srStartYear,
  };
}

/** 24 dams from milestone-master `gantt-tool/data/dams.js`. */
export const CATALOG_DAMS: CatalogDam[] = [
  dam(36, "Leslie Dam", true, 2024, 2039),
  dam(219, "Bjelke-Petersen Dam", true, 2024, 2024),
  dam(227, "Boondooma Dam", true, 2024, 2039),
  dam(236, "Burdekin Falls Dam", true, 2022, 2022),
  dam(239, "Callide Dam", true, 2024, 2039),
  dam(242, "Cania Dam", true, 2024, 2039),
  dam(254, "Coolmunda Dam", true, 2020, 2020),
  dam(266, "Eungella Dam", false, 2024, null),
  dam(268, "E J Beardmore Dam", true, 2023, 2023),
  dam(269, "Fairbairn Dam", true, 2023, 2038),
  dam(272, "Fred Haigh Dam", true, 2021, 2039),
  dam(278, "Glenlyon Dam", true, 2020, 2020),
  dam(297, "Julius Dam", false, 2020, 2020),
  dam(301, "Kinchant Dam", true, 2023, 2038),
  dam(340, "Peter Faust Dam", true, 2024, 2024),
  dam(370, "Tinaroo Falls Dam", true, 2024, 2029),
  dam(378, "Wuruma Dam", true, 2022, 2022),
  dam(527, "Kroombit Dam", true, 2021, 2021),
  dam(874, "Teemburra Dam", true, 2020, 2035),
  dam(1997, "Paradise Dam", true, 2021, 2021),
  dam(2031, "Woongarra Balancing Storage", false, 2022, 2027),
  dam(2033, "Moura Offstream Storage", false, 2022, 2027),
  dam(2233, "Isis Balancing Storage", false, 2022, null),
  dam(2493, "West Barron Balancing Storage", false, 2023, null),
];
