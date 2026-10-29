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
  cling: { time: 0.35, slide: 0.4, minInto: 1.0, after: 1.2 },
  coyote: 0.03,
  stepHeight: 0.45,
  snapDown: 0.5,
  maxFall: 50,
  mantle: { min: 0.5, max: 2.4, hop: 1.2, reach: 0.7, lowTime: 0.35, highTime: 0.8, lowLimit: 1.0 },
  vault: { minH: 0.5, maxH: 1.2, maxDepth: 1.2, minSpeed: 2.5, time: 0.45, keep: 0.85 },
  slide: { minSpeed: 6.0, time: 1.0, start: 7.5, end: 3.0 },
  wallRun: { maxTime: 0.9, speed: 6.5, upSpeed: 3.0, minSpeed: 5.5, stepEvery: 0.3, gravityScale: 0.6, wallDist: 0.8, maxAngle: 35, leapSpeed: 5.0, leapUp: 3.0 },
  wallClimb: { time: 0.6 },
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
    /** U-005: mouse drags move the body (radians to metres), sideways range; bar swings and laches */
    mousePull: 0.7, sideMax: 0.45, mouseSwing: 2.5, pump: 2.0, swingMax: 6.5, swingDamp: 0.15,
  },
  falls: { safe: 4, rollSafe: 7, rollWindow: 0.3, lethal: 12, fractureFrom: 7, rollMax: 10, dmgPerM: 8, dmgPerMHigh: 10, sprainChance: 0.4, armChance: 0.2 },
  hide: { enterTime: 0.6, exitTime: 0.5, minInner: 0.8, reach: 1.6 },
  swim: { float: 1.45, speed: 1.4, sprint: 2.2, dive: 1.2, breath: 40, drownDps: 8, wetMinutes: 120, climbOut: 0.6, floatDepth: 1.2 },
  /** grip endurance (U-003: no running stamina) */
  endurance: { max: 100, regen: 30, recover: 25 },
  noise: { crawl: 1, crouch: 2, jog: 8, sprint: 16, land: 15, landMinH: 2, vault: 6, mantle: 3, slide: 8, rainScale: 0.5, stride: { crawl: 0.4, crouch: 0.6, jog: 1.2, sprint: 1.8 } },
  encumbrance: { heavy: 15, overloaded: 25, penalty: 0.15, overloadedMantle: 1.6 },
};

export type Movement = typeof movement;
