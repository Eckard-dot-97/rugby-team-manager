// Fixed enum so every export/filter in Excel stays consistent.
// Ordered to match standard rugby union jersey numbering.
export const POSITIONS = [
  "Loosehead Prop",
  "Hooker",
  "Tighthead Prop",
  "Lock",
  "Blindside Flanker",
  "Openside Flanker",
  "Number Eight",
  "Scrum-half",
  "Fly-half",
  "Inside Centre",
  "Outside Centre",
  "Left Wing",
  "Right Wing",
  "Full-back",
] as const;

export type Position = (typeof POSITIONS)[number];

// Jersey number(s) each position fills in a starting XV. Lock covers two
// slots (4 and 5) since a team needs two locks but it's one selectable
// position for parents. Slots sum to 15 — a full starting team.
export const POSITION_SLOTS: Record<Position, number[]> = {
  "Loosehead Prop": [1],
  Hooker: [2],
  "Tighthead Prop": [3],
  Lock: [4, 5],
  "Blindside Flanker": [6],
  "Openside Flanker": [7],
  "Number Eight": [8],
  "Scrum-half": [9],
  "Fly-half": [10],
  "Inside Centre": [12],
  "Outside Centre": [13],
  "Left Wing": [11],
  "Right Wing": [14],
  "Full-back": [15],
};

