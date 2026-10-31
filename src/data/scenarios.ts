// Scenarios: set-up situations loaded with ?scenario=<name>. The world builder names come from src/world/build.ts.
export interface Scenario {
  name: string;
  world: string;
  desc: string;
  /** optional spawn override: a point, or the name of one of the world's teleports */
  spawn?: { x: number; y: number; z: number; yaw: number };
  at?: string;
  /** a fresh run (U-013, U-018): supplies in the backpack, starting in the friends' hideout; saves on sleep */
  run?: boolean;
  /** the furnished test shelter: stocked stash, battery */
  furnished?: boolean;
  /** draw distance in metres (default 160) */
  draw?: number;
  /** 0 clear to 1 flat overcast light (until the weather schedule drives it) */
  overcast?: number;
}

export const scenarios: Scenario[] = [
  { name: 'gym', world: 'gym', desc: 'movement gym with labelled obstacles' },
  { name: 'shibati', world: 'yuzhong', desc: 'Shibati and Jiaochangkou: the top of the Eighteen Stairs', overcast: 0.6, at: 'shibati' },
  { name: 'run', world: 'yuzhong', desc: "a new run: day 1, 06:00, in the friends' hideout under the vent grate", run: true, overcast: 0.6 },
  { name: 'hideout', world: 'hideout', desc: 'the furnished air-raid shelter (test scene)', run: true, furnished: true },
  { name: 'yuzhong', world: 'yuzhong', desc: 'Yuzhong at 1:1 from the real ground and map, from Jiefangbei', overcast: 0.6, at: 'jiefangbei' },
  { name: 'tunnels', world: 'yuzhong', desc: "the Grand Tunnel under Yuzhong, at the junction of the friends' stub", overcast: 0.6, at: 'Tunnel junction (hideout)' },
  { name: 'reference', world: 'reference', desc: 'the reference hillside (docs/reference/look-01.jpg) from the vantage roof', draw: 700, overcast: 1 },
];

export const scenarioByName = (n: string) => scenarios.find(s => s.name === n);
