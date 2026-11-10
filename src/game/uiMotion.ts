/** Bounded presentation only. No progress, rewards or scene ownership lives here. */
export function createUiMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set<() => void>(), presses = new Map<number, { button: HTMLButtonElement; animation: Animation }>();
  const deferredRoutes = new Set<() => void>();
  const dialogs = new Map<HTMLDialogElement, { finish(): void; cancel(): void }>();
  let snapshotSerial = 0;
  let routeFinish: (() => void) | undefined, routeBusy = false, alive = true;
  const animate = (element: Element, frames: Keyframe[], duration: number, done = (): void => {}, delay = 0): (() => void) => {
    if (!alive || reduced.matches || document.hidden || !element.animate) { done(); return () => {}; }
    const animation = element.animate(frames, { duration, delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    let finished = false;
    const finish = (): void => {
      if (finished) return; finished = true; clearTimeout(timer); running.delete(finish); animation.cancel(); done();
    };
    const timer = setTimeout(finish, duration + delay + 80); running.add(finish);
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
    deferRoute(work: () => void): boolean { if (!routeBusy) return false; deferredRoutes.add(work); return true; },
    swap(root: HTMLElement, from: string, to: string, render: () => void): void {
      routeFinish?.();
      if (from === to || reduced.matches || document.hidden || !alive) { render(); return; }
      const sourceArt = new Map<string, { rect: DOMRect; image: HTMLImageElement }>();
      if (from !== 'game' && !root.hidden) for (const img of root.querySelectorAll<HTMLImageElement>('img[data-motion-key]')) {
        const rect = img.getBoundingClientRect(); if (rect.width && rect.bottom > 0 && rect.top < innerHeight) sourceArt.set(img.dataset.motionKey!, { rect, image: img });
      }
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
      const owned: (() => void)[] = [];
      if (snapshot) owned.push(animate(snapshot, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-direction*20}px) scale(.985)` }], 230));
      if (to !== 'game') {
        // Read final layout before the stagger temporarily transforms the header.
        const destinationArt = [...root.querySelectorAll<HTMLImageElement>('img[data-motion-key]')].map(img => ({ img, rect: img.getBoundingClientRect() }));
        const items = [...root.querySelectorAll<HTMLElement>('.home-heading,.home-current,.portal-card,.meta-header,.record-grid>article,.record-rules,.meta-content>h2,.medal,.month-trophy,.month-award,.month-heading,.calendar-grid,.selected-day')]
          .filter(el => { const r=el.getBoundingClientRect(); return r.width>0 && r.bottom>0 && r.top<innerHeight; }).slice(0,12);
        items.forEach((el,i) => owned.push(animate(el,[{ opacity:0,transform:`translateY(${i === 0 ? -10 : 22}px) scale(.965)` },{ opacity:1,transform:'translateY(-2px) scale(1.008)',offset:.8 },{ opacity:1,transform:'translateY(0) scale(1)' }],380,undefined,Math.min(140,i*28))));
        for (const { img, rect: dest } of destinationArt) {
          const source=sourceArt.get(img.dataset.motionKey!); if (!source) continue;
          const oldVisibility=img.style.visibility, art=source.image.cloneNode(true) as HTMLImageElement;
          art.className='shared-menu-art'; art.removeAttribute('id'); art.removeAttribute('data-motion-key'); art.setAttribute('aria-hidden','true');
          Object.assign(art.style,{ position:'fixed',left:`${source.rect.x}px`,top:`${source.rect.y}px`,width:`${source.rect.width}px`,height:`${source.rect.height}px`,margin:'0',transformOrigin:'0 0',pointerEvents:'none',zIndex:'12',objectFit:'contain' });
          img.style.visibility='hidden'; root.parentElement!.append(art);
          for (const old of snapshot?.querySelectorAll<HTMLImageElement>('img') ?? []) if (old.src===source.image.src) old.style.visibility='hidden';
          owned.push(animate(art,[{ transform:'translate(0,0) scale(1)' },{ transform:`translate(${dest.x-source.rect.x}px,${dest.y-source.rect.y}px) scale(${dest.width/source.rect.width},${dest.height/source.rect.height})` }],430,()=>{ img.style.visibility=oldVisibility; art.remove(); })); break;
        }
      }
      let done=false, endAnimation: (()=>void)|undefined;
      const finish=():void=>{ if(done)return; done=true; snapshot?.remove(); routeBusy=false; routeFinish=undefined; for(const end of owned)end(); endAnimation?.(); const work=[...deferredRoutes]; deferredRoutes.clear(); for(const fn of work)fn(); };
      routeFinish=finish;
      endAnimation=animate(target,to==='game' ? [{ opacity:.15,transform:'scale(.975)' },{ opacity:1,transform:'scale(1)' }] : [{ opacity:.15 },{ opacity:1,offset:.6 },{ opacity:1 }],to==='game'?300:520,finish);
    },
    open(dialog: HTMLDialogElement): void {
      dialogs.get(dialog)?.cancel(); dialogs.delete(dialog);
      if (!dialog.open) dialog.showModal();
      for (const el of [...dialog.querySelectorAll<HTMLElement>('header,.settings-section,.settings-group,.trophy-portrait,.trophy-rule,.primary')].slice(0,6)) animate(el,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],260,undefined,60);
      animate(dialog, [{ opacity: 0, transform: 'translateY(24px) scale(.94)' }, { opacity: 1, transform: 'translateY(-2px) scale(1.006)', offset:.8 }, { opacity: 1, transform: 'translateY(0) scale(1)' }], 300);
    },
    close(dialog: HTMLDialogElement, after: () => void): boolean {
      if (!dialog.open) { after(); return false; }
      if (dialogs.has(dialog)) return true;
      let cancelled = false;
      const finish = animate(dialog, [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(9px) scale(.98)' }], 135, () => { if (cancelled) return; dialogs.delete(dialog); dialog.close(); after(); });
      if (dialog.open) dialogs.set(dialog, { finish, cancel() { cancelled = true; dialogs.delete(dialog); finish(); } }); return true;
    },
    reveal(element: Element): void { animate(element, [{ opacity: .3, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], 260); },
    impact(element: Element): void { animate(element,[{transform:'translateX(0)'},{transform:'translateX(-4px)',offset:.2},{transform:'translateX(3px)',offset:.45},{transform:'translateX(-2px)',offset:.7},{transform:'translateX(0)'}],180); },
    reward(element: Element): void {
      const emblem=element.querySelector('.win-emblem'); if(emblem)animate(emblem,[{opacity:0,transform:'scale(.25) rotate(-18deg)'},{opacity:1,transform:'scale(1.16) rotate(4deg)',offset:.65},{opacity:1,transform:'scale(1) rotate(0)'}],560);
      for(const [i,el] of [...element.querySelectorAll('strong,.win-detail,button')].entries()) animate(el,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],340,undefined,70+i*55);
    },
    finish: settle,
    destroy(): void {
      alive = false; deferredRoutes.clear(); settle(); dialogs.clear();
      document.removeEventListener('pointerdown', down, true); document.removeEventListener('pointerup', up, true); document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('click', keyboard, true); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur);
    },
  };
}
export type UiMotion = ReturnType<typeof createUiMotion>;
