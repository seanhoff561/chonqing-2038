// The body status indicator (M3-30, U-014): a small figure bottom left showing where he's hurt, with icons for
// what he's running low on. It shows only while something is wrong (U-015), brightest just after a change.
import type { SimState } from '../sim/types';
import { survival as S } from '../data/survival';

const OK = 'rgba(200,195,180,0.5)', SPRAIN = '#d9a520', BROKEN = '#d8322a', SPLINT = '#5aa0d8', BLEED = '#d8322a';

export interface StatusView { legs: string; arm: string; bleed: 'none' | 'light' | 'heavy' | 'tourniquet'; needs: string[] }

/** What the indicator shows for a state; pure, so tests can read it. */
export function statusOf(s: SimState): StatusView {
  const b = s.body;
  const limb = (kind: 'ok' | 'sprain' | 'fracture', splint: boolean) => (kind === 'ok' ? 'ok' : splint ? `${kind}-splinted` : kind);
  const needs: string[] = [];
  if (b.satiety < 30) needs.push('food');
  if (b.hydration < 30) needs.push('water');
  if (b.energy < 25) needs.push('sleep');
  if (s.time < b.sickUntil) needs.push('sick');
  if (s.player.endurance < 40 && s.player.mode === 'grip') needs.push('grip');
  if (b.hp < S.hp * 0.4) needs.push('hp');
  return {
    legs: limb(b.leg, b.legSplint), arm: limb(b.arm, b.armSplint),
    bleed: b.heavyBleed ? (b.tourniquet ? 'tourniquet' : 'heavy') : b.lightBleed >= 0 ? 'light' : 'none', needs,
  };
}

const ICONS: Record<string, [string, string]> = {
  food: ['饿', 'hungry'], water: ['渴', 'thirsty'], sleep: ['困', 'exhausted'], sick: ['病', 'sick'], grip: ['手', 'grip failing'], hp: ['伤', 'badly hurt'],
};

export class StatusIndicator {
  readonly el: HTMLDivElement;
  private sig = '';
  private glow = 0;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'status';
    document.body.appendChild(this.el);
  }

  update(s: SimState, dt: number) {
    const v = statusOf(s), sig = JSON.stringify(v);
    if (sig !== this.sig) { this.sig = sig; this.glow = 4; this.draw(v); }
    this.glow = Math.max(0, this.glow - dt);
    const hurt = v.legs !== 'ok' || v.arm !== 'ok' || v.bleed !== 'none' || v.needs.length > 0;
    this.el.style.opacity = String(!hurt ? 0 : this.glow > 0 ? 1 : 0.7);
  }

  private draw(v: StatusView) {
    const col = (k: string) => (k.startsWith('fracture') ? BROKEN : k.startsWith('sprain') ? SPRAIN : OK);
    const stroke = (k: string) => (k.endsWith('splinted') ? SPLINT : 'rgba(0,0,0,0.5)');
    const torso = v.bleed === 'none' ? OK : BLEED;
    const pulse = v.bleed === 'heavy' ? 'pulse fast' : v.bleed === 'light' ? 'pulse' : '';
    this.el.innerHTML = `<svg viewBox="0 0 40 80" width="44" height="88">
      <circle cx="20" cy="8" r="6" fill="${OK}"/>
      <rect class="${pulse}" x="12" y="16" width="16" height="26" rx="4" fill="${torso}"/>
      ${v.bleed === 'tourniquet' ? '<rect x="12" y="27" width="16" height="3" fill="#eee"/>' : ''}
      <rect x="4" y="17" width="6" height="24" rx="3" fill="${OK}"/>
      <rect data-part="arm" x="30" y="17" width="6" height="24" rx="3" fill="${col(v.arm)}" stroke="${stroke(v.arm)}" stroke-width="1.5"/>
      <rect data-part="legs" x="12" y="44" width="7" height="32" rx="3" fill="${col(v.legs)}" stroke="${stroke(v.legs)}" stroke-width="1.5"/>
      <rect x="21" y="44" width="7" height="32" rx="3" fill="${col(v.legs)}" stroke="${stroke(v.legs)}" stroke-width="1.5"/>
    </svg><div class="needs">${v.needs.map(n => `<span title="${ICONS[n][1]}">${ICONS[n][0]}<i>${ICONS[n][1]}</i></span>`).join('')}</div>`;
  }
}
