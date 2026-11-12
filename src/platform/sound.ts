import { OneShotPlayer, type OneShotChannel } from '@danilah/mini-games-kit/audio';
export type SoundCue = 'button' | 'remove' | 'slide' | 'exit' | 'error' | 'hint' | 'life' | 'win' | 'award';
type Profile = { length: number; modes: readonly number[]; decay: number; attack: number; body: number; air: number; gain: number };
const profiles: Record<SoundCue, Profile> = {
  button: { length: .055, modes: [195, 463, 937], decay: 100, attack: .0018, body: .3, air: 1.5, gain: .15 },
  remove: { length: .115, modes: [165, 398, 853, 1447], decay: 48, attack: .0025, body: .45, air: 1.25, gain: .205 },
  slide: { length: .12, modes: [135, 311], decay: 30, attack: .012, body: .08, air: 1.8, gain: .13 },
  exit: { length: .085, modes: [230, 571], decay: 50, attack: .009, body: .08, air: 1.3, gain: .12 },
  error: { length: .2, modes: [92, 227, 517], decay: 24, attack: .003, body: .7, air: 1.4, gain: .205 },
  hint: { length: .24, modes: [285, 677, 1153], decay: 19, attack: .012, body: .45, air: .75, gain: .18 },
  life: { length: .34, modes: [220, 527, 907], decay: 15, attack: .015, body: .5, air: .6, gain: .19 },
  win: { length: .68, modes: [262, 393, 524, 785], decay: 6, attack: .035, body: .58, air: .55, gain: .205 },
  award: { length: .8, modes: [262, 393, 524, 659, 785], decay: 5.5, attack: .045, body: .58, air: .6, gain: .205 },
};
/** Original damped body/air cues: inharmonic impacts and a warm simultaneous finish bloom.
 * No stepped melody, square waves, external samples or runtime oscillators. */
export function soundSamples(cue: SoundCue, sampleRate: number): Float32Array<ArrayBuffer> {
  const p = profiles[cue], samples = new Float32Array(Math.ceil(p.length * sampleRate));
  let seed = 19027, low = 0, soft = 0;
  const lowMix=1-Math.exp(-2*Math.PI*1800/sampleRate), softMix=1-Math.exp(-2*Math.PI*450/sampleRate);
  const finish=cue==='win'||cue==='award';
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    seed = (Math.imul(seed,1664525)+1013904223)>>>0;
    low += (seed/4294967296*2-1-low)*lowMix; soft += (low-soft)*softMix;
    const attack=1-Math.exp(-t/p.attack), release=Math.min(1,Math.max(0,(p.length-t)/.035));
    let body=0;
    for(let mode=0;mode<p.modes.length;mode++) {
      const frequency=p.modes[mode]!, decay=p.decay*(1+mode*(finish?.12:.48));
      // A slight continuous settling of each resonance, rather than a musical pitch step.
      const phase=2*Math.PI*frequency*(t+(finish?.00015:.0018)*(1-Math.exp(-t*35)));
      body+=Math.sin(phase)*Math.exp(-t*decay)/(1+mode*1.9);
    }
    const air=(soft*.85+(low-soft)*.3)*Math.exp(-t*p.decay*1.35);
    const value=(body*p.body+air*p.air)*attack*release;
    samples[i]=Math.tanh(value)*p.gain;
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
