// The tunnels under Jiaochangkou and Shibati (M3-08), as polylines: points [x, floor y, z], width, height.
// Floors are 12 m under the junction; a sloped run between two points is a flight of stairs.

export interface Tunnel { id: string; zh: string; en: string; pts: [number, number, number][]; w: number; h: number }

export const TUNNELS: Tunnel[] = [
  // The wartime Grand Tunnel 大隧道, east to west under the junction plaza.
  { id: 'grand', zh: '大隧道', en: 'Grand Tunnel', pts: [[396, 32, 345], [560, 32, 345]], w: 5, h: 4 },
  // The air-raid side tunnel running south under Shibati to a rusted gate in a stair-street retaining wall.
  { id: 'side', zh: '防空洞支道', en: 'Air-raid side tunnel', pts: [[465.6, 32, 345], [465.6, 32, 480]], w: 2.4, h: 3 },
  // Up to the Jiaochangkou plaza: along, then a flight west that breaks the surface under a shelter.
  { id: 'jck-exit', zh: '较场口出口', en: 'Jiaochangkou exit', pts: [[505, 32, 345], [505, 32, 370], [485, 44, 370]], w: 3, h: 3 },
  // The hotpot restaurant's old shelter, used as its cool room: a dead end off the tunnel's east end.
  { id: 'coolroom', zh: '火锅店冷库', en: 'Hotpot cool room', pts: [[558, 32, 345], [568, 32, 345]], w: 9, h: 3 },
];

/** The rusted gate where the side tunnel meets the Shibati terrace. */
export const GATE = { x: 465.6, z: 480, w: 2.4, h: 3, y: 32 };
