// Keyboard and mouse to per-tick input frames. Presses between ticks are kept until the next frame.
import { B, emptyInput, type InputFrame } from '../sim/types';
import type { Cmd } from '../sim/commands';

const KEYS: Record<string, number> = {
  Space: B.JUMP, ShiftLeft: B.SPRINT, ShiftRight: B.SPRINT, KeyC: B.CROUCH, ControlLeft: B.CROUCH, ControlRight: B.CROUCH,
  KeyZ: B.CRAWL, KeyE: B.INTERACT, KeyQ: B.DROP, KeyR: B.RELOAD, KeyH: B.HEADLAMP,
};

export class Input {
  yaw = 0;
  pitch = 0;
  sensitivity = 0.0022;
  invertY = false;
  /** UI (backpack, laptop, menus) takes the mouse; movement keys still work */
  uiOpen = false;
  private held = new Set<string>();
  private buttons = 0;
  private pressed = 0;
  /** held mouse buttons as USE/AIM bits */
  mouse = 0;
  private slot = -1;
  /** single-shot UI keys (Tab, L, Esc...) read by the game each frame */
  readonly uiKeys: string[] = [];
  /** commands from UI, delivered with the next frame */
  readonly cmds: Cmd[] = [];

  constructor(readonly el: HTMLElement) {
    addEventListener('keydown', e => this.key(e, true));
    addEventListener('keyup', e => this.key(e, false));
    addEventListener('blur', () => { this.held.clear(); this.buttons = 0; this.mouse = 0; });
    el.addEventListener('mousedown', e => {
      if (!this.uiOpen && document.pointerLockElement !== el) { this.capture(); return; }
      if (this.uiOpen) return;
      const bit = e.button === 0 ? B.USE : e.button === 2 ? B.AIM : 0;
      this.mouse |= bit; this.pressed |= bit;
    });
    addEventListener('mouseup', e => { this.mouse &= ~(e.button === 0 ? B.USE : e.button === 2 ? B.AIM : 0); });
    addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => {
      if (document.pointerLockElement !== el) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity * (this.invertY ? -1 : 1);
      this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch));
    });
  }

  /**
   * Capture the mouse. Ctrl is crouch (U-001) and Ctrl+W would close the tab, so ask for fullscreen and
   * lock the keyboard where the browser allows it (D-014).
   */
  capture() {
    const el = this.el;
    const lock = () => { (navigator as Navigator & { keyboard?: { lock?: (k?: string[]) => Promise<void> } }).keyboard?.lock?.().catch(() => {}); };
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().then(lock, () => {});
    else lock();
    try { (el.requestPointerLock?.() as unknown as Promise<void> | undefined)?.catch?.(() => {}); } catch { /* not allowed without a gesture */ }
  }

  private key(e: KeyboardEvent, down: boolean) {
    if (e.ctrlKey && document.pointerLockElement) e.preventDefault();
    if (e.repeat) { if (['Tab', 'Space'].includes(e.code)) e.preventDefault(); return; }
    if (down && ['Tab', 'KeyL', 'Escape', 'Backquote', 'KeyI'].includes(e.code)) { this.uiKeys.push(e.code); e.preventDefault(); return; }
    if (down && /^Digit[0-5]$/.test(e.code)) { this.slot = Number(e.code[5]); return; }
    if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (down) this.held.add(e.code); else this.held.delete(e.code);
    const bit = KEYS[e.code];
    if (bit === undefined) return;
    if (down) { this.buttons |= bit; this.pressed |= bit; }
    else if (!Object.entries(KEYS).some(([k, b]) => b === bit && this.held.has(k))) this.buttons &= ~bit;
  }

  /** The frame for the next tick; clears edge-triggered state. */
  frame(): InputFrame {
    const f = emptyInput();
    const h = (k: string) => (this.held.has(k) ? 1 : 0);
    f.my = h('KeyW') - h('KeyS');
    f.mx = h('KeyD') - h('KeyA');
    f.yaw = this.yaw;
    f.pitch = this.pitch;
    f.buttons = this.buttons | this.mouse;
    f.pressed = this.pressed;
    f.slot = this.slot;
    if (this.cmds.length) f.cmds = this.cmds.splice(0);
    this.pressed = 0;
    this.slot = -1;
    return f;
  }
}
