// The only on-screen interface during play: a centre dot, context prompts, the held item and subtitles.
export class Hud {
  readonly root: HTMLDivElement;
  private prompt: HTMLDivElement;
  private held: HTMLDivElement;
  readonly subs: HTMLDivElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `<div class="dot"></div><div class="prompt"></div><div class="held"></div><div class="subs"></div>`;
    document.body.appendChild(this.root);
    this.prompt = this.root.querySelector('.prompt')!;
    this.held = this.root.querySelector('.held')!;
    this.subs = this.root.querySelector('.subs')!;
  }

  private queue: { html: string; secs: number }[] = [];
  private left = 0;
  /** Subtitles: a line of dialogue (its speaker, Chinese over English) or a short message, one after another, each
   *  for as long as it takes to read. */
  say(zh: string, en: string, speaker = '') {
    const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
    this.queue.push({ html: `${speaker ? `<b>${esc(speaker)}</b> ` : ''}${esc(zh)}${en ? `<br><span>${esc(en)}</span>` : ''}`, secs: 1.5 + [...zh].length * 0.18 });
  }
  /** Every frame: the next subtitle when this one's time is up. */
  tick(dt: number) {
    if ((this.left -= dt) > 0) return;
    const next = this.queue.shift();
    this.left = next?.secs ?? 0;
    const html = next?.html ?? '';
    if (this.subs.innerHTML !== html) this.subs.innerHTML = html;
  }

  setPrompt(text: string) { if (this.prompt.textContent !== text) this.prompt.textContent = text; }
  setHeld(text: string) { if (this.held.textContent !== text) this.held.textContent = text; }
}
