import { GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';
import { createAds, type AdEvent, type AdOutcome } from '../../src/platform/ads';
import { installAdSurface } from '../../src/game/adSurface';
import { createAdTransition } from '../../src/platform/adTransition';
// Built into memory by this test only; never an entry/import of the application build.
const activity = new GameplayActivityCoordinator(() => {}, () => {});
let event!: (value: AdEvent) => void, settle: ((result: AdOutcome) => void) | undefined, id = '', phase = 'idle', advances = 0;
const ads = createAds(activity, { track() {} }, {
  async prepareInterstitial() {}, async pending() { return { receipts: [] }; }, async acknowledge() {},
  async addListener(_name, listener) { event = listener; return { remove: async () => {} }; },
  show(options) { id = options.requestId!; phase = 'loading'; return new Promise(resolve => { settle = resolve; }); },
  async cancelPending() { if (phase === 'loading') { phase = 'idle'; settle?.({ shown: false, outcome: 'cancelled' }); } },
});
ads.installRewardCommit(async () => 'applied');
const view = installAdSurface(ads, () => document.documentElement.lang === 'en' ? 'en' : 'ru', () => ads.cancel());
const flow = createAdTransition(activity, () => {}, () => {});
const request = () => ads.show({ kind: 'interstitial', placement: 'continue', attempt: 'test-owned-attempt', mode: 'campaign' });
Reflect.set(window, 'adFixture', {
  start() { flow.start(async () => true, request, async () => { advances++; }); },
  shown() { phase = 'shown'; event({ kind: 'interstitial', phase: 'show', requestId: id }); },
  dismiss() { phase = 'idle'; settle?.({ shown: true, outcome: 'dismissed' }); },
  background(value: boolean) { activity.setBlocked('native-background', value); },
  snapshot() { return { advances, phase: ads.state.phase, busy: flow.busy, blocked: activity.getBlockReasons() }; },
  destroy() { view.destroy(); flow.destroy(); ads.destroy(); },
});
