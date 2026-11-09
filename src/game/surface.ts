import { controlScenes } from '../content/controlScenes';
import { distanceToPath, type Point } from '../domain/geometry';
import { BoardGestures } from '../input/gestures';
import { copy, type GameLanguage } from '../app/language';
import type { createPlatformRuntime } from '../app/platform';
import type { BoardScene } from './BoardScene';

type Platform = ReturnType<typeof createPlatformRuntime>;
export function installGameSurface(scene: BoardScene, platform: Platform, language: GameLanguage) {
  const text = copy[language], root = document.querySelector<HTMLElement>('#game-root')!;
  const shell = document.querySelector<HTMLElement>('#game-shell')!;
  const dialog = document.querySelector<HTMLDialogElement>('#game-dialog')!;
  const content = document.querySelector<HTMLElement>('#dialog-content')!;
  const status = document.querySelector<HTMLElement>('#app-status')!;
  const listeners: Array<() => void> = [];
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let modal: 'levels' | 'restart' | 'lost' | null = null;
  let lastAttempt = '', started = false;
  const names = [text.straightName, text.bentName, text.hardName, text.nightmareName];
  document.querySelector('#choose-field')!.setAttribute('aria-label', text.chooseField);
  document.querySelector('#restart')!.setAttribute('aria-label', text.restart);
  document.querySelector('#guides')!.setAttribute('aria-label', text.guides);
  document.querySelector('#win-title')!.textContent = text.win;
  const point = (event: PointerEvent | WheelEvent): Point => ({ x: event.clientX, y: event.clientY });
  const inBoard = (p: Point): boolean => {
    const view = scene.playArea;
    return p.x >= view.x && p.y >= view.y && p.x <= view.x + view.width && p.y <= view.y + view.height;
  };
  const distance = (id: string, p: Point): number => {
    const arrow = scene.board.remaining.find(a => a.id === id); if (!arrow) return Infinity;
    return distanceToPath(scene.boardCamera.world(p), arrow.path) * scene.boardCamera.scale;
  };
  const gestures = new BoardGestures({
    hit(p) {
      if (!inBoard(p) || platform.activity.isBlocked() || scene.board.hearts === 0 || scene.board.complete) return null;
      const world = scene.boardCamera.world(p);
      const candidates = scene.board.remaining.map(a => ({ id: a.id, distance: distanceToPath(world, a.path) * scene.boardCamera.scale })).filter(a => a.distance <= 11)
        .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
      if (candidates[1] && candidates[1].distance - candidates[0]!.distance < 1.5) return null;
      return candidates[0]?.id ?? null;
    },
    contains: (id, p) => inBoard(p) && distance(id, p) <= 13,
    activate(id) {
      if (platform.activity.isBlocked()) return;
      const result = scene.activate(id); if (result.kind === 'ignored') return;
      if (!started) {
        started = true;
        platform.analytics.track('level_start', { mode: 'control', level_id: scene.board.level.id, content_version: scene.board.level.contentVersion, attempt: scene.board.attemptId, resumed: false });
      }
      platform.activity.setGameplayDesired(!scene.board.complete);
      platform.haptics.pulse(result.kind === 'error' ? 'error' : 'remove');
    },
    preview: id => scene.setPreview(id),
    pan: (dx, dy) => scene.pan(dx, dy),
    pinch: (previous, current, ratio) => scene.zoom(previous, current, ratio),
  });
  const cancel = (): void => {
    if (holdTimer !== undefined) clearTimeout(holdTimer);
    holdTimer = undefined; gestures.cancel();
  };
  const close = (): void => {
    modal = null; dialog.close(); platform.activity.setBlocked('dialog', false); root.focus({ preventScroll: true });
  };
  const open = (kind: NonNullable<typeof modal>): void => {
    cancel(); modal = kind; platform.activity.setBlocked('dialog', true); content.replaceChildren();
    const title = document.createElement('h2'); title.id = 'dialog-title';
    title.textContent = kind === 'levels' ? text.chooseField : kind === 'lost' ? text.noLives : text.restartQuestion;
    content.append(title);
    const button = (label: string, action: () => void, primary = false): void => {
      const element = document.createElement('button'); element.type = 'button'; element.textContent = label;
      if (primary) element.className = 'primary';
      element.addEventListener('click', action); content.append(element);
    };
    if (kind === 'levels') {
      for (let index = 0; index < controlScenes.length; index++) button(names[index]!, () => { close(); scene.loadLevel(index); }, index === scene.selected);
    } else button(text.restart, () => { close(); scene.loadLevel(scene.selected); }, true);
    button(kind === 'lost' ? text.chooseField : text.cancel, () => kind === 'lost' ? open('levels') : close());
    if (!dialog.open) dialog.showModal();
  };
  const sync = (): void => {
    const board = scene.board;
    if (lastAttempt !== board.attemptId) { lastAttempt = board.attemptId; started = false; }
    document.querySelector('#field-name')!.textContent = names[scene.selected]!;
    document.querySelector('#difficulty')!.textContent = board.level.difficulty === 'normal' ? '' : board.level.difficulty === 'hard' ? 'Hard' : 'Nightmare';
    const hearts = document.querySelector<HTMLElement>('#hearts')!;
    hearts.setAttribute('aria-label', `${text.lives}: ${board.hearts}`);
    Array.from(hearts.children).forEach((heart, i) => heart.classList.toggle('empty', i >= board.hearts));
    const remaining = board.remaining.length;
    document.querySelector<HTMLElement>('#progress-fill')!.style.transform = `scaleX(${1 - remaining / board.level.arrows.length})`;
    document.querySelector<HTMLElement>('#board-progress')!.setAttribute('aria-valuenow', String(board.level.arrows.length - remaining));
    document.querySelector<HTMLElement>('#board-progress')!.setAttribute('aria-valuemax', String(board.level.arrows.length));
    shell.dataset.level = board.level.id; shell.dataset.remaining = String(remaining); shell.dataset.lives = String(board.hearts);
    shell.dataset.attempt = board.attemptId; shell.dataset.state = board.complete ? 'complete' : board.hearts === 0 ? 'lost' : 'playing';
    root.dataset.camera = JSON.stringify({ x: scene.boardCamera.x, y: scene.boardCamera.y, scale: scene.boardCamera.scale });
    document.querySelector('#guides')!.setAttribute('aria-pressed', String(scene.guides));
    document.querySelector<HTMLElement>('#win')!.hidden = !scene.finished;
    document.querySelector<HTMLButtonElement>('#next')!.textContent = scene.selected === controlScenes.length - 1 ? text.chooseField : text.next;
    status.textContent = remaining === board.level.arrows.length ? (scene.selected < 2 ? text.tapTip : text.zoomTip) : '';
    if (board.hearts === 0 && modal === null) open('lost');
  };
  const on = <Event extends keyof HTMLElementEventMap>(target: HTMLElement, name: Event, handler: (event: HTMLElementEventMap[Event]) => void, options?: AddEventListenerOptions): void => {
    target.addEventListener(name, handler, options); listeners.push(() => target.removeEventListener(name, handler, options));
  };
  on(root, 'pointerdown', event => {
    if (event.button !== 0 || !inBoard(point(event)) || platform.activity.isBlocked()) return;
    event.preventDefault(); root.setPointerCapture(event.pointerId);
    gestures.down(event.pointerId, point(event), performance.now());
    if (holdTimer !== undefined) clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { holdTimer = undefined; gestures.hold(performance.now()); }, 305);
  });
  on(root, 'pointermove', event => gestures.move(event.pointerId, point(event)));
  on(root, 'pointerup', event => {
    if (holdTimer !== undefined) clearTimeout(holdTimer);
    gestures.up(event.pointerId, point(event));
    if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
  });
  on(root, 'pointercancel', cancel);
  on(root, 'lostpointercapture', event => { if (gestures.hasPointer(event.pointerId)) cancel(); });
  on(root, 'wheel', event => {
    if (!inBoard(point(event)) || platform.activity.isBlocked()) return;
    event.preventDefault(); cancel(); scene.zoom(point(event), point(event), Math.exp(-event.deltaY * .0015));
  }, { passive: false });
  on(document.querySelector<HTMLElement>('#choose-field')!, 'click', () => open('levels'));
  on(document.querySelector<HTMLElement>('#restart')!, 'click', () => open('restart'));
  on(document.querySelector<HTMLElement>('#guides')!, 'click', () => { cancel(); scene.setGuides(!scene.guides); });
  on(document.querySelector<HTMLElement>('#next')!, 'click', () => {
    cancel(); if (scene.selected === controlScenes.length - 1) open('levels'); else scene.loadLevel(scene.selected + 1);
  });
  on(dialog, 'cancel', event => { event.preventDefault(); if (modal !== 'lost') close(); });
  const blocked = platform.activity.onBlockedChange(value => { if (value) cancel(); }); listeners.push(blocked);
  const removeState = scene.subscribe(sync); listeners.push(removeState);
  const observer = new ResizeObserver(() => { cancel(); scene.layout(); });
  observer.observe(document.querySelector('#game-header')!); observer.observe(document.querySelector('#game-footer')!);
  listeners.push(() => observer.disconnect());
  const blur = (): void => cancel(); window.addEventListener('blur', blur); listeners.push(() => window.removeEventListener('blur', blur));
  sync();
  return {
    onBack(): boolean { if (modal && modal !== 'lost') close(); else open('levels'); return true; },
    cancel,
    destroy(): void {
      cancel(); for (const remove of listeners.reverse()) remove();
      dialog.close(); platform.activity.setBlocked('dialog', false); content.replaceChildren();
    },
  };
}
