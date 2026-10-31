// Dialogue (BRIEF: src/data/dialogue; the full set comes with M8): each line its id, speaker, Chinese and English.
// Spoken by public/audio/vo/<id>.mp3 when there is one; until then shown as subtitles.
export interface Line { id: string; speaker: string; zh: string; en: string }

export const SPEAKERS: Record<string, [string, string]> = { liguorong: ['李国荣', 'Li Guorong'], none: ['', ''] };

/** The one voicemail on his father's phone, left the night of the attack (M3-19). */
export const VOICEMAIL: Line[] = [
  { id: 'vm-01', speaker: 'liguorong', zh: '伟伟，是爸爸。你那边咋样了？接电话嘛。', en: "Weiwei, it's Dad. What's happening where you are? Pick up." },
  { id: 'vm-02', speaker: 'liguorong', zh: '变电站这边全部乱完了，那些东西……它们在拉闸。', en: "It's chaos at the substation. Those things... they're pulling the breakers." },
  { id: 'vm-03', speaker: 'liguorong', zh: '莫回屋头，听到没得？莫回来。去你们那个隧道，躲起。', en: "Don't come home, you hear me? Don't come back. Go to that tunnel of yours and hide." },
  { id: 'vm-04', speaker: 'liguorong', zh: '照顾好你自己，先顾到你自己。你妈和小雨我来……', en: "Look after yourself. Yourself first. Your mum and Xiaoyu, I'll..." },
  { id: 'vm-05', speaker: 'none', zh: '（信号中断）', en: '(the line breaks up)' },
];

export const lineById = new Map(VOICEMAIL.map(l => [l.id, l]));
