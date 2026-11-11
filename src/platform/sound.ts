import { OneShotPlayer, type OneShotChannel } from '@danilah/mini-games-kit/audio';
export type SoundCue = 'button' | 'remove' | 'slide' | 'exit' | 'error' | 'hint' | 'life' | 'win' | 'award';
const profiles: Record<SoundCue, { length: number; notes: readonly number[]; spacing: number }> = {
  button: { length: .075, notes: [760], spacing: 0 }, remove: { length: .18, notes: [660], spacing: 0 },
  slide: { length: .12, notes: [340], spacing: 0 }, exit: { length: .12, notes: [1320], spacing: 0 },
  error: { length: .23, notes: [148, 110], spacing: .055 }, hint: { length: .32, notes: [740, 1109], spacing: .08 },
  life: { length: .38, notes: [523.25, 659.25, 783.99], spacing: .075 },
  win: { length: .94, notes: [523.25, 659.25, 783.99, 1046.5, 1318.5], spacing: .11 },
  award: { length: 1, notes: [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568], spacing: .105 },
};
/** Short original plucked/glass cues. Deterministic, generated only on first use. */
export function soundSamples(cue: SoundCue, sampleRate: number): Float32Array<ArrayBuffer> {
  const p = profiles[cue], samples = new Float32Array(Math.ceil(p.length * sampleRate));
  let seed = 19027, noise = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate; let value = 0;
    seed = (Math.imul(seed,1664525)+1013904223)>>>0; noise = noise*.82+(seed/4294967296*2-1)*.18;
    for (let n = 0; n < p.notes.length; n++) {
      const age = t - n * p.spacing; if (age < 0) continue;
      const frequency = p.notes[n]!, decay = cue === 'button' ? 60 : cue === 'remove' ? 32 : cue === 'error' ? 22 : cue === 'slide' ? 26 : cue === 'exit' ? 35 : cue === 'win' || cue === 'award' ? 8.5 : 13;
      const envelope = Math.min(1, age / .004) * Math.exp(-age * decay) * Math.min(1, (p.length - t) / .025);
      const phase = 2 * Math.PI * frequency * age * (cue === 'error' ? 1 - Math.min(.24, age*.9) : cue === 'remove' ? 1-Math.min(.08,age*.5) : 1);
      value += (Math.sin(phase) + .21 * Math.sin(phase * 2) + .07 * Math.sin(phase * 3.01)) * envelope;
    }
    if (cue === 'error' || cue === 'slide') value += noise*(cue === 'error' ? 1.8 : 1.1)*Math.min(1,t/.002)*Math.exp(-t*30)*Math.min(1,(p.length-t)/.02);
    samples[i] = Math.tanh(value) * (cue === 'button' ? .15 : cue === 'slide' ? .13 : cue === 'exit' ? .12 : .205);
  }
  return samples;
}
export function createSound() {
  const buffers = new Map<SoundCue, AudioBuffer>();
  let context: AudioContext | undefined;
  const interrupted = (): void => { if (context?.state !== 'running') player.cancel(); };
  const player = new OneShotPlayer({ createContext: () => { context = new AudioContext({ latencyHint: 'interactive' }); context.addEventListener('statechange', interrupted); return context; }, groups: { button: { minIntervalMs: 45 }, remove: { minIntervalMs: 35, replacementFadeMs: 8 }, error: { minIntervalMs: 90 }, slide: { minIntervalMs: 90 }, exit: { minIntervalMs: 55, replacementFadeMs: 8 }, special: { minIntervalMs: 100 }, win: { minIntervalMs: 700 } }, maxVoices: 6, resumeDeadlineMs: 90 });
  let eligibility = { gameplay: false, ui: false };
  return {
    resetGameplay(): void { player.setEligibility({ ...eligibility, gameplay: false }); player.setEligibility(eligibility); },
    setEligibility(value: { gameplay: boolean; ui: boolean }): void { eligibility = value; player.setEligibility(value); },
    play(cue: SoundCue, channel: OneShotChannel = 'gameplay', rate = 1): void {
      player.play({ group: cue === 'hint' || cue === 'life' ? 'special' : cue === 'award' ? 'win' : cue, channel, gain: cue === 'win' || cue === 'award' ? .9 : cue === 'remove' || cue === 'error' ? .8 : .65, playbackRate: rate, buffer: context => {
        let buffer = buffers.get(cue); if (!buffer) { const samples = soundSamples(cue, context.sampleRate); buffer = context.createBuffer(1, samples.length, context.sampleRate); buffer.copyToChannel(samples, 0); buffers.set(cue, buffer); } return buffer;
      } });
    },
    destroy(): void { context?.removeEventListener('statechange', interrupted); player.dispose(); buffers.clear(); },
  };
}
