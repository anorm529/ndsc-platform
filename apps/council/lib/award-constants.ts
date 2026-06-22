export const AWARD_TYPES = [
  "Male MVP",
  "Female MVP",
  "Spirit Award",
  "Golden Glove",
  "Captains Choice",
  "Rookie",
] as const;

export type AwardType = (typeof AWARD_TYPES)[number];
