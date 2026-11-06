export type SoundKind = 'streak' | 'milestone' | 'goal' | 'personal' | 'participation';

type Note = { frequency: number; at: number; length: number; wave: OscillatorType; volume: number };

const arpeggio = (frequencies: number[], step: number, length: number, wave: OscillatorType, volume: number): Note[] =>
  frequencies.map((frequency, index) => ({ frequency, at: index * step, length, wave, volume }));

const SOUNDS: Record<SoundKind, Note[]> = {
  streak: [
    ...arpeggio([392, 494, 587, 784, 988], 0.07, 0.18, 'triangle', 0.5),
    { frequency: 1568, at: 0.38, length: 0.6, wave: 'sine', volume: 0.25 },
  ],
  milestone: arpeggio([1047, 1319, 1568, 2093, 2637], 0.06, 0.9, 'sine', 0.3),
  goal: [
    ...arpeggio([523, 523, 523], 0.13, 0.11, 'square', 0.18),
    { frequency: 698, at: 0.39, length: 0.7, wave: 'square', volume: 0.18 },
    { frequency: 523, at: 0.39, length: 0.9, wave: 'triangle', volume: 0.35 },
    { frequency: 659, at: 0.39, length: 0.9, wave: 'triangle', volume: 0.3 },
    { frequency: 784, at: 0.39, length: 0.9, wave: 'triangle', volume: 0.3 },
    { frequency: 1047, at: 0.6, length: 0.8, wave: 'sine', volume: 0.25 },
  ],
  personal: [
    { frequency: 880, at: 0, length: 0.6, wave: 'sine', volume: 0.4 },
    { frequency: 1175, at: 0.12, length: 0.8, wave: 'sine', volume: 0.35 },
    { frequency: 1760, at: 0.24, length: 0.5, wave: 'sine', volume: 0.12 },
  ],
  participation: arpeggio([660, 990], 0.08, 0.25, 'triangle', 0.4),
};

export const SOUND_SETTING = 'openwrimo-sound';

export const soundIsOn = (): boolean => window.localStorage.getItem(SOUND_SETTING) !== 'off';

export const playAchievementSound = async (kind: SoundKind): Promise<void> => {
  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass || !soundIsOn()) {
    return;
  }

  const context = new AudioContextClass();
  await context.resume().catch(() => undefined);
  const master = context.createGain();
  master.gain.value = 0.35;
  master.connect(context.destination);
  const start = context.currentTime + 0.02;
  let end = 0;

  for (const note of SOUNDS[kind]) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const noteStart = start + note.at;
    oscillator.type = note.wave;
    oscillator.frequency.setValueAtTime(note.frequency, noteStart);
    envelope.gain.setValueAtTime(0.0001, noteStart);
    envelope.gain.exponentialRampToValueAtTime(note.volume, noteStart + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, noteStart + note.length);
    oscillator.connect(envelope).connect(master);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + note.length + 0.05);
    end = Math.max(end, note.at + note.length);
  }

  window.setTimeout(() => void context.close(), (end + 0.3) * 1000);
};

export const soundForBadge = (kind: 'writing' | 'personal' | 'participation', id: string): SoundKind => {
  if (kind !== 'writing') {
    return kind;
  }

  if (id.startsWith('streak-')) {
    return 'streak';
  }

  return ['goal-met', 'par-every-day', 'halfway'].includes(id) || id.startsWith('lifetime-') ? 'goal' : 'milestone';
};
