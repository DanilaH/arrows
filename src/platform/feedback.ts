import type { GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';
import type { SettingsStore } from '../app/settings';
import { createHaptics, type HapticCue } from './haptics';
import { createSound, type SoundCue } from './sound';
const hapticCue: Record<SoundCue, HapticCue | null> = { button: 'button', remove: 'remove', slide: 'button', exit: null, error: 'error', hint: 'hint', life: 'life', win: 'win', perfect: 'win', award: 'win',auto:null,'repeat-error':'button','help-final':'hint' };
const softBlockers = new Set(['menu', 'dialog', 'trophy-preview', 'settings']);
export const feedbackEligibility = (reasons: readonly string[]): { gameplay: boolean; ui: boolean } => ({ gameplay: reasons.length === 0, ui: !reasons.some(reason => !softBlockers.has(reason)) });
export function createFeedback(activity: GameplayActivityCoordinator, settings: SettingsStore) {
  const sound = createSound(), haptics = createHaptics(); let eligibility = feedbackEligibility(activity.getBlockReasons());
  let lastRemoval = -Infinity, chain = 0;
  const refresh = (): void => {
    eligibility = feedbackEligibility(activity.getBlockReasons());
    sound.setEligibility({ gameplay: eligibility.gameplay && settings.state.sound, ui: eligibility.ui && settings.state.sound });
    haptics.setEnabled(settings.state.vibration); haptics.setBlocked(!eligibility.ui);
  };
  const offReasons = activity.onBlockReasonsChange(() => { haptics.cancel(); refresh(); });
  const offSettings = settings.subscribe(refresh);
  return {
    resetGameplay(): void { chain = 0; lastRemoval = -Infinity; sound.resetGameplay(); haptics.cancel(); },
    previewVibration(): void { if (eligibility.ui && settings.state.vibration) haptics.pulse('life'); },
    previewSound(): void { if (eligibility.ui && settings.state.sound) sound.play('win', 'ui'); },
    play(cue: SoundCue, channel: 'gameplay' | 'ui' = 'gameplay'): void {
      if (!eligibility[channel]) return;
      const now = performance.now(); let rate = 1;
      if (cue === 'remove') { chain = now - lastRemoval < 650 ? Math.min(chain + 1, 4) : 0; lastRemoval = now; rate = [1, 1.035, 1.07, 1.105, 1.14][chain]!; }
      if(cue==='error'||cue==='repeat-error')sound.resetGameplay();
      if (settings.state.sound) sound.play(cue, channel, rate);
      const haptic = cue === 'remove' && chain >= 3 ? 'combo' : hapticCue[cue]; if (haptic) haptics.pulse(haptic);
    },
    destroy(): void { offReasons(); offSettings(); sound.destroy(); haptics.destroy(); },
  };
}
