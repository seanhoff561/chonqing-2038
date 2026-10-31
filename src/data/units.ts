// The machines that move (DESIGN section 7): how fast each kind goes on its beat and when chasing, whether it takes
// stairs, how high it flies, and the hours its beats keep by default. Speeds in real metres a second.
export type UnitKind = 'quadruped' | 'humanoid' | 'drone' | 'hunter' | 'delivery' | 'carrier' | 'camera' | 'sweeper' | 'lamppost' | 'turret' | 'pir' | 'tripwire' | 'acoustic';
/** The machines that stay where they're put (M4-07, M4-11). */
export const STATIC = new Set<UnitKind>(['camera', 'sweeper', 'lamppost', 'turret', 'pir', 'tripwire', 'acoustic']);

export const UNITS: Record<UnitKind, { patrol: number; chase: number; stairs: boolean; fly: number; zh: string; en: string; hp: number; weapon?: Weapon }> = {
  // Its shock prod (M4-18; its tag launcher is M4-22's).
  quadruped: { patrol: 3, chase: 8, stairs: true, fly: 0, zh: '四足机器人', en: 'Quadruped', hp: 150, weapon: 'prod' },
  // Armoured (its plates take a tenth of a hit: ZONES) and armed with a rifle (M4-18).
  humanoid: { patrol: 2.5, chase: 4.5, stairs: true, fly: 0, zh: '人形机器人', en: 'Humanoid', hp: 300, weapon: 'rifle' },
  drone: { patrol: 9, chase: 9, stairs: true, fly: 30, zh: '巡逻无人机', en: 'Patrol drone', hp: 40 },
  // Kept on the docks and launched on contact (M4-14), armed with a submachine gun.
  hunter: { patrol: 12, chase: 12, stairs: true, fly: 30, zh: '猎杀无人机', en: 'Hunter drone', hp: 70, weapon: 'smg' },
  delivery: { patrol: 2, chase: 2, stairs: false, fly: 0, zh: '配送机器人', en: 'Delivery robot', hp: 80 },
  carrier: { patrol: 1.6, chase: 1.6, stairs: false, fly: 0, zh: '运输机器人', en: 'Carrier', hp: 200 },
  camera: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '监控摄像头', en: 'Camera', hp: 20 },
  sweeper: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '旋转摄像头', en: 'Sweeping camera', hp: 20 },
  lamppost: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '智慧灯杆', en: 'Smart lamppost', hp: 20 },
  turret: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '自动炮塔', en: 'Turret', hp: 500, weapon: 'turret' },
  pir: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '红外感应器', en: 'Motion sensor', hp: 20 },
  tripwire: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '激光绊线', en: 'Laser tripwire', hp: 20 },
  acoustic: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '声学传感器', en: 'Acoustic sensor', hp: 20 },
};

/** Where a machine can be hit and what each place takes of a hit (DESIGN section 6, M4-19); the damage to a place that
 *  blinds it (its sensor head), immobilises it (each knee) or shuts it down (its battery). */
export const ZONES: Record<UnitKind, Record<string, number>> = {
  drone: { body: 1, rotors: 1.5 }, hunter: { body: 0.8, rotors: 1.5 },
  quadruped: { body: 0.2, head: 1, legs: 0.6, battery: 1.5 },
  humanoid: { body: 0.1, head: 1, kneeL: 0.8, kneeR: 0.8, battery: 2 },
  turret: { body: 0.05, head: 1 },
  delivery: { body: 1 }, carrier: { body: 0.3 },
  camera: { body: 1 }, sweeper: { body: 1 }, lamppost: { body: 1 }, pir: { body: 1 }, tripwire: { body: 1 }, acoustic: { body: 1 },
};
export const BREAKS: Partial<Record<UnitKind, { head?: number; knee?: number; battery?: number }>> = { quadruped: { head: 60 }, humanoid: { head: 75, knee: 100, battery: 120 }, turret: { head: 100 } };

/** The fixed sensors (M4-11, DESIGN section 7): a motion sensor's cone and reach and the movement it notices (his
 *  speed times how his posture shows him, so a crawl slides under it). */
export const SENSORS = { pir: { fov: 90, range: 10, motion: 0.5 } };

/** The machines' weapons (DESIGN section 6, M4-11, M4-18): rounds a burst (0.1 s apart), seconds from one burst to the
 *  next, damage a hit, how far it reaches (a turret sure within `sure`), its hit chance at best, how far it's heard;
 *  a prod's stun. */
export const WEAPONS = {
  turret: { burst: 1, every: 1 / 6, damage: 12, reach: 60, sure: 40, accuracy: 0.7, noise: 150, stun: 0 },
  rifle: { burst: 3, every: 1.2, damage: 18, reach: 80, sure: 0, accuracy: 0.55, noise: 150, stun: 0 },
  smg: { burst: 2, every: 0.8, damage: 8, reach: 35, sure: 35, accuracy: 0.4, noise: 100, stun: 0 },
  prod: { burst: 1, every: 1.5, damage: 15, reach: 1.5, sure: 1.5, accuracy: 1, noise: 0, stun: 1 },
};
export type Weapon = keyof typeof WEAPONS;

/** How long after a machine has him (Engaged) it tells the network (DESIGN section 5), real seconds: the wired
 *  sensors at once nearly, the cameras in a second, the walkers slowest. */
