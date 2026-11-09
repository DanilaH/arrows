import type { ProgressStore } from '../progression/save';
import { collectionOpen, challengeOpen, collectionStats, medals, earnedAwards } from '../progression/collection';
import { calendarDate, localDate, monthDates } from '../progression/calendar';
import { dailyCatalog, dailyMonths, dailyDates } from '../content/daily';
import { campaign } from '../content/campaign';
import { trophy } from './trophies';
import { settingsIcon } from './settings';
import { copy, type GameLanguage } from '../app/language';

export type AppScreen = 'home' | 'collection' | 'calendar' | 'game';
const badge = (key: string): string => `<svg viewBox="0 0 72 84" aria-hidden="true"><path d="m20 51-3 27 19-9 19 9-3-27"/><circle cx="36" cy="32" r="25"/><path d="${key === 'legend' ? 'm21 34 6-12 9 10 9-10 6 12-5 9H26Z' : key === 'perfect' ? 'm23 32 9 9 18-19' : 'M39 15c9 13-4 13 4 24 2-6 7-8 7-8 4 18-23 23-26 8-2-8 8-15 8-15-2 10 3 11 3 11-3-9 6-12 4-20Z'}"/></svg>`;

export function installMetaSurface(progress: ProgressStore, language: GameLanguage, options: {
  blocked(value: boolean): void; previewBlocked(value: boolean): void; visited(screen: AppScreen): void; controls(): void; settings(): void; leaveGame(): void; enterCampaign(): void; enterDaily(date: string): Promise<void>;
}) {
  const root = document.querySelector<HTMLElement>('#meta-screen')!, shell = document.querySelector<HTMLElement>('#game-shell')!;
  let text = copy[language];
  let locale = language === 'ru' ? 'ru-RU' : 'en-US';
  let monthFormat = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  let monthNameFormat = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
  let dayFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' });
  let shortDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  let screen: AppScreen = 'home', alive = true, ready = false, busy = false, revision = 0;
  let month = dailyMonths.includes(localDate().slice(0, 7)) ? localDate().slice(0, 7) : dailyMonths[0]!;
  let selected = dailyDates.filter(d => d <= localDate()).at(-1) ?? dailyDates[0]!;
  let calendarParent: 'home' | 'collection' = 'home';
  const installedYears = [...new Set(dailyMonths.map(key => key.slice(0, 4)))];
  let calendarNotice = '', collectionYear = installedYears.includes(localDate().slice(0, 4)) ? localDate().slice(0, 4) : installedYears.at(-1)!;
  const trophyDialog = document.querySelector<HTMLDialogElement>('#trophy-viewer')!;
  let trophyFocus: HTMLElement | null = null;
  const scroll = new Map<AppScreen, number>();
  const dateLabel = (key: string): string => key ? shortDate.format(calendarDate(key)) : '—';
  const title = (value: string): string => `<header class="meta-header"><button class="circle" type="button" data-nav="back" aria-label="${text.back}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button><h1 id="menu-title" tabindex="-1">${value}</h1><span class="meta-header-spacer"></span></header>`;
  const home = (): string => {
    const save = progress.state, a = save.campaign, stats = collectionStats(save), unlocked = collectionOpen(save), challenge = challengeOpen(save);
    const newAward = unlocked && (!save.collectionSeen || earnedAwards(save).some(key => !save.seenAwards.includes(key)));
    const remaining = a.level.arrows.filter(v => !a.board.removed.includes(v.id));
    const paths = remaining.map(v => {
      const h = v.path.at(-1)!, before = v.path.at(-2)!, dx = Math.sign(h.x - before.x), dy = Math.sign(h.y - before.y), size = .35;
      return `<polyline points="${v.path.map(p => `${p.x},${p.y}`).join(' ')}"/><path d="M${h.x - dx * size - dy * size / 2} ${h.y - dy * size + dx * size / 2}L${h.x} ${h.y}L${h.x - dx * size + dy * size / 2} ${h.y - dy * size - dx * size / 2}"/>`;
    }).join('');
    const difficulty = a.level.difficulty === 'normal' ? '' : a.level.difficulty === 'hard' ? 'Hard' : 'Nightmare';
    return `<div class="home-layout"><header class="home-heading"><h1 id="menu-title" tabindex="-1">${text.title}</h1><div class="home-tools"><span class="streak-chip">${text.streakShort} ${stats.current}</span><button id="home-settings" type="button" class="circle settings-button" aria-label="${text.settings}">${settingsIcon}</button></div></header>
      <section class="home-current"><p class="eyebrow">${text.level} ${save.index + 1}</p><span class="home-difficulty">${difficulty}</span>
      <svg class="home-board" viewBox="-1 -1 ${a.level.width + 1} ${a.level.height + 1}" aria-hidden="true">${paths || '<circle cx="4" cy="6" r="2"/>'}</svg>
      <button id="home-play" class="primary" type="button" ${!ready || busy ? 'disabled' : ''}>${a.started ? text.resume : text.play}<span aria-hidden="true"> →</span></button>
      <p class="home-progress">${text.chapter}: ${save.wins.length} / ${campaign.length}</p></section>
      <nav class="home-destinations"><button id="home-collection" type="button" ${!ready || !unlocked ? 'disabled' : ''}><span class="nav-symbol">◇</span><span>${text.collection}<small>${unlocked ? text.recordsAndAwards : text.unlock10}</small></span>${newAward ? '<i class="new-dot"></i>' : ''}</button>
      <button id="home-calendar" type="button" ${!ready || !challenge ? 'disabled' : ''}><span class="nav-symbol">▦</span><span>${text.challenge}<small>${challenge ? dayFormat.format(calendarDate(selected)) : text.unlock20}</small></span></button></nav><button id="home-controls" class="review-link" type="button">${text.controlFields}</button></div>`;
  };
  const collection = (): string => {
    const save = progress.state, stats = collectionStats(save);
    const records = [[text.longest, stats.longest, stats.longestDate], [text.highest, stats.highest, stats.highestDate], [text.most, stats.most, stats.mostDate]] as const;
    return title(text.collection) + `<div class="meta-content"><section class="record-grid">${records.map(([label, value, date]) => `<article><span>${label}</span><strong>${value}</strong><small>${dateLabel(date)}</small></article>`).join('')}</section>
      <details class="record-rules"><summary>${text.recordRules}</summary><p>${text.recordRulesText}</p></details>
      <h2>${text.achievements}</h2><section class="medal-grid">${medals(save).map(m => `<article class="medal ${m.earned ? 'earned' : ''}" data-medal="${m.id}" data-earned="${m.earned}">${badge(m.id)}<h3>${text[`${m.id}Name` as keyof typeof text]}</h3><p>${text[`${m.id}Rule` as keyof typeof text]}</p><progress value="${Math.min(m.target, m.progress)}" max="${m.target}"></progress><small>${Math.min(m.target, m.progress)} / ${m.target}</small></article>`).join('')}</section>
      <h2 class="trophy-heading">${text.challengeTrophies}${installedYears.length > 1 ? `<label class="trophy-year"><select id="trophy-year" aria-label="${text.collectionYear}">${installedYears.map(y => `<option value="${y}" ${y === collectionYear ? 'selected' : ''}>${y}</option>`).join('')}</select></label>` : `<span class="trophy-year">${collectionYear}</span>`}</h2>
      <div class="trophy-list">${dailyMonths.filter(m => m.startsWith(collectionYear + '-')).map(m => {
        const dates = monthDates(m), done = dates.filter(d => save.dailyWins[d]).length, earned = save.cups.includes(m);
        return `<button class="month-trophy ${earned ? 'earned' : ''}" type="button" data-month="${m}" aria-label="${monthFormat.format(calendarDate(m + '-01'))}: ${done} / ${dates.length}" ${!challengeOpen(save) ? 'disabled' : ''}>${trophy(m, earned, { ...(earned ? { binding: save.trophyDesigns[m]! } : {}), scope: 'collection' })}<span><strong>${monthNameFormat.format(calendarDate(m + '-01'))}</strong><small>${earned ? text.cupEarned : `${done} / ${dates.length}`}</small><progress value="${done}" max="${dates.length}"></progress></span><b aria-hidden="true">${earned ? '✓' : ''}</b></button>`;
      }).join('')}</div></div>`;
  };
  const calendar = (): string => {
    const save = progress.state, today = localDate(), index = dailyMonths.indexOf(month), dates = monthDates(month);
    if (!selected.startsWith(month)) selected = dates.filter(d => d <= today).at(-1) ?? dates[0]!;
    const firstWeekday = (calendarDate(dates[0]!).getUTCDay() + 6) % 7, done = dates.filter(d => save.dailyWins[d]).length;
    const week = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(calendarDate(`2026-11-${String(2 + i).padStart(2, '0')}`)));
    const current = save.daily[selected], completed = !!save.dailyWins[selected], allowed = selected <= today && !!dailyCatalog[selected] && challengeOpen(save);
    const difficulty = dailyCatalog[selected]?.difficulty;
    return title(text.challenge) + `<div class="meta-content calendar-content"><section class="month-award"><button id="view-trophy" class="trophy-inspect" type="button" aria-label="${text.inspectTrophy}">${trophy(month, save.cups.includes(month), { ...(save.cups.includes(month) ? { binding: save.trophyDesigns[month]! } : {}), scope: 'calendar' })}<span>${text.inspectTrophy}</span></button><p>${done} / ${dates.length} · ${text.daysDone}</p><small>${text.cupRule}</small></section>
      <div class="month-heading"><button class="circle" type="button" data-shift="-1" aria-label="${text.previousMonth}" ${index <= 0 ? 'disabled' : ''}>‹</button><h2>${monthFormat.format(calendarDate(month + '-01'))}</h2><button class="circle" type="button" data-shift="1" aria-label="${text.nextMonth}" ${index >= dailyMonths.length - 1 ? 'disabled' : ''}>›</button></div>
      <div class="weekdays" aria-hidden="true">${week.map(d => `<span>${d}</span>`).join('')}</div>
      <div class="calendar-grid" role="group" aria-label="${monthFormat.format(calendarDate(month + '-01'))}">${'<span></span>'.repeat(firstWeekday)}${dates.map(date => `<button type="button" class="calendar-day ${save.dailyWins[date] ? 'done' : ''} ${date === today ? 'today' : ''}" data-date="${date}" aria-label="${dayFormat.format(calendarDate(date))}${save.dailyWins[date] ? ', ' + text.dayCompleted : ''}" aria-pressed="${date === selected}" ${date > today ? 'disabled' : ''}>${Number(date.slice(-2))}${save.dailyWins[date] ? '<small aria-hidden="true">✓</small>' : ''}</button>`).join('')}</div>
      <section class="selected-day"><h3>${dayFormat.format(calendarDate(selected))}</h3><span>${completed ? text.dayCompleted : difficulty === 'normal' ? text.dailyPuzzle : difficulty === 'hard' ? 'Hard' : 'Nightmare'}</span><button id="start-daily" class="primary" type="button" ${!ready || !allowed || busy ? 'disabled' : ''}>${completed ? text.viewResult : current?.started ? text.resume : text.play}</button><p id="calendar-notice" role="status">${calendarNotice || (selected > today ? text.futureDay : '')}</p></section></div>`;
  };
  const refresh = (): void => {
    if (!alive || screen === 'game') return;
    const focus = document.activeElement as HTMLElement | null;
    const key = focus?.id || focus?.dataset.date || focus?.dataset.month || focus?.dataset.shift;
    const oldScroll = root.scrollTop;
    root.innerHTML = screen === 'home' ? home() : screen === 'collection' ? collection() : calendar();
    root.scrollTop = oldScroll;
    if (key) Array.from(root.querySelectorAll<HTMLElement>('button')).find(b => b.id === key || b.dataset.date === key || b.dataset.month === key || b.dataset.shift === key)?.focus({ preventScroll: true });
  };
  const show = (next: AppScreen, date?: string): void => {
    revision++;
    if (next === 'calendar' && (screen === 'home' || screen === 'collection')) calendarParent = screen;
    scroll.set(screen, root.scrollTop);
    if (screen === 'game' && next !== 'game') options.leaveGame();
    screen = next; shell.dataset.screen = screen; root.hidden = screen === 'game'; options.blocked(screen !== 'game'); options.visited(screen);
    if (date && dailyCatalog[date]) { selected = date; month = date.slice(0, 7); }
    if (screen !== 'game') { refresh(); root.scrollTop = scroll.get(screen) ?? 0; root.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }); }
  };
  const back = (): void => show(screen === 'calendar' ? calendarParent : 'home');
  const closeTrophy = (): boolean => {
    if (!trophyDialog.open) return false;
    trophyDialog.close(); options.previewBlocked(false);
    if (trophyFocus?.isConnected) trophyFocus.focus({ preventScroll: true });
    return true;
  };
  const openTrophy = (key: string): void => {
    if (!dailyMonths.includes(key)) return;
    trophyFocus = document.activeElement as HTMLElement | null;
    const save = progress.state, owned = save.cups.includes(key), done = monthDates(key).filter(d => save.dailyWins[d]).length;
    trophyDialog.innerHTML = `<header class="trophy-viewer-heading"><h2 id="trophy-viewer-title">${monthFormat.format(calendarDate(key + '-01'))}</h2><button class="circle" type="button" data-close-trophy aria-label="${text.close}">×</button></header>
      <span class="trophy-preview-label">${owned ? text.cupEarned : text.rewardPreview}</span>
      <div class="trophy-portrait">${trophy(key, true, { ...(owned ? { binding: save.trophyDesigns[key]! } : {}), scope: 'viewer' })}</div>
      <p>${done} / ${monthDates(key).length} · ${text.daysDone}</p>
      <p class="trophy-rule">${text.cupRule}</p><button class="primary" type="button" data-open-month="${key}">${text.openMonth}</button>`;
    options.previewBlocked(true); if (!trophyDialog.open) trophyDialog.showModal();
  };
  const viewerClick = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button'); if (!button) return;
    if (button.hasAttribute('data-close-trophy')) closeTrophy();
    if (button.dataset.openMonth && dailyMonths.includes(button.dataset.openMonth)) { month = button.dataset.openMonth; closeTrophy(); show('calendar'); }
  };
  const viewerCancel = (event: Event): void => { event.preventDefault(); closeTrophy(); };
  const changeYear = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    if (target.id !== 'trophy-year' || !installedYears.includes(target.value)) return;
    collectionYear = target.value; refresh(); root.querySelector<HTMLElement>('#trophy-year')?.focus({ preventScroll: true });
  };
  const click = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!target || target.disabled || busy) return;
    if (target.dataset.nav === 'back') back();
    else if (target.id === 'home-settings') options.settings();
    else if (target.id === 'home-controls') options.controls();
    else if (target.id === 'home-play') options.enterCampaign();
    else if (target.id === 'home-collection') {
      show('collection'); void progress.markCollectionSeen(earnedAwards(progress.state)).catch(() => refresh());
    } else if (target.id === 'home-calendar') show('calendar');
    else if (target.dataset.month && dailyMonths.includes(target.dataset.month)) { month = target.dataset.month; show('calendar'); }
    else if (target.id === 'view-trophy') openTrophy(month);
    else if (target.dataset.shift) { month = dailyMonths[dailyMonths.indexOf(month) + Number(target.dataset.shift)]!; calendarNotice = ''; refresh(); }
    else if (target.dataset.date) { selected = target.dataset.date; calendarNotice = ''; refresh(); }
    else if (target.id === 'start-daily') {
      busy = true; calendarNotice = ''; refresh();
      void options.enterDaily(selected).catch(() => { calendarNotice = text.dailyUnavailable; }).finally(() => { busy = false; refresh(); });
    }
  };
  root.addEventListener('click', click); root.addEventListener('change', changeYear);
  trophyDialog.addEventListener('click', viewerClick); trophyDialog.addEventListener('cancel', viewerCancel); show('home');
  return { get screen() { return screen; }, get revision() { return revision; }, refresh, show, back, closeTrophy,
    setLanguage(value: GameLanguage): void {
      language = value; text = copy[value]; locale = value === 'ru' ? 'ru-RU' : 'en-US';
      monthFormat = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
      monthNameFormat = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
      dayFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' });
      shortDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }); refresh();
    },
    ready(): void { ready = true; refresh(); },
    destroy(): void { alive = false; closeTrophy(); root.removeEventListener('click', click); root.removeEventListener('change', changeYear); trophyDialog.removeEventListener('click', viewerClick); trophyDialog.removeEventListener('cancel', viewerCancel); trophyDialog.replaceChildren(); root.replaceChildren(); },
  };
}
