import type { GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';
import type { SettingsStore } from '../app/settings';
import { createHaptics } from './haptics';
import { createSound, type SoundCue } from './sound';
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
    previewSound(): void { if (eligibility.ui && settings.state.sound) sound.play('win', 'ui'); },
    play(cue: SoundCue, channel: 'gameplay' | 'ui' = 'gameplay'): void {
      if (!eligibility[channel]) return;
      const now = performance.now(); let rate = 1;
      if (cue === 'remove') { chain = now - lastRemoval < 450 ? (chain + 1) % 5 : 0; lastRemoval = now; rate = 1 + chain * .035; }
      if (settings.state.sound) sound.play(cue, channel, rate);
      haptics.pulse(cue === 'award' ? 'win' : cue);
    },
    destroy(): void { offReasons(); offSettings(); sound.destroy(); haptics.destroy(); },
  };
}
