import { OneShotPlayer, type OneShotChannel } from '@danilah/mini-games-kit/audio';
export type SoundCue = 'button' | 'remove' | 'slide' | 'exit' | 'error' | 'hint' | 'life' | 'win' | 'perfect' | 'award' | 'auto' | 'repeat-error' | 'help-final';
import bank from './soundBank.json';
type Clip = keyof typeof bank.clips;
const clips: Record<SoundCue, Clip> = {button:'tap',remove:'remove',slide:'air',exit:'air',error:'error',hint:'hint',life:'life',win:'win',perfect:'perfect',award:'perfect',auto:'remove','repeat-error':'error','help-final':'hint'};
const decoded = new Map<Clip, Float32Array>();
/** Tiny bundled, licensed samples: synchronous first tap, no fetch/decode queue.
 * Resampling stays off the audio graph; OneShotPlayer owns all voice/lifecycle work. */
export function soundSamples(cue: SoundCue, sampleRate: number): Float32Array<ArrayBuffer> {
  const clip = clips[cue]; let pcm = decoded.get(clip);
  if (!pcm) {
    const binary = atob(bank.clips[clip]); pcm = new Float32Array(binary.length / 2);
    for (let i = 0; i < pcm.length; i++) { const word = binary.charCodeAt(i * 2) | binary.charCodeAt(i * 2 + 1) << 8; pcm[i] = (word >= 32768 ? word - 65536 : word) / 32768; }
    decoded.set(clip, pcm);
  }
  const out = new Float32Array(Math.ceil(pcm.length * sampleRate / bank.sampleRate));
  for (let i = 0; i < out.length; i++) { const at = i * bank.sampleRate / sampleRate, left = Math.floor(at), fraction = at - left; out[i] = (pcm[left] ?? 0) * (1 - fraction) + (pcm[left + 1] ?? 0) * fraction; }
  return out;
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
      player.play({ group: cue === 'auto' ? 'exit' : cue === 'repeat-error' ? 'error' : cue === 'help-final' || cue === 'hint' || cue === 'life' ? 'special' : cue === 'award' || cue === 'perfect' ? 'win' : cue, channel, gain: cue === 'win' || cue === 'perfect' || cue === 'award' ? .9 : cue === 'remove' || cue === 'error' ? .8 : cue === 'exit' || cue === 'auto' ? .28 : .65, playbackRate: rate, buffer: context => {
        let buffer = buffers.get(cue); if (!buffer) { const samples = soundSamples(cue, context.sampleRate); buffer = context.createBuffer(1, samples.length, context.sampleRate); buffer.copyToChannel(samples, 0); buffers.set(cue, buffer); } return buffer;
      } });
    },
    destroy(): void { context?.removeEventListener('statechange', interrupted); player.dispose(); buffers.clear(); },
  };
}
