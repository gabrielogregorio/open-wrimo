import { soundIsOn } from './achievement-sound';

const RING_SECONDS = 1.1;
const GAP_SECONDS = 0.35;
const RINGS = 2;
const TREMOLO_HZ = 24;
const BELLS = [2350, 3150];

export const playAlarmRing = async (): Promise<void> => {
  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass || !soundIsOn()) {
    return;
  }

  const context = new AudioContextClass();
  await context.resume().catch(() => undefined);
  const softener = context.createBiquadFilter();
  softener.type = 'lowpass';
  softener.frequency.value = 3200;
  const master = context.createGain();
  master.gain.value = 0.12;
  softener.connect(master).connect(context.destination);

  for (let ring = 0; ring < RINGS; ring += 1) {
    const start = context.currentTime + 0.05 + ring * (RING_SECONDS + GAP_SECONDS);
    const end = start + RING_SECONDS;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(1, start + 0.04);
    envelope.gain.setValueAtTime(1, end - 0.25);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);

    const tremolo = context.createGain();
    tremolo.gain.value = 0.5;
    const flutter = context.createOscillator();
    flutter.type = 'square';
    flutter.frequency.value = TREMOLO_HZ;
    const depth = context.createGain();
    depth.gain.value = 0.5;
    flutter.connect(depth).connect(tremolo.gain);
    tremolo.connect(envelope).connect(softener);

    for (const frequency of BELLS) {
      const bell = context.createOscillator();
      bell.type = 'sine';
      bell.frequency.value = frequency;
      bell.connect(tremolo);
      bell.start(start);
      bell.stop(end + 0.05);
    }

    flutter.start(start);
    flutter.stop(end + 0.05);
  }

  window.setTimeout(() => void context.close(), (RINGS * (RING_SECONDS + GAP_SECONDS) + 0.5) * 1000);
};