export const BROADCAST: Record<UnitKind, number> = { turret: 0.5, pir: 0.5, tripwire: 0.5, acoustic: 0.5, camera: 1, sweeper: 1, lamppost: 1, hunter: 1, drone: 1.5, quadruped: 2, delivery: 2, carrier: 2, humanoid: 2.5 };
/** How far into the districts next to his the network's word of him goes (DESIGN section 5), metres. */
export const SPREAD = 300;

/** Convergence and escalation on contact (DESIGN section 5, M4-14): how near his last known position (metres) the
 *  machines on the ground go to it, the drones fly to it, and the docks launch hunters (one at once, one more every
 *  20 s while the district is Engaged, three a dock at most); how long Engaged before the district's garage sends its
 *  squad of two humanoids. */
export const CONVERGE = { ground: 250, fly: 400, dock: 500, every: 20, perDock: 3, squadAfter: 45, squad: 2 };

/** A patrol drone's battery (M4-08, DESIGN section 7): 6 real minutes in the air, the first and last 20 s of them
 *  flying out from its rooftop dock and home again, then 2 minutes on the dock charging: the gap in its cover. */
export const DRONE = { flight: 360, charge: 120, launch: 20 };

/** A sweeping camera pans 45 degrees either side, 10 s each way (M4-07). */
export const SWEEP = { arc: 45, pass: 10 };

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
 *  day and by night, its eyes' height over its feet, an infrared floor on the light it needs (0 for none), the
 *  half-angle of a searchlight's spot along its cone that lights him by night (the drones'), how far its thermal
 *  sight reaches at night, how well it hears. */
export const SENSES: Record<UnitKind, { fov: number; pitch: number; day: number; night: number; eye: number; ir: number; lamp: number; thermal: number; hear: number }> = {
  quadruped: { fov: 120, pitch: 0, day: 30, night: 20, eye: 0.85, ir: 0, lamp: 0, thermal: 20, hear: 1.5 },
  humanoid: { fov: 100, pitch: 0, day: 40, night: 22, eye: 1.8, ir: 0.3, lamp: 0, thermal: 0, hear: 1 },
  drone: { fov: 100, pitch: 45, day: 35, night: 30, eye: -0.1, ir: 0, lamp: 15, thermal: 30, hear: 0.8 },
  hunter: { fov: 100, pitch: 45, day: 35, night: 30, eye: -0.1, ir: 0, lamp: 15, thermal: 30, hear: 0.8 },
  delivery: { fov: 120, pitch: 0, day: 18, night: 10, eye: 0.5, ir: 0, lamp: 0, thermal: 0, hear: 1 },
  carrier: { fov: 120, pitch: 0, day: 25, night: 15, eye: 1.2, ir: 0.3, lamp: 0, thermal: 0, hear: 1 },
  // The cameras (M4-07): fixed ones over doors and at junctions, sweepers at plazas and gates, the smart lampposts'.
  camera: { fov: 70, pitch: 25, day: 30, night: 18, eye: 0, ir: 0.3, lamp: 0, thermal: 0, hear: 0 },
  sweeper: { fov: 60, pitch: 20, day: 30, night: 18, eye: 0, ir: 0.3, lamp: 0, thermal: 0, hear: 0 },
  lamppost: { fov: 90, pitch: 35, day: 22, night: 14, eye: 0, ir: 0, lamp: 0, thermal: 0, hear: 0 },
  // The fixed sensors (M4-11): a turret sees far, thermal by night; the others don't see as cameras do.
  turret: { fov: 90, pitch: 10, day: 60, night: 45, eye: 0, ir: 0, lamp: 0, thermal: 45, hear: 0 },
  pir: { fov: 0, pitch: 0, day: 0, night: 0, eye: 0, ir: 0, lamp: 0, thermal: 0, hear: 0 },
  tripwire: { fov: 0, pitch: 0, day: 0, night: 0, eye: 0, ir: 0, lamp: 0, thermal: 0, hear: 0 },
  acoustic: { fov: 0, pitch: 0, day: 0, night: 0, eye: 0, ir: 0, lamp: 0, thermal: 0, hear: 2 },
};

/** Hearing him (DESIGN section 5): a noise is heard within its radius times the unit's hearing (its rotors dull a
 *  drone's), x0.6 through walls; gunfire and explosions are hostile, and the hive searches round them. */
/** Thermal sight at night (DESIGN section 5): his heat shows as full light within a unit's thermal range, a tenth
 *  of it under a mylar blanket, three tenths wet, none deeper than a metre in water. */
export const THERMAL = { mylar: 0.1, wet: 0.3, deep: 1 };
export const HEARING = { occluded: 0.6, hostile: new Set(['pistol', 'shotgun', 'grenade', 'firecrackers', 'explosion', 'gunfire']) };

/** Seeing him (DESIGN section 5): awareness climbs at RATE x visibility a second while he's visible at all (MIN),
 *  falls at DECAY a second otherwise; how much each posture and each way of moving shows. */
export const SIGHT = {
  rate: 2.5, min: 0.04, decay: 0.15, /** how much faster it climbs in a Heightened district (M4-16) */ heightened: 1.3,
  posture: { stand: 1, crouch: 0.55, crawl: 0.3, hang: 0.8, hidden: 0 },
  motion: { still: 0.4, crawl: 0.45, crouch: 0.6, jog: 0.85, fast: 1 },
};
