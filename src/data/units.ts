// The machines that move (DESIGN section 7): how fast each kind goes on its beat and when chasing, whether it takes
// stairs, how high it flies, and the hours its beats keep by default. Speeds in real metres a second.
export type UnitKind = 'quadruped' | 'humanoid' | 'drone' | 'delivery' | 'carrier';

export const UNITS: Record<UnitKind, { patrol: number; chase: number; stairs: boolean; fly: number; zh: string; en: string }> = {
  quadruped: { patrol: 3, chase: 8, stairs: true, fly: 0, zh: '四足机器人', en: 'Quadruped' },
  humanoid: { patrol: 2.5, chase: 4.5, stairs: true, fly: 0, zh: '人形机器人', en: 'Humanoid' },
  drone: { patrol: 9, chase: 12, stairs: true, fly: 30, zh: '巡逻无人机', en: 'Patrol drone' },
  delivery: { patrol: 2, chase: 2, stairs: false, fly: 0, zh: '配送机器人', en: 'Delivery robot' },
  carrier: { patrol: 1.6, chase: 1.6, stairs: false, fly: 0, zh: '运输机器人', en: 'Carrier' },
};

/** The columns out of the factory (M4-01b, U-030, U-031): their marching pace, a squad out of each gate every so
 *  often (real seconds), the bounding cycle (one fire team moves at double pace while the other holds, then they
 *  swap), and each squad's members: where in the formation (to the side, back from its head) and in which team (2
 *  keeps the pace). Six humanoids in two staggered files, a quadruped on each flank, a carrier in the middle, a drone
 *  over them. The last two humanoids peel off into an alley on the way and run to catch up. */
export const COLUMN = {
  pace: 1.6, every: 150, bound: 12, peel: [4, 5], look: 8,
  squad: [
    { kind: 'humanoid', side: -1.8, back: 0, team: 0 }, { kind: 'humanoid', side: 1.8, back: 2, team: 0 }, { kind: 'humanoid', side: -1.8, back: 4, team: 0 },
    { kind: 'humanoid', side: 1.8, back: 10, team: 1 }, { kind: 'humanoid', side: -1.8, back: 12, team: 1 }, { kind: 'humanoid', side: 1.8, back: 14, team: 1 },
    { kind: 'quadruped', side: -4, back: 3, team: 0 }, { kind: 'quadruped', side: 4, back: 13, team: 1 },
    { kind: 'carrier', side: 0, back: 8, team: 2 }, { kind: 'drone', side: 0, back: 7, team: 2 },
  ] as { kind: UnitKind; side: number; back: number; team: number }[],
};

/** A beat's pauses (real seconds): at its ends, where it looks into an alley, where it goes into a building. */
export const DWELL = { end: 6, alley: 8, inside: 12, tunnel: 90 };
/** A run's units start each somewhere else along their loops: at most this share of a loop out (M4-01). */
export const PHASE = 0.08;

/** What each kind sees (DESIGN sections 5 and 7): its cone (degrees, and pitched down for a drone's), how far by
 *  day and by night, its eyes' height over its feet, an infrared floor on the light it needs (0 for none), a lamp
 *  that lights what it looks at by night (the drones' searchlights), how far its thermal sight reaches at night. */
export const SENSES: Record<UnitKind, { fov: number; pitch: number; day: number; night: number; eye: number; ir: number; lamp: boolean; thermal: number }> = {
  quadruped: { fov: 120, pitch: 0, day: 30, night: 20, eye: 0.85, ir: 0, lamp: false, thermal: 20 },
  humanoid: { fov: 100, pitch: 0, day: 40, night: 22, eye: 1.8, ir: 0.3, lamp: false, thermal: 0 },
  drone: { fov: 100, pitch: 45, day: 35, night: 30, eye: -0.1, ir: 0, lamp: true, thermal: 30 },
  delivery: { fov: 120, pitch: 0, day: 18, night: 10, eye: 0.5, ir: 0, lamp: false, thermal: 0 },
  carrier: { fov: 120, pitch: 0, day: 25, night: 15, eye: 1.2, ir: 0.3, lamp: false, thermal: 0 },
};

/** Seeing him (DESIGN section 5): awareness climbs at RATE x visibility a second while he's visible at all (MIN),
 *  falls at DECAY a second otherwise; how much each posture and each way of moving shows. */
export const SIGHT = {
  rate: 2.5, min: 0.04, decay: 0.15,
  posture: { stand: 1, crouch: 0.55, crawl: 0.3, hang: 0.8, hidden: 0 },
  motion: { still: 0.4, crawl: 0.45, crouch: 0.6, jog: 0.85, fast: 1 },
};
