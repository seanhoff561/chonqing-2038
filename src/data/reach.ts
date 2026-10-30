// What he can do, as the route planner reads it (M3-76, U-043): how far each way a leg can go reaches, unaided (from
// the measured movement envelope) or with a tool (its feature's spec). The routes are planned against it and the
// tests hold every leg to it.
import { ENVELOPE as E } from './envelope';

export const REACH = {
  /** across a gap roof to roof, level-ish: m across, m up or down */
  jump: { across: E.runningJump.comfortable, rise: 1.2 },
  /** out of one window and in at another across the way, from the sill, standing */
  window: { across: E.standingJump.comfortable + 0.6, rise: 0.6 },
  /** down onto a roof (rolling): m down, m out */
  drop: { down: E.safeDropRoll.comfortable, across: E.standingJump.comfortable },
  /** up onto a sill or a lip from a roof */
  climb: { up: E.mantleJump.comfortable },
  /** the grappling hook (M5-20): a ledge this far above, this far off */
  grapple: { rise: 20, across: 16 },
  /** a cable or a line to walk or ride (M3-52, M5-33) */
  line: { across: 40 },
  /** a plank, a beam, a walkway or a bar laid across */
  span: { across: 35 },
  /** what a stretch costs a metre in each kind of place: inside and underground cheap, roofs and open ground
   *  dangerous (U-038) */
  cost: { inside: 1, under: 1.3, roof: 8, ground: 10 },
};
