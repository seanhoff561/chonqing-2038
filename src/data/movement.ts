// Movement tuning (DESIGN section 3). The sim reads every movement number from here.
export const movement = {
  width: 0.5,
  height: { stand: 1.75, crouch: 1.1, crawl: 0.5, hidden: 0.75 },
  eye: { stand: 1.62, crouch: 0.98, crawl: 0.38, hidden: 0.55 },
  speed: { jog: 3.2, sprint: 7.0, crouch: 1.6, crawl: 0.8, limp: 1.5 },
  groundAccel: 30,
  airAccel: 4,
  gravity: 9.81,
  jumpSpeed: 3.55,
  /** horizontal speed kept at take-off above a jog (U-004: more vertical, less horizontal) */
  jumpCarry: 0.88,
  /** releasing Space while rising multiplies the upward speed (a tap reaches about 40%) */
  jumpCut: 0.63,
  /** jumping into a wall holds him there briefly (U-005) */
  cling: { time: 0.35, slide: 1.4, minInto: 1.0, after: 1.8 },
  coyote: 0.03,
  stepHeight: 0.45,
  snapDown: 0.5,
  maxFall: 50,
  mantle: { min: 0.5, max: 2.4, hop: 1.2, reach: 0.7, lowTime: 0.35, highTime: 0.8, lowLimit: 1.0 },
  /** overH/lift: a vault over a low wall with a drop beyond carries on into the air (U-014) */
  vault: { minH: 0.5, maxH: 1.2, maxDepth: 1.2, minSpeed: 2.5, time: 0.45, keep: 0.85, overH: 1.0, lift: 1.8 },
  /** a slide starts at 7.5 m/s, bleeds `friction` on the flat and gathers g x the grade downhill, up to max; on a
   *  downhill grade of 0.2 or more it starts from a jog (U-020) */
  slide: { minSpeed: 6.0, start: 7.5, end: 3.0, friction: 3.5, max: 14, downhill: 0.2, downhillMin: 3.0 },
  /** ground steeper than this (normal's y; about 72 degrees, near a wall) is a wall: no walking up it, he slides
   *  off it (U-020, U-038); short of it he walks and runs up, slower the steeper (uphill) */
  steep: 0.3,
  /** up slopes steeper than stairs (a sine over 0.5, 30 degrees) his speed falls by the sine past that (U-038):
   *  to 79% up 45 degrees, 63% up 60, 56% up 70 */
  uphill: 0.5,
  /** moving faster than this (a fall of about 12 m), grabs tear loose and wall moves are refused (U-020) */
  tear: { speed: 15, keep: 0.8, damage: 6, regrab: 0.6 },
  wallRun: { maxTime: 0.9, speed: 6.5, upSpeed: 3.0, minSpeed: 5.5, stepEvery: 0.3, gravityScale: 0.6, wallDist: 0.8, maxAngle: 35, leapSpeed: 5.0, leapUp: 3.0 },
  wallClimb: { time: 0.6 },
  /** Chimneying (M3-78): braced back and feet across a gap min to max wide, worked up or down at these speeds (m/s),
   *  a scrape heard this far (m) each stride. */
  chimney: { min: 0.6, max: 1.25, up: 0.7, down: 0.9, stride: 0.5, noise: 3 },
  /** second Space in the air near a wall, read from the camera (U-004) */
  wallKick: { reach: 0.8, max: 2, upPitch: 0.45, upSpeed: 4.6, speed: 5.5, up: 3.4, pitchUp: 1.5, minAway: 0.35, alongMax: 0.5 },
  /** hand climbing (U-002): grips, reach, reeling, mantles over lips, dynos */
  grip: {
    rayReach: 1.6, heightReach: 2.2, lowest: 0.9, lowestCrouched: -0.3, lipDepth: 0.35, edgeBand: 0.4, pipeRadius: 0.3,
    pullMin: 1.15, hangMax: 2.1, pullSpeed: 1.1, wallGap: 0.4,
    /** spring toward the hanging spot, and how hard one or two hands can pull before slipping (U-004) */
    spring: 80, capOne: 35, capTwo: 80, strainOne: 0.1, strainTwo: 0.25,
    drainOne: 6, drainTwo: 2, ladderScale: 0.5, mantleFrom: 1.3, climbTime: 0.7,
    dynoUp: 4.6, regrab: 0.25,
    /** seconds of Space held hanging free before a muscle-up onto the bar or edge (U-035) */
    muscleUp: 0.4,
    /** U-005: mouse drags move the body (radians to metres), sideways range; bar swings and laches */
    mousePull: 0.7, sideMax: 0.45, mouseSwing: 2.5, pump: 2.0, swingMax: 6.5, swingDamp: 0.15,
  },
  /** soft: the share of a drop that counts landing on something soft (bags, bins, an awning; U-024) */
  falls: { safe: 4, rollSafe: 7, rollWindow: 0.3, lethal: 12, fractureFrom: 7, rollMax: 10, dmgPerM: 8, dmgPerMHigh: 10, sprainChance: 0.4, armChance: 0.2, soft: 0.5 },
  /** minInner: the smallest space he fits curled up in (a car boot, lying down, is lower: minBoot) */
  hide: { enterTime: 0.6, exitTime: 0.5, minInner: 0.8, minBoot: 0.5, reach: 1.6 },
  swim: { float: 1.45, speed: 1.4, sprint: 2.2, dive: 1.2, breath: 40, drownDps: 8, wetMinutes: 120, climbOut: 0.6, floatDepth: 1.2 },
  /** grip endurance (U-003: no running stamina) */
  endurance: { max: 100, regen: 30, recover: 25 },
  noise: { crawl: 1, crouch: 2, jog: 8, sprint: 16, land: 15, landMinH: 2, vault: 6, mantle: 3, slide: 8, rainScale: 0.5, stride: { crawl: 0.4, crouch: 0.6, jog: 1.2, sprint: 1.8 } },
  encumbrance: { heavy: 15, overloaded: 25, penalty: 0.15, overloadedMantle: 1.6 },
};

export type Movement = typeof movement;
