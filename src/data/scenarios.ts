// Scenarios: set-up situations loaded with ?scenario=<name>. The world builder names come from src/world/build.ts.
export interface Scenario {
  name: string;
  world: string;
  desc: string;
  /** optional spawn override */
  spawn?: { x: number; y: number; z: number; yaw: number };
  /** a fresh run (U-013): supplies in the backpack, no shelter; saves on sleep */
  run?: boolean;
  /** the furnished test shelter: stocked stash, battery */
  furnished?: boolean;
  /** draw distance in metres (default 160) */
  draw?: number;
  /** flat overcast light (until the weather schedule drives it) */
  overcast?: boolean;
}

export const scenarios: Scenario[] = [
  { name: 'gym', world: 'gym', desc: 'movement gym with labelled obstacles' },
  { name: 'shibati', world: 'city', desc: 'Shibati and Jiaochangkou' },
  { name: 'run', world: 'city', desc: 'a new run: day 1 at the top of Shibati, no shelter yet', run: true, spawn: { x: 470, y: 44.05, z: 392, yaw: Math.PI } },
  { name: 'hideout', world: 'hideout', desc: 'the furnished air-raid shelter (test scene)', run: true, furnished: true },
  { name: 'reference', world: 'reference', desc: 'the reference hillside (docs/reference/look-01.jpg) from the vantage roof', draw: 700, overcast: true },
];

export const scenarioByName = (n: string) => scenarios.find(s => s.name === n);
