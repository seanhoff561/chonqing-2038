// Scenarios: set-up situations loaded with ?scenario=<name>. The world builder names come from src/world/build.ts.
export interface Scenario {
  name: string;
  world: string;
  desc: string;
  /** optional spawn override */
  spawn?: { x: number; y: number; z: number; yaw: number };
  /** start a fresh run (stash supplies, shelter) */
  run?: boolean;
}

export const scenarios: Scenario[] = [
  { name: 'gym', world: 'gym', desc: 'movement gym with labelled obstacles' },
  { name: 'shibati', world: 'city', desc: 'Shibati and Jiaochangkou' },
  { name: 'hideout', world: 'hideout', desc: 'the hideout chamber on day 1', run: true },
];

export const scenarioByName = (n: string) => scenarios.find(s => s.name === n);
