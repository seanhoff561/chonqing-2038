// Player movement. Each tick: look, then the current mode's update.
import type { InputFrame, SimState } from './types';
import type { World } from '../world/world';

export function stepPlayer(state: SimState, _world: World, input: InputFrame): void {
  const p = state.player;
  p.yaw = input.yaw;
  p.pitch = Math.max(-1.5, Math.min(1.5, input.pitch));
}
