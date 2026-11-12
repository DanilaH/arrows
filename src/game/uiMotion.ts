/** Bounded presentation only. No progress, rewards or scene ownership lives here. */
export function createUiMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set<() => void>(), presses = new Map<number, { button: HTMLButtonElement; animation: Animation }>();
  const deferredRoutes = new Set<() => void>();
  const taps = new Map<HTMLElement, () => void>();
  const clearTaps = (): void => { for (const end of [...taps.values()]) end(); };
  const refillEnds: (()=>void)[] = [];
  const stopRefill = (): void => { for(const end of refillEnds.splice(0))end(); };
  const dialogs = new Map<HTMLDialogElement, { finish(): void; cancel(): void }>();
  let snapshotSerial = 0;
  let arrivalFinish: (()=>void) | undefined;
  let routeFinish: (() => void) | undefined, routeBusy = false, alive = true;
  const animate = (element: Element, frames: Keyframe[], duration: number, done = (): void => {}, delay = 0, easing = 'cubic-bezier(.2,.8,.2,1)', allowReduced = false): (() => void) => {
    if (!alive || reduced.matches && !allowReduced || document.hidden || !element.animate) { done(); return () => {}; }
    const animation = element.animate(frames, { duration, delay, easing, fill: 'both' });
    let finished = false;
    const finish = (): void => {
      if (finished) return; finished = true; clearTimeout(timer); running.delete(finish); animation.cancel(); done();
    };
    const timer = setTimeout(finish, duration + delay + 80); running.add(finish);
    void animation.finished.then(finish, () => {}); return finish;
  };
  const presentation = (duration: number, done: () => void) => {
    arrivalFinish?.();
    const owned: (()=>void)[] = [], elements: Element[] = []; let ended=false;
    const finish=():void=>{if(ended)return;ended=true;clearTimeout(timer);if(arrivalFinish===finish)arrivalFinish=undefined;for(const end of owned)end();for(const element of elements)element.remove();done();};
    const timer=setTimeout(finish,duration);arrivalFinish=finish;
    return {own:(end:()=>void)=>owned.push(end),remove:(element:Element)=>elements.push(element),finish};
  };
  const notice = (label: string, group: ReturnType<typeof presentation>, duration: number, anchor?: HTMLElement): void => {
    const element=document.createElement('span');element.className='arrival-notice';element.setAttribute('role','status');element.textContent=label;document.body.append(element);group.remove(element);
    if(anchor){const r=anchor.getBoundingClientRect(),opacity=anchor.style.opacity;anchor.style.opacity='0';group.own(()=>{anchor.style.opacity=opacity;});Object.assign(element.style,{left:`${r.x}px`,right:'auto',top:`${r.y-4}px`,bottom:'auto',width:`${r.width}px`,maxWidth:`${r.width}px`,margin:'0'});}
    if(reduced.matches)element.style.opacity='1';
    else group.own(animate(element,[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)',offset:.12},{opacity:1,transform:'translateY(0)',offset:.82},{opacity:0,transform:'translateY(-3px)'}],duration,undefined,0,'linear'));
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
  const settle = (): void => { clearTaps(); arrivalFinish?.(); stopRefill(); blur(); routeFinish?.(); for (const finish of [...running]) finish(); };
  const visibility = (): void => { if (document.hidden) settle(); };
  document.addEventListener('pointerdown', down, true); document.addEventListener('pointerup', up, true); document.addEventListener('pointercancel', cancel, true);
  document.addEventListener('click', keyboard, true); document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur); window.addEventListener('resize', settle);
  return {
    clearTaps,
    emptyTap(root: HTMLElement, point: { x: number; y: number }): void {
      if (!alive || document.hidden) return;
      if (taps.size >= 4) taps.values().next().value?.();
      const dot = document.createElement('span'), bounds = root.getBoundingClientRect();
      dot.className = 'empty-tap'; dot.setAttribute('aria-hidden', 'true');
      Object.assign(dot.style, { left: `${point.x-bounds.left}px`, top: `${point.y-bounds.top}px` }); root.append(dot);
      const frames = reduced.matches ? [{ opacity: 1 }, { opacity: 0 }] : [
        { opacity: .9, transform: 'translate(-50%,-50%) scale(.6)' },
        { opacity: .8, transform: 'translate(-50%,-50%) scale(1)', offset: .3 },
        { opacity: 0, transform: 'translate(-50%,-50%) scale(1.12)' },
      ];
      const end = animate(dot, frames, reduced.matches ? 140 : 280, () => { dot.remove(); taps.delete(dot); }, 0, 'ease-out', true);
      if (dot.isConnected) taps.set(dot, end);
    },
    get routeBusy() { return routeBusy; },
    deferRoute(work: () => void): boolean { if (!routeBusy) return false; deferredRoutes.add(work); return true; },
    swap(root: HTMLElement, from: string, to: string, render: () => void): void {
      clearTaps();
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
        const style = getComputedStyle(root), rect = root.getBoundingClientRect(); snapshot.style.padding = style.padding;
        Object.assign(snapshot.style,{left:`${rect.x}px`,top:`${rect.y}px`,width:`${rect.width}px`,height:`${rect.height}px`,right:'auto',bottom:'auto'});
        root.parentElement!.append(snapshot); snapshot.scrollTop = root.scrollTop;
      }
      render(); routeBusy = true;
      const direction = to === 'home' || from === 'calendar' && to === 'collection' ? -1 : 1;
      const target = to === 'game' ? document.querySelector<HTMLElement>('#game-root')! : root;
      const owned: (() => void)[] = [];
      if (snapshot) owned.push(animate(snapshot, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-direction*8}px)` }], 160));
      if (to !== 'game') {
        const bounds=root.getBoundingClientRect();
        const items=[...root.querySelectorAll<HTMLElement>('.home-heading,.campaign-heading,.home-board,#home-play,.home-progress,.meta-header,.record-grid>article,.record-rules,.meta-content>h2,.medal,.month-trophy,.month-award,.month-heading,.calendar-grid,.selected-day')]
          .filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.bottom>bounds.top&&r.top<bounds.bottom;}).slice(0,12);
        items.forEach((el,i)=>owned.push(animate(el,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],220,undefined,Math.min(64,i*18))));
      }
      let done=false, endAnimation: (()=>void)|undefined;
      const finish=():void=>{ if(done)return; done=true; snapshot?.remove(); routeBusy=false; routeFinish=undefined; for(const end of owned)end(); endAnimation?.(); const work=[...deferredRoutes]; deferredRoutes.clear(); for(const fn of work)fn(); };
      routeFinish=finish;
      endAnimation=animate(target,[{opacity:.3},{opacity:1}],to==='game'?220:300,finish);
    },
    open(dialog: HTMLDialogElement): void {
      dialogs.get(dialog)?.cancel(); dialogs.delete(dialog);
      if (!dialog.open) dialog.showModal();
      for (const el of [...dialog.querySelectorAll<HTMLElement>('header,.settings-section,.settings-group,.trophy-portrait,.trophy-rule,.primary')].slice(0,6)) animate(el,[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],140,undefined,35);
      animate(dialog, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], 200);
    },
    close(dialog: HTMLDialogElement, after: () => void): boolean {
      if (!dialog.open) { after(); return false; }
      if (dialogs.has(dialog)) return true;
      let cancelled = false;
      const finish = animate(dialog, [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(9px) scale(.98)' }], 135, () => { if (cancelled) return; dialogs.delete(dialog); dialog.close(); after(); });
      if (dialog.open) dialogs.set(dialog, { finish, cancel() { cancelled = true; dialogs.delete(dialog); finish(); } }); return true;
    },
    reveal(element: Element): void { animate(element, [{ opacity: .3, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], 200); },
    impact(element: Element): void { animate(element,[{transform:'translateX(0)'},{transform:'translateX(-4px)',offset:.2},{transform:'translateX(3px)',offset:.45},{transform:'translateX(-2px)',offset:.7},{transform:'translateX(0)'}],180); },
    cancelRefill: stopRefill,
    refill(element: HTMLElement, from: number, to: number): void {
      stopRefill();
      const colors=getComputedStyle(document.documentElement), empty=colors.getPropertyValue('--heart-empty').trim(), full=colors.getPropertyValue('--heart').trim();
      for(const [i,heart] of [...element.children].slice(from,to).entries()) refillEnds.push(animate(heart,[
        {color:empty,opacity:.3,transform:'scale(.6)'},
        {color:full,opacity:1,transform:'scale(1.25)',offset:.55},
        {color:full,opacity:1,transform:'scale(1)'},
      ],280,undefined,i*75));
    },
    reward(element: Element): void {
      const emblem=element.querySelector('.win-emblem');
      if(emblem)animate(emblem,[{opacity:0,transform:'scale(.5) translateY(8px)'},{opacity:1,transform:'scale(1.13) translateY(0)',offset:.6},{opacity:1,transform:'scale(1) translateY(0)'}],520);
      const ring=element.querySelector('.win-ring'), check=element.querySelector('.win-check'), rays=element.querySelector('.win-rays');
      if(ring)animate(ring,[{strokeDasharray:'145',strokeDashoffset:'145',opacity:0},{strokeDasharray:'145',strokeDashoffset:'0',opacity:1}],500);
      if(check)animate(check,[{strokeDasharray:'36',strokeDashoffset:'36',opacity:0},{strokeDasharray:'36',strokeDashoffset:'0',opacity:1}],280,undefined,150);
      if(rays)animate(rays,[{opacity:0,transform:'scale(.65)'},{opacity:1,transform:'scale(1)',offset:.35},{opacity:0,transform:'scale(1.16)'}],640,undefined,100);
      for(const [i,el] of [...element.querySelectorAll('strong,.win-detail,button')].entries()) animate(el,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],240,undefined,40+i*40);
    },
    unlock(target: HTMLElement, label: string, done: () => void): void {
      if(!alive || document.hidden || !target.isConnected){done();return;}
      const group=presentation(1900,done);notice(label,group,1900);
      group.own(animate(target,[{transform:'scale(.75)'},{transform:'scale(1.26)',offset:.45},{transform:'scale(1)'}],640));
      if(reduced.matches)return;
      const box=target.getBoundingClientRect(),halo=document.createElement('i');halo.className='arrival-halo';halo.setAttribute('aria-hidden','true');
      Object.assign(halo.style,{left:`${box.x-7}px`,top:`${box.y-7}px`,width:`${box.width+14}px`,height:`${box.height+14}px`});document.body.append(halo);group.remove(halo);
      group.own(animate(halo,[{opacity:0,transform:'scale(.65)'},{opacity:.8,transform:'scale(1)',offset:.3},{opacity:0,transform:'scale(1.55)'}],740));
    },
    dailyProgress(day: HTMLElement, bar: HTMLElement, count: HTMLElement, trophy: HTMLElement, from: number, to: number, total: number, label: string, earned: boolean, done: () => void): void {
      if(!alive || document.hidden || !day.isConnected){done();return;}
      const group=presentation(1400,done);
      if(reduced.matches){notice(label,group,1400,count.parentElement??undefined);return;}
      group.own(animate(day,[{opacity:.4,transform:'scale(.75)'},{opacity:1,transform:'scale(1.1)',offset:.6},{opacity:1,transform:'scale(1)'}],400));
      group.own(animate(bar,[{transform:`scaleX(${from/total})`},{transform:`scaleX(${to/total})`}],400,undefined,760));
      group.own(animate(count,[{opacity:.4,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],300,undefined,760));
      group.own(animate(trophy,[{transform:'scale(.97)'},{transform:`scale(${earned?1.1:1.04})`,offset:.5},{transform:'scale(1)'}],420,undefined,800));
      const a=day.getBoundingClientRect(),b=trophy.getBoundingClientRect(),nav=document.querySelector('#meta-nav')?.getBoundingClientRect();
      const footer=document.querySelector('.selected-day')?.getBoundingClientRect(),bottom=Math.min(nav?.top??innerHeight,footer?.top??innerHeight);
      const visible=(r:DOMRect):boolean=>r.width>0&&r.top>=0&&r.bottom<=bottom;
      if(earned&&visible(b)){const halo=document.createElement('i');halo.className='arrival-halo cup-arrival-halo';halo.setAttribute('aria-hidden','true');Object.assign(halo.style,{left:`${b.x-8}px`,top:`${b.y-6}px`,width:`${b.width+16}px`,height:`${b.height+12}px`});document.body.append(halo);group.remove(halo);group.own(animate(halo,[{opacity:0,transform:'scale(.85)'},{opacity:.8,transform:'scale(1)',offset:.25},{opacity:0,transform:'scale(1.18)'}],500,undefined,800));}
      if(!visible(a)||!visible(b)){notice(label,group,1400,count.parentElement??undefined);return;}
      const token=document.createElement('i');token.className='day-progress-token';token.setAttribute('aria-hidden','true');
      const x=a.x+a.width/2-4,y=a.y+a.height/2-4,dx=b.x+b.width/2-4-x,dy=b.y+b.height*.75-4-y;
      Object.assign(token.style,{left:`${x}px`,top:`${y}px`});document.body.append(token);group.remove(token);
      group.own(animate(token,[{opacity:0,transform:'translate(0,0) scale(.4)'},{opacity:1,transform:'translate(0,-4px) scale(1)',offset:.14},{opacity:1,transform:`translate(${dx*.55}px,${dy*.5-24}px) scale(.9)`,offset:.6},{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.3)`}],680,undefined,150));
    },
    award(target: HTMLElement, artwork: string, done: () => void = () => {}): void {
      if (!alive || reduced.matches || document.hidden || !target.isConnected) {done();return;}
      const rect=target.getBoundingClientRect(); if(!rect.width||!rect.height){done();return;}
      const group=presentation(800,done),token=document.createElement('span'), x=innerWidth/2-18, y=innerHeight*.48-18;
      token.className='award-flight';token.setAttribute('aria-hidden','true');token.innerHTML=artwork;
      Object.assign(token.style,{left:`${x}px`,top:`${y}px`,opacity:'0'});document.body.append(token);group.remove(token);
      group.own(animate(token,[{opacity:0,transform:'translate(0,10px) scale(.7)'},{opacity:1,transform:'translate(0,0) scale(1.25)',offset:.23},{opacity:1,transform:`translate(${(rect.x+rect.width/2-18-x)*.5}px,${rect.y+rect.height/2-18-y-30}px) scale(.85)`,offset:.7},{opacity:0,transform:`translate(${rect.x+rect.width/2-18-x}px,${rect.y+rect.height/2-18-y}px) scale(.5)`}],680));
      group.own(animate(target,[{transform:'scale(1)'},{transform:'scale(1.18)',offset:.4},{transform:'scale(1)'}],180,undefined,570));
    },
    finish: settle,
    destroy(): void {
      alive = false; deferredRoutes.clear(); settle(); dialogs.clear();
      document.removeEventListener('pointerdown', down, true); document.removeEventListener('pointerup', up, true); document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('click', keyboard, true); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); window.removeEventListener('resize', settle);
    },
  };
}
export type UiMotion = ReturnType<typeof createUiMotion>;
