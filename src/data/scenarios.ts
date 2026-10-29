// Scenarios: set-up situations loaded with ?scenario=<name>. The world builder names come from src/world/build.ts.
export interface Scenario {
  name: string;
  world: string;
  desc: string;
  /** optional spawn override */
  spawn?: { x: number; y: number; z: number; yaw: number };
  /** start a fresh run (stash supplies, shelter) */
  run?: boolean;
  /** draw distance in metres (default 160) */
  draw?: number;
  /** flat overcast light (until the weather schedule drives it) */
  overcast?: boolean;
}

export const scenarios: Scenario[] = [
  { name: 'gym', world: 'gym', desc: 'movement gym with labelled obstacles' },
  { name: 'shibati', world: 'city', desc: 'Shibati and Jiaochangkou' },
  { name: 'hideout', world: 'hideout', desc: 'the hideout chamber on day 1', run: true },
  { name: 'reference', world: 'reference', desc: 'the reference hillside (docs/reference/look-01.jpg) from the vantage roof', draw: 700, overcast: true },
];

export const scenarioByName = (n: string) => scenarios.find(s => s.name === n);
