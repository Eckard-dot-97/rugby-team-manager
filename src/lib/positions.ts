// Fixed enum so every export/filter in Excel stays consistent.
// Ordered and named to match the club's official BokSmart team sheet template.
export const POSITIONS = [
  "Loosehead Prop",
  "Hooker",
  "Tighthead Prop",
  "Loosehead Lock",
  "Tighthead Lock",
  "Loosehead Flank",
  "Tighthead Flank",
  "Eightman",
  "Scrumhalf",
  "Flyhalf",
  "Left Wing",
  "Inside Centre",
  "Outside Centre",
  "Right Wing",
  "Fullback",
] as const;

export type Position = (typeof POSITIONS)[number];

// Jersey number each position fills in a starting XV — a straight 1:1
// mapping now that Loosehead/Tighthead Lock are separate positions.
export const POSITION_SLOTS: Record<Position, number[]> = {
  "Loosehead Prop": [1],
  Hooker: [2],
  "Tighthead Prop": [3],
  "Loosehead Lock": [4],
  "Tighthead Lock": [5],
  "Loosehead Flank": [6],
  "Tighthead Flank": [7],
  Eightman: [8],
  Scrumhalf: [9],
  Flyhalf: [10],
  "Left Wing": [11],
  "Inside Centre": [12],
  "Outside Centre": [13],
  "Right Wing": [14],
  Fullback: [15],
};

