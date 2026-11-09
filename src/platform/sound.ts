import { OneShotPlayer, type OneShotChannel } from '@danilah/mini-games-kit/audio';
export type SoundCue = 'button' | 'remove' | 'error' | 'hint' | 'life' | 'win' | 'award';
const profiles: Record<SoundCue, { length: number; notes: readonly number[]; spacing: number }> = {
  button: { length: .08, notes: [680], spacing: 0 }, remove: { length: .15, notes: [740], spacing: 0 },
  error: { length: .19, notes: [165, 138], spacing: .055 }, hint: { length: .32, notes: [740, 1109], spacing: .08 },
  life: { length: .38, notes: [523.25, 659.25, 783.99], spacing: .075 },
  win: { length: .72, notes: [523.25, 659.25, 783.99, 1046.5], spacing: .09 },
  award: { length: .9, notes: [523.25, 783.99, 1046.5, 1318.5], spacing: .11 },
};
/** Short original plucked/glass cues. Deterministic, generated only on first use. */
export function soundSamples(cue: SoundCue, sampleRate: number): Float32Array<ArrayBuffer> {
  const p = profiles[cue], samples = new Float32Array(Math.ceil(p.length * sampleRate));
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate; let value = 0;
    for (let n = 0; n < p.notes.length; n++) {
      const age = t - n * p.spacing; if (age < 0) continue;
      const frequency = p.notes[n]!, decay = cue === 'button' ? 60 : cue === 'remove' ? 32 : cue === 'error' ? 24 : 13;
      const envelope = Math.min(1, age / .004) * Math.exp(-age * decay) * Math.min(1, (p.length - t) / .025);
      const phase = 2 * Math.PI * frequency * age;
      value += (Math.sin(phase) + .21 * Math.sin(phase * 2) + .07 * Math.sin(phase * 3.01)) * envelope;
    }
    samples[i] = Math.tanh(value) * (cue === 'error' ? .2 : .16);
  }
  return samples;
}
export function createSound() {
  const buffers = new Map<SoundCue, AudioBuffer>();
  let context: AudioContext | undefined;
  const interrupted = (): void => { if (context?.state !== 'running') player.cancel(); };
  const player = new OneShotPlayer({ createContext: () => { context = new AudioContext({ latencyHint: 'interactive' }); context.addEventListener('statechange', interrupted); return context; }, groups: { button: { minIntervalMs: 45 }, remove: { minIntervalMs: 35, replacementFadeMs: 8 }, error: { minIntervalMs: 90 }, special: { minIntervalMs: 100 }, win: { minIntervalMs: 700 } }, maxVoices: 6, resumeDeadlineMs: 90 });
  return {
    setEligibility(value: { gameplay: boolean; ui: boolean }): void { player.setEligibility(value); },
    play(cue: SoundCue, channel: OneShotChannel = 'gameplay', rate = 1): void {
      player.play({ group: cue === 'hint' || cue === 'life' ? 'special' : cue === 'award' ? 'win' : cue, channel, gain: .7, playbackRate: rate, buffer: context => {
        let buffer = buffers.get(cue); if (!buffer) { const samples = soundSamples(cue, context.sampleRate); buffer = context.createBuffer(1, samples.length, context.sampleRate); buffer.copyToChannel(samples, 0); buffers.set(cue, buffer); } return buffer;
      } });
    },
    destroy(): void { context?.removeEventListener('statechange', interrupted); player.dispose(); buffers.clear(); },
  };
}
