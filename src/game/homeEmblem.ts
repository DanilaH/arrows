import { roundedRoute, roundedTip, svgPoints } from './arrowArt';

// Authored brand geometry, independent of every campaign/daily field.
const routes = [
  [[1.3,4.8],[1.3,1.6],[5.5,1.6],[5.5,2.9]],
  [[2.9,6.3],[6.5,6.3],[6.5,3.9],[5.1,3.9]],
  [[2.7,3.9],[2.7,5.1],[4.1,5.1],[4.1,2.7],[3.1,2.7]],
].map(points=>points.map(([x,y])=>({x:x!,y:y!})));

export function homeEmblemMarkup(): string {
  return '<div class="home-emblem" aria-hidden="true"><svg viewBox="0 0 160 160" focusable="false">'+routes.map(path=>{
    const body=svgPoints(roundedRoute(path,.45)),tip=svgPoints(roundedTip(path,.55)).replaceAll(' ','L');
    return '<g class="home-emblem-arrow"><g transform="scale(20)"><polyline points="'+body+'"/><path d="M'+tip+'Z"/><polyline class="home-emblem-glint" pathLength="1" points="'+body+'"/></g></g>';
  }).join('')+'</svg></div>';
}

/** Freeze only our SVG properties in an inert outgoing menu snapshot. */
export function freezeHomeEmblem(source: HTMLElement, snapshot: HTMLElement): void {
  const from=source.querySelectorAll<SVGElement>('.home-emblem-arrow,.home-emblem-glint');
  const to=snapshot.querySelectorAll<SVGElement>('.home-emblem-arrow,.home-emblem-glint');
  from.forEach((element,i)=>{
    const target=to[i];if(!target)return;
    const style=getComputedStyle(element);
    for(const property of ['transform','opacity','stroke-dashoffset'])target.style.setProperty(property,style.getPropertyValue(property));
  });
}

/**
 * Small finite SVG bursts driven by the existing surface tick, never a new
 * render loop/timer. No input, gameplay, save, sound or reward authority.
 */
export function createHomeEmblem(root: HTMLElement, canRun: () => boolean) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const cramped=matchMedia('(max-height: 480px)');
  const owned=new Map<Element,Animation>();
  let art: SVGSVGElement|null=null,alive=true,focused=true,enabled=false,nextAt=0,nextArrow=0;
  const stop=(freeze=true):void=>{
    for(const [element,animation] of owned){
      const style=getComputedStyle(element);
      const transform=style.transform;
      animation.onfinish=null;animation.oncancel=null;animation.cancel();
      if(element instanceof SVGElement){
        if(element.classList.contains('home-emblem-arrow'))element.style.transform=freeze?transform:'';
        else {element.style.opacity='';element.style.strokeDashoffset='';}
      }
    }
    owned.clear();
    if(!freeze)for(const group of art?.querySelectorAll<SVGElement>('.home-emblem-arrow')??[])group.style.transform='';
  };
  const allowed=():boolean=>alive&&focused&&!document.hidden&&!reduced.matches&&!cramped.matches&&canRun()&&!!art?.isConnected&&art.getClientRects().length>0;
  const animate=(element:SVGElement,frames:Keyframe[],duration:number,delay=0):void=>{
    owned.get(element)?.cancel();
    const animation=element.animate(frames,{duration,delay,easing:'linear',fill:'backwards'});
    owned.set(element,animation);
    const finish=():void=>{
      if(owned.get(element)!==animation)return;
      owned.delete(element);animation.onfinish=null;animation.oncancel=null;animation.cancel();
    };
    animation.onfinish=finish;animation.oncancel=finish;
  };
  const twitch=(index:number,press=false,delay=0):void=>{
    const group=art?.querySelectorAll<SVGElement>('.home-emblem-arrow')[index],glint=group?.querySelector<SVGElement>('.home-emblem-glint');
    if(!group||!glint||!group.animate)return;
    const from=getComputedStyle(group).transform,d=press?5:3.7,dx=index===0?0:-d,dy=index===0?d:0;
    group.style.transform='none';
    animate(group,[
      {transform:from,offset:0},
      {transform:'translate('+dx+'px,'+dy+'px) rotate('+(index===1?-.8:.8)+'deg)',offset:.3,easing:'cubic-bezier(.15,.8,.25,1)'},
      {transform:'translate('+(-dx*.26)+'px,'+(-dy*.26)+'px)',offset:.52},
      {transform:'translate('+(dx*.12)+'px,'+(dy*.12)+'px)',offset:.73},
      {transform:'none',offset:1},
    ],press?540:860,delay);
    animate(glint,[
      {strokeDashoffset:'1',opacity:0,offset:0},
      {strokeDashoffset:'.88',opacity:press?.85:.48,offset:.16},
      {strokeDashoffset:'.05',opacity:press?.72:.35,offset:.8},
      {strokeDashoffset:'0',opacity:0,offset:1},
    ],press?540:860,delay);
  };
  const update=():void=>{
    if(!alive)return;
    const current=root.querySelector<SVGSVGElement>('.home-emblem svg');
    if(current!==art){stop(false);art=current;enabled=false;nextArrow=0;nextAt=performance.now()+550;}
    const permitted=allowed();
    if(!permitted){if(enabled||owned.size)stop();enabled=false;return;}
    if(!enabled){enabled=true;nextAt=performance.now()+550;}
    if(performance.now()<nextAt||owned.size)return;
    twitch(nextArrow);
    nextAt=performance.now()+[1700,2200,1900][nextArrow]!;
    nextArrow=(nextArrow+1)%3;
  };
  const press=(event:PointerEvent):void=>{
    const target=(event.target as Element).closest<HTMLButtonElement>('#home-play');
    if(event.button!==0||!target||target.disabled||!allowed())return;
    stop();for(let i=0;i<3;i++)twitch(i,true,i*45);
    nextAt=performance.now()+2200;
  };
  const visibility=():void=>{if(document.hidden){stop();enabled=false;}else update();};
  const blur=():void=>{focused=false;stop();enabled=false;};
  const focus=():void=>{focused=true;update();};
  const preference=():void=>{stop(false);enabled=false;update();};
  root.addEventListener('pointerdown',press);
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('blur',blur);window.addEventListener('focus',focus);
  reduced.addEventListener('change',preference);
  cramped.addEventListener('change',preference);
  return {
    update,
    destroy():void{
      alive=false;stop(false);art=null;
      root.removeEventListener('pointerdown',press);document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);reduced.removeEventListener('change',preference);cramped.removeEventListener('change',preference);
    },
  };
}
