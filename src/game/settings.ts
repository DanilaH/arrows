import type { UiMotion } from './uiMotion';
import { copy } from '../app/language';
import type { SettingsStore } from '../app/settings';
import type { GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';
import type { createFeedback } from '../platform/feedback';
const closeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
export const settingsIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></svg>';
const themeArt = (theme: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true">${theme==='dark' ? '<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/>' : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'}</svg>`;
export function installSettingsSurface(store: SettingsStore, activity: GameplayActivityCoordinator, feedback: ReturnType<typeof createFeedback>, beforeOpen: () => void, motion: UiMotion) {
  const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog')!;
  let focus: HTMLElement | null = null, renderedLanguage = '';
  const render = (): void => {
    const text = copy[store.state.language]; renderedLanguage = store.state.language;
    const activeId = dialog.contains(document.activeElement) ? (document.activeElement as HTMLElement).id : '';
    dialog.innerHTML = `<header class="settings-heading"><div><span class="settings-eyebrow">${text.title}</span><h2 id="settings-title">${text.settings}</h2></div><button id="close-settings" class="circle" type="button" aria-label="${text.close}">${closeIcon}</button></header>
      <section class="settings-section"><h3>${text.appearance}</h3><div class="theme-choices">${(['dark', 'light'] as const).map(theme => `<button id="theme-${theme}" class="theme-choice ${theme}" type="button" data-theme="${theme}" aria-pressed="false"><span class="theme-swatch">${themeArt(theme)}</span><span>${theme === 'dark' ? text.darkTheme : text.lightTheme}<i aria-hidden="true">✓</i></span></button>`).join('')}</div></section>
      <section class="settings-section"><h3>${text.feedback}</h3><div class="settings-group">${(['sound', 'vibration'] as const).map(key => `<button id="setting-${key}" class="setting-toggle" type="button" role="switch" aria-checked="false" aria-labelledby="${key}-label" data-toggle="${key}"><span><strong id="${key}-label">${key === 'sound' ? text.sounds : text.vibrations}</strong><small>${key === 'sound' ? text.soundDescription : text.vibrationDescription}</small></span><i class="switch-track" aria-hidden="true"><i></i></i></button>`).join('')}</div><button id="preview-sound" data-feedback-preview type="button" class="sound-preview"><span aria-hidden="true">♪</span>${text.previewSound}</button></section>
      <section class="settings-section"><label class="language-setting" for="setting-language"><span>${text.language}</span><select id="setting-language"><option value="ru">Русский</option><option value="en">English</option></select></label></section>
      <footer class="settings-save"><span id="settings-save-status" role="status"></span><button id="retry-settings" type="button" hidden>${text.retrySettings}</button></footer>`;
    if (activeId) dialog.querySelector<HTMLElement>('#' + activeId)?.focus({ preventScroll: true });
  };
  const refresh = (): void => {
    if (!dialog.open) return;
    if (renderedLanguage !== store.state.language) render();
    const text = copy[store.state.language];
    for (const button of dialog.querySelectorAll<HTMLButtonElement>('[data-theme]')) button.setAttribute('aria-pressed', String(button.dataset.theme === store.state.theme));
    for (const key of ['sound', 'vibration'] as const) dialog.querySelector('#setting-' + key)!.setAttribute('aria-checked', String(store.state[key]));
    (dialog.querySelector('#setting-language') as HTMLSelectElement).value = store.state.language;
    (dialog.querySelector('#preview-sound') as HTMLButtonElement).disabled = !store.state.sound;
    dialog.querySelector('#settings-save-status')!.textContent = store.status === 'error' ? text.settingsSaveError : store.status === 'saving' ? text.savingSettings : store.status === 'loading' ? text.loadingSettings : text.settingsSaved;
    (dialog.querySelector('#retry-settings') as HTMLButtonElement).hidden = store.status !== 'error';
  };
  const close = (): boolean => {
    if (!dialog.open) return false;
    motion.close(dialog, () => {
      document.querySelector('#home-settings')?.setAttribute('aria-expanded','false');
      activity.setBlocked('settings', false);
      const target = focus?.isConnected ? focus : focus?.id ? document.getElementById(focus.id) : null;
      target?.focus({ preventScroll: true });
    });
    return true;
  };
  const click = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button'); if (!button || button.disabled) return;
    if (button.id === 'close-settings') close();
    else if (button.dataset.theme === 'light' || button.dataset.theme === 'dark') void store.update({ theme: button.dataset.theme });
    else if (button.dataset.toggle === 'sound' || button.dataset.toggle === 'vibration') { const key = button.dataset.toggle; void store.update({ [key]: !store.state[key] }); }
    else if (button.id === 'retry-settings') void store.save();
    else if (button.id === 'preview-sound') feedback.previewSound();
  };
  const change = (event: Event): void => { const target = event.target as HTMLSelectElement; if (target.id === 'setting-language' && (target.value === 'ru' || target.value === 'en')) void store.update({ language: target.value }); };
  const cancel = (event: Event): void => { event.preventDefault(); close(); };
  dialog.addEventListener('click', click); dialog.addEventListener('change', change); dialog.addEventListener('cancel', cancel);
  const unsubscribe = store.subscribe(refresh);
  return {
    open(): void { if (dialog.open) return; beforeOpen(); focus = document.activeElement as HTMLElement | null; activity.setBlocked('settings', true); document.querySelector('#home-settings')?.setAttribute('aria-expanded','true'); render(); motion.open(dialog); refresh(); }, close,
    destroy(): void { close(); unsubscribe(); dialog.removeEventListener('click', click); dialog.removeEventListener('change', change); dialog.removeEventListener('cancel', cancel); dialog.replaceChildren(); },
  };
}
