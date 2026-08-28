export const MRT_SHARE_DURATIONS = [
  { hours: 24, label: "24 hours" },
  { hours: 168, label: "7 days" },
  { hours: 720, label: "30 days" },
] as const;

export type MrtShareDurationHours = (typeof MRT_SHARE_DURATIONS)[number]["hours"];

export type MrtAudienceSharePublic = {
  id: string;
  audience: string;
  enabled: boolean;
  expiresAt: string;
  updatedAt: string;
};

export type MrtGuestActivity = {
  at: string;
  name: string;
  ip: string;
  userAgent: string;
  action: string;
  audience?: string;
};
