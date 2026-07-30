// Fixed enum so every export/filter in Excel stays consistent.
export const POSITIONS = [
  "Prop",
  "Hooker",
  "Lock",
  "Flank",
  "Number 8",
  "Scrumhalf",
  "Flyhalf",
  "Center",
  "Wing",
  "Fullback",
] as const;

export type Position = (typeof POSITIONS)[number];
