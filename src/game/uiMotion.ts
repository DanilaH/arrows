/** Bounded presentation only. No progress, rewards or scene ownership lives here. */
export function createUiMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set<() => void>(), presses = new Map<number, { button: HTMLButtonElement; animation: Animation }>();
  const dialogs = new Map<HTMLDialogElement, { finish(): void; cancel(): void }>();
  let snapshotSerial = 0;
  let routeFinish: (() => void) | undefined, routeBusy = false, alive = true;
  const animate = (element: Element, frames: Keyframe[], duration: number, done = (): void => {}): (() => void) => {
    if (!alive || reduced.matches || document.hidden || !element.animate) { done(); return () => {}; }
    const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    let finished = false;
    const finish = (): void => {
      if (finished) return; finished = true; clearTimeout(timer); running.delete(finish); animation.cancel(); done();
    };
    const timer = setTimeout(finish, duration + 80); running.add(finish);
    void animation.finished.then(finish, () => {}); return finish;
  };
  const releasePress = (id: number, bounce: boolean): void => {
    const press = presses.get(id); if (!press) return; presses.delete(id); press.animation.cancel();
    if (bounce && press.button.isConnected && !press.button.disabled) animate(press.button, [{ transform: 'scale(.965)' }, { transform: 'scale(1.018)', offset: .65 }, { transform: 'scale(1)' }], 210);
  };
  const down = (event: PointerEvent): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled || reduced.matches || !button.animate) return;
    releasePress(event.pointerId, false);
    const animation = button.animate([{ transform: 'scale(1)' }, { transform: 'scale(.965)' }], { duration: 85, fill: 'forwards' });
    presses.set(event.pointerId, { button, animation });
  };
  const up = (event: PointerEvent): void => releasePress(event.pointerId, presses.get(event.pointerId)?.button.contains(event.target as Node) ?? false);
  const cancel = (event: PointerEvent): void => releasePress(event.pointerId, false);
  const blur = (): void => { for (const id of [...presses.keys()]) releasePress(id, false); };
  const keyboard = (event: MouseEvent): void => {
    if (event.detail !== 0) return; const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (button && !button.disabled) animate(button, [{ transform: 'scale(.97)' }, { transform: 'scale(1)' }], 170);
  };
  const settle = (): void => { blur(); routeFinish?.(); for (const finish of [...running]) finish(); };
  const visibility = (): void => { if (document.hidden) settle(); };
  document.addEventListener('pointerdown', down, true); document.addEventListener('pointerup', up, true); document.addEventListener('pointercancel', cancel, true);
  document.addEventListener('click', keyboard, true); document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur);
  return {
    get routeBusy() { return routeBusy; },
    swap(root: HTMLElement, from: string, to: string, render: () => void): void {
      routeFinish?.();
      if (from === to || reduced.matches || document.hidden || !alive) { render(); return; }
      let snapshot: HTMLElement | undefined;
      if (from !== 'game' && !root.hidden) {
        snapshot = root.cloneNode(true) as HTMLElement; snapshot.removeAttribute('id'); snapshot.hidden = false;
        const prefix = `route-${++snapshotSerial}-`, ids = new Map<string, string>();
        for (const el of snapshot.querySelectorAll('[id]')) { const id = el.id; ids.set(id, prefix + id); el.id = prefix + id; }
        for (const el of snapshot.querySelectorAll('*')) for (const attr of [...el.attributes]) {
          let value = attr.value;
          for (const [oldId, newId] of ids) value = value.replaceAll(`url(#${oldId})`, `url(#${newId})`);
          if (attr.name.startsWith('data-')) el.removeAttribute(attr.name);
          else if (value !== attr.value) el.setAttribute(attr.name, value);
        }
        snapshot.className = 'route-snapshot'; snapshot.inert = true; snapshot.setAttribute('aria-hidden', 'true');
        const style = getComputedStyle(root); snapshot.style.padding = style.padding;
        root.parentElement!.append(snapshot); snapshot.scrollTop = root.scrollTop;
      }
      render(); routeBusy = true;
      const direction = to === 'home' || from === 'calendar' && to === 'collection' ? -1 : 1;
      const target = to === 'game' ? document.querySelector<HTMLElement>('#game-root')! : root;
      if (snapshot) animate(snapshot, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-direction * 14}px)` }], 210);
      let done = false, endAnimation: (() => void) | undefined;
      const finish = (): void => { if (done) return; done = true; snapshot?.remove(); routeBusy = false; routeFinish = undefined; endAnimation?.(); };
      routeFinish = finish;
      endAnimation = animate(target, [{ opacity: .12, transform: to === 'game' ? 'scale(.985)' : `translateX(${direction * 22}px)` }, { opacity: 1, transform: to === 'game' ? 'scale(1)' : 'translateX(0)' }], 260, finish);
    },
    open(dialog: HTMLDialogElement): void {
      dialogs.get(dialog)?.cancel(); dialogs.delete(dialog);
      if (!dialog.open) dialog.showModal();
      animate(dialog, [{ opacity: 0, transform: 'translateY(16px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], 210);
    },
    close(dialog: HTMLDialogElement, after: () => void): boolean {
      if (!dialog.open) { after(); return false; }
      if (dialogs.has(dialog)) return true;
      let cancelled = false;
      const finish = animate(dialog, [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(9px) scale(.98)' }], 135, () => { if (cancelled) return; dialogs.delete(dialog); dialog.close(); after(); });
      if (dialog.open) dialogs.set(dialog, { finish, cancel() { cancelled = true; dialogs.delete(dialog); finish(); } }); return true;
    },
    reveal(element: Element): void { animate(element, [{ opacity: .4, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], 160); },
    finish: settle,
    destroy(): void {
      alive = false; settle(); dialogs.clear();
      document.removeEventListener('pointerdown', down, true); document.removeEventListener('pointerup', up, true); document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('click', keyboard, true); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur);
    },
  };
}
export type UiMotion = ReturnType<typeof createUiMotion>;
