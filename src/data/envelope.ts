// The movement envelope (M3-50, U-021, U-023): how far and how high he gets, in metres, measured from the sim by
// tests/sim/envelope.test.ts, which fails when a movement change moves a number by more than 0.1 m. Generators and
// hand-made layouts read it to size gaps, walls, lips and drops (DESIGN section 3 shows the table).
// max: the most that succeeds with ideal input (the best timing found, Space held through every jump), to 0.05 m.
// comfortable: the most that succeeds with sloppy input: gaps taken off 0.4 m before the edge, every timed Space
// (a kick, a wall-run) or a lache's release 3 ticks late, and grabs at a lip aimed 0.1 m low on the wall; where none
// of that changes the outcome (jump heights, hops, mantles, slides and drops) it is 90% of max.
export const ENVELOPE = {
  /** Gap cleared flat to flat from standing still at the edge, W and Space held (he hops onto the far edge from up to 1 m low). */
  standingJump: { comfortable: 2.35, max: 2.75 },
  /** Gap cleared from a sprint to a standing landing, Space held through the flight. */
  runningJump: { comfortable: 6.05, max: 6.55 },
  /** Highest rise of the feet in a jump from standing, Space held. */
  standingJumpHeight: { comfortable: 0.55, max: 0.61 },
  /** Highest rise of the feet in a jump from a sprint, Space held. */
  runningJumpHeight: { comfortable: 0.55, max: 0.61 },
  /** Highest ledge he gets onto from standing at it with W and Space held and no hands: a jump, then a hop from the air. */
  hop: { comfortable: 1.35, max: 1.5 },
  /** Highest lip grabbed from standing (LMB, looking at it) and pulled over with W. */
  mantleStanding: { comfortable: 1.98, max: 2.2 },
  /** Highest lip grabbed after a jump from standing and pulled over with W. */
  mantleJump: { comfortable: 2.52, max: 2.8 },
  /** Highest wall top taken from a sprint: a jump 2.4 m out, Space 0.55 m from the wall looking up it, a grab, W. */
  wallKick: { comfortable: 3.8, max: 3.85 },
  /** Gap crossed along a wall beside it: sprint, jump at the edge, Space 0.8 s later runs along the wall, Space held. */
  wallRun: { comfortable: 12.7, max: 13.3 },
  /** Distance slid on the flat from Ctrl at a full sprint until he gets up. */
  slideFlat: { comfortable: 5.97, max: 6.63 },
  /** Distance slid from a sprint down a 0.2 grade (from about 0.36 a slide never slows: it runs to the bottom). */
  slideDownhill: { comfortable: 13.36, max: 14.84 },
  /** Highest ledge he walks off without harm. */
  safeDrop: { comfortable: 3.6, max: 4 },
  /** Highest ledge he walks off without harm, rolling (Ctrl just before landing). */
  safeDropRoll: { comfortable: 6.3, max: 7 },
  /** Highest drop onto rubbish bags, bins or cardboard (MAT.soft) without harm. */
  softDropBags: { comfortable: 7.2, max: 8 },
  /** Highest drop onto an awning or a tarp (MAT.cloth) without harm. */
  softDropAwning: { comfortable: 7.2, max: 8 },
  /** Spacing of two bars 2.15 m up crossed by pumping a swing on one and letting go on the way up to catch the other. */
  lache: { comfortable: 6.05, max: 6.2 },
  /** Highest lip taken between walls 2 m apart: a jump, a kick off each wall looking up and ahead, a grab, W. */
  jumpTwoKicks: { comfortable: 5.85, max: 5.95 },
  /** Furthest ledge with its lip 3 m up taken behind him: jump at a wall, kick up it, kick back off it looking up, grab. */
  jumpBackGrab: { comfortable: 8.6, max: 8.65 },
  /** Gap crossed by a wall-run ended 0.85 s in by a kick off the wall looking up and ahead, Space held. */
  wallRunKick: { comfortable: 18.05, max: 18.15 },
  /** runningJump holding an item (the hands can't grab, the legs work as ever). */
  runningJumpItem: { comfortable: 6.05, max: 6.55 },
  /** wallRun holding an item. */
  wallRunItem: { comfortable: 12.7, max: 13.3 },
};
