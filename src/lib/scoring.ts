// Adjust if your league uses different scoring values.
export const TRY_POINTS = 5;
export const KICK_POINTS = 2;

export function calculatePoints(tries: number, kicksMade: number): number {
  return tries * TRY_POINTS + kicksMade * KICK_POINTS;
}
