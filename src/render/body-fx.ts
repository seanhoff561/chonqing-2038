// How the body shows on screen without meters: vignette, blur, desaturation, blinks and a limp.
import type { SimState } from '../sim/types';
import type { FPCamera } from './fpcamera';

export class BodyFx {
  private vig: HTMLDivElement;
  private blood: HTMLDivElement;
  private lid: HTMLDivElement;
  private t = 0;
  private nextBlink = 6;
  private blink = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const mk = (css: string) => { const d = document.createElement('div'); d.style.cssText = `position:fixed;inset:0;pointer-events:none;opacity:0;${css}`; document.body.appendChild(d); return d; };
    this.vig = mk('background:radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.95) 100%)');
    this.blood = mk('background:radial-gradient(ellipse at center, rgba(90,0,0,0) 55%, rgba(110,0,0,0.7) 100%)');
    this.lid = mk('background:#000');
  }

  update(s: SimState, fp: FPCamera, dt: number) {
    this.t += dt;
    const b = s.body, h = b.hp / 100;
    const tired = b.energy < 20 ? (20 - b.energy) / 20 : 0;
    const dry = b.hydration < 20 ? (20 - b.hydration) / 20 : 0;
    const hurt = Math.max(0, (0.6 - h) / 0.6);
    this.vig.style.opacity = String(Math.min(0.9, hurt * 0.8 + tired * 0.5));
    const bleeding = b.lightBleed >= 0 || (b.heavyBleed && !b.tourniquet);
    const pulse = 0.5 + 0.5 * Math.sin(this.t * (b.heavyBleed ? 7 : 4));
    this.blood.style.opacity = bleeding ? String((b.heavyBleed ? 0.6 : 0.3) * pulse + hurt * 0.3) : String(hurt * 0.25);
    const blur = Math.max(dry, tired) * (1.5 + Math.sin(this.t * 0.7));
    const sat = 1 - hurt * 0.7;
    const f = `blur(${blur.toFixed(2)}px) saturate(${sat.toFixed(2)})`;
    if (this.canvas.style.filter !== f) this.canvas.style.filter = blur < 0.05 && sat > 0.99 ? '' : f;
    // Slow blinks when exhausted.
    if (tired > 0) {
      this.nextBlink -= dt;
      if (this.nextBlink <= 0) { this.blink = 0.35 + tired * 0.8; this.nextBlink = 9 - tired * 6; }
    }
    this.blink = Math.max(0, this.blink - dt);
    this.lid.style.opacity = this.blink > 0 ? String(Math.min(1, Math.sin((this.blink / 0.6) * Math.PI) * 1.2)) : '0';
    fp.limp = b.leg === 'fracture' && !b.legSplint ? 1 : b.leg !== 'ok' && s.time >= b.painkillerUntil ? 0.5 : 0;
  }
}
