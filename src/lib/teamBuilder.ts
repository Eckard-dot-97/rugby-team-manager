import { POSITIONS, POSITION_SLOTS, type Position } from "./positions";

export type Slot = { jerseyNumber: number; position: Position };
export type CandidateChild = {
  childId: number;
  name: string;
  eligiblePositions: Position[];
};

// All 15 jersey slots in a standard starting XV, ordered by number.
export function buildTeamSlots(): Slot[] {
  const slots: Slot[] = [];
  for (const position of POSITIONS) {
    for (const jerseyNumber of POSITION_SLOTS[position]) {
      slots.push({ jerseyNumber, position });
    }
  }
  return slots.sort((a, b) => a.jerseyNumber - b.jerseyNumber);
}

// Maximum bipartite matching (Kuhn's algorithm) between slots and children,
// so as many of the 15 slots get filled as possible given who's eligible
// for what. Small scale (15 slots, a few dozen children at most) so a
// straightforward augmenting-path approach is plenty fast.
export function assignTeam(slots: Slot[], children: CandidateChild[]): Map<number, number> {
  const slotToChildren: number[][] = slots.map((slot) =>
    children
      .map((c, i) => (c.eligiblePositions.includes(slot.position) ? i : -1))
      .filter((i) => i !== -1)
  );

  const matchChild: number[] = new Array(children.length).fill(-1); // child index -> slot index
  const matchSlot: number[] = new Array(slots.length).fill(-1); // slot index -> child index

  function tryAssign(slotIndex: number, visited: boolean[]): boolean {
    for (const childIndex of slotToChildren[slotIndex]) {
      if (visited[childIndex]) continue;
      visited[childIndex] = true;
      if (matchChild[childIndex] === -1 || tryAssign(matchChild[childIndex], visited)) {
        matchChild[childIndex] = slotIndex;
        matchSlot[slotIndex] = childIndex;
        return true;
      }
    }
    return false;
  }

  for (let s = 0; s < slots.length; s++) {
    const visited = new Array(children.length).fill(false);
    tryAssign(s, visited);
  }

  const result = new Map<number, number>(); // jerseyNumber -> childId
  matchSlot.forEach((childIndex, slotIndex) => {
    if (childIndex !== -1) {
      result.set(slots[slotIndex].jerseyNumber, children[childIndex].childId);
    }
  });
  return result;
}
