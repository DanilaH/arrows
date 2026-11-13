import { OneShotPlayer, type OneShotChannel } from '@danilah/mini-games-kit/audio';
export type SoundCue = 'button' | 'remove' | 'slide' | 'exit' | 'error' | 'hint' | 'life' | 'win' | 'perfect' | 'award' | 'auto' | 'repeat-error' | 'help-final';
type Profile = { length: number; tap: number; air: number; tail: number; tone: number };
const profiles: Record<SoundCue, Profile> = {
  auto: {length:.07,tap:.25,air:.55,tail:65,tone:160},
  'repeat-error': {length:.09,tap:.38,air:.18,tail:60,tone:98},
  'help-final': {length:.22,tap:.32,air:.7,tail:19,tone:205},
  button: {length:.055,tap:.85,air:.28,tail:95,tone:185},
  remove: {length:.115,tap:1,air:.8,tail:58,tone:160},
  slide: {length:.12,tap:.08,air:1.05,tail:30,tone:125},
  exit: {length:.085,tap:.1,air:.72,tail:42,tone:175},
  error: {length:.2,tap:1.1,air:.36,tail:43,tone:98},
  hint: {length:.24,tap:.4,air:.65,tail:18,tone:230},
  life: {length:.34,tap:.42,air:.8,tail:13,tone:195},
  win: {length:.68,tap:.42,air:1,tail:7,tone:180},
  perfect: {length:.82,tap:.48,air:1.1,tail:6,tone:215},
  award: {length:.8,tap:.48,air:1.1,tail:6,tone:205},
};
/** Original soft tactile transients and filtered-air releases. The body settles
 * within milliseconds; no sustained modal chord, stepped melody or buzzer. */
export function soundSamples(cue: SoundCue, sampleRate: number): Float32Array<ArrayBuffer> {
  const p=profiles[cue], samples=new Float32Array(Math.ceil(p.length*sampleRate));
  const bloom=cue==='win'||cue==='perfect'||cue==='award';
  let seed=19027, warm=0, silk=0, body=0;
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const white=seed/4294967296*2-1;
    // A moving low-pass makes the release an airy swipe, without white hiss.
    const cutoff=450+2100*Math.exp(-t*(bloom?5:24));
    warm+=(white-warm)*(1-Math.exp(-2*Math.PI*cutoff/sampleRate));
    silk+=(warm-silk)*(1-Math.exp(-2*Math.PI*280/sampleRate));
    body+=(white-body)*(1-Math.exp(-2*Math.PI*90/sampleRate));
    const attack=1-Math.exp(-t/(bloom?.018:.0014));
    const release=Math.min(1,Math.max(0,(p.length-t)/.025));
    const thock=Math.sin(2*Math.PI*p.tone*(t*.66+.008*(1-Math.exp(-t*42))))*Math.exp(-t*95)*p.tap;
    const swipe=(warm-silk)*p.air*Math.exp(-t*p.tail)*(1-Math.exp(-t/(bloom?.06:.006)));
    const cushion=body*Math.exp(-t*(bloom?8:48))*.6;
    // Two breath-like accents distinguish a finish without turning it into a tune.
    const finish=bloom ? (warm-silk)*(.5*Math.exp(-(((t-.12)/.07)**2))+.35*Math.exp(-(((t-.29)/.11)**2))) : 0;
    samples[i]=Math.tanh((thock+swipe+cushion+finish)*1.7)*.205*attack*release;
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
      player.play({ group: cue === 'auto' ? 'exit' : cue === 'repeat-error' ? 'error' : cue === 'help-final' || cue === 'hint' || cue === 'life' ? 'special' : cue === 'award' || cue === 'perfect' ? 'win' : cue, channel, gain: cue === 'win' || cue === 'perfect' || cue === 'award' ? .9 : cue === 'remove' || cue === 'error' ? .8 : .65, playbackRate: rate, buffer: context => {
        let buffer = buffers.get(cue); if (!buffer) { const samples = soundSamples(cue, context.sampleRate); buffer = context.createBuffer(1, samples.length, context.sampleRate); buffer.copyToChannel(samples, 0); buffers.set(cue, buffer); } return buffer;
      } });
    },
    destroy(): void { context?.removeEventListener('statechange', interrupted); player.dispose(); buffers.clear(); },
  };
}
