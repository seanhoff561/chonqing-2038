// Scenarios: set-up situations loaded with ?scenario=<name>. The world builder names come from src/world/build.ts.
export interface Scenario {
  name: string;
  world: string;
  desc: string;
  /** optional spawn override */
  spawn?: { x: number; y: number; z: number; yaw: number };
}

export const scenarios: Scenario[] = [
  { name: 'gym', world: 'gym', desc: 'movement gym with labelled obstacles' },
];

export const scenarioByName = (n: string) => scenarios.find(s => s.name === n);
