import { startGame } from '../../src/app/bootstrap';
import { createPlatformRuntime } from '../../src/app/platform';
import { createAds, type AdEvent, type AdOutcome, type AdRequest, type EarnedReceipt } from '../../src/platform/ads';
// Test reward transport: the real game, receipt writer and presentation; no SDK video.
startGame([], onBack => {
  const base = createPlatformRuntime(onBack); base.ads.destroy();
  let listener: (event: AdEvent) => void = () => {}, settle: ((result: AdOutcome) => void) | undefined;
  let request: (AdRequest & { requestId?: string }) | undefined, last: EarnedReceipt | undefined;
  let receipts: EarnedReceipt[] = [], shows = 0;
  const ads = createAds(base.activity, base.analytics, {
    async prepareInterstitial() {}, async pending() { return { receipts }; },
    async acknowledge({id}) { receipts = receipts.filter(r => r.id !== id); },
    async addListener(_name, callback) { listener = callback; return { remove: async () => {} }; },
    show(options) { request = options; shows++; return new Promise(resolve => { settle = resolve; }); },
    async cancelPending() { settle?.({shown:false, outcome:'cancelled'}); },
  });
  Reflect.set(window, 'assistanceFixture', {
    back() { return onBack?.() ?? false; },
    snapshot() { return { shows, request, blocked: base.activity.getBlockReasons(), phase: ads.state.phase }; },
    shown() { if(request)listener({...request, phase:'show'}); },
    earn() {
      if(!request || request.placement==='continue')throw Error('No rewarded request');
      last = {id:request.requestId!, schema:1, attempt:request.attempt, mode:request.mode, placement:request.placement};
      receipts.push(last); listener({...request, phase:'earned'});
    },
    duplicate() { if(last)receipts.push(last); void ads.recover(); },
    dismiss(earned = true) { settle?.({shown:true, outcome:'dismissed', earned}); },
    background(value: boolean) { base.activity.setBlocked('native-background', value); },
  });
  const banner = document.createElement('aside'); banner.textContent='Тест подтверждения награды · без рекламы';
  banner.style.cssText='position:fixed;top:65px;left:0;right:0;text-align:center;font:11px system-ui;color:#7b9bba;pointer-events:none;z-index:20'; document.body.append(banner);
  return {...base, ads, destroy() { ads.destroy(); base.destroy(); banner.remove(); }};
});
