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

  setPrompt(text: string) { if (this.prompt.textContent !== text) this.prompt.textContent = text; }
  setHeld(text: string) { if (this.held.textContent !== text) this.held.textContent = text; }
}
