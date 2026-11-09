import type { createAds } from '../platform/ads';
import { copy, type GameLanguage } from '../app/language';
export function installAdSurface(ads: ReturnType<typeof createAds>, language: () => GameLanguage, cancel: () => void) {
  const dialog = document.querySelector<HTMLDialogElement>('#ad-dialog')!;
  let preparing = false, focus: HTMLElement | null = null;
  const refresh = (): void => {
    const state = ads.state, text = copy[language()];
    if (state.phase === 'idle' && !preparing) { if (dialog.open) { dialog.close(); if (focus?.isConnected) focus.focus({ preventScroll: true }); } return; }
    const loading = state.phase === 'loading' || state.phase === 'idle';
    dialog.querySelector('#ad-title')!.textContent = state.phase === 'idle' ? text.adPreparing : loading ? text.adLoading : text.adOpening;
    dialog.querySelector('#ad-description')!.textContent = text.adDescription;
    const button = dialog.querySelector<HTMLButtonElement>('#ad-cancel')!; button.textContent = text.cancelAd; button.hidden = !loading;
    dialog.classList.toggle('ad-loading', loading);
    if (!dialog.open) { focus = document.activeElement as HTMLElement | null; dialog.showModal(); }
  };
  dialog.innerHTML = '<div class="ad-spinner" aria-hidden="true"></div><h2 id="ad-title"></h2><p id="ad-description"></p><button id="ad-cancel" type="button"></button>';
  const unsubscribe = ads.subscribe(state => { if (state.phase !== 'idle') preparing = false; refresh(); });
  const click = (): void => cancel();
  const escape = (event: Event): void => { event.preventDefault(); if (ads.state.phase === 'loading' || preparing) cancel(); };
  dialog.querySelector('#ad-cancel')!.addEventListener('click', click); dialog.addEventListener('cancel', escape);
  return {
    prepare(): void { preparing = true; refresh(); },
    endPreparation(): void { preparing = false; refresh(); },
    destroy(): void { unsubscribe(); dialog.querySelector('#ad-cancel')!.removeEventListener('click', click); dialog.removeEventListener('cancel', escape); dialog.close(); dialog.replaceChildren(); },
  };
}
