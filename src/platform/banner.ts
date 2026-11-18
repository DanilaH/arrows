import {Capacitor,registerPlugin,type PluginListenerHandle} from '@capacitor/core';
import {resolveNativeBannerPlacement,resolveNativeSafeAreaCss,type BannerRect,type NativeBannerPlacementInput} from '@danilah/mini-games-kit/layout';
import type {GameplayActivityCoordinator} from '@danilah/mini-games-kit/platform';
import type {createAnalytics} from './analytics';

export interface BannerMeasurement extends Omit<NativeBannerPlacementInput,'slot'|'viewport'> {configured:boolean;token:string}
export interface BannerEvent {phase:string;requestId?:string;width?:number;height?:number;impressionId?:string;value?:{known:boolean;amount:string;currency:string;precision:string}}
export interface BannerBridge {
  measure(options:{revision:number;viewport:{width:number;height:number};slot:BannerRect}):Promise<BannerMeasurement>;
  apply(options:{revision:number;visible:boolean;token?:string;rect?:BannerRect}):Promise<{accepted:boolean}>;
  destroy():Promise<void>;
  addListener(name:'bannerEvent',listener:(event:BannerEvent)=>void):Promise<PluginListenerHandle>;
}
const rect=(e:Element):BannerRect=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
/** Consumer layout and lifecycle around the PINNED kit geometry; never gates core startup. */
export function installBanner(options:{enabled:boolean;activity:GameplayActivityCoordinator;analytics:Pick<ReturnType<typeof createAnalytics>,'track'>;visible:()=>boolean;reserve?:()=>boolean;layout:()=>void;bridge?:BannerBridge}) {
  const native=options.enabled?(options.bridge??(Capacitor.isPluginAvailable('ArrowsBanner')?registerPlugin<BannerBridge>('ArrowsBanner'):null)):null;
  if(!native)return{refresh(){},destroy(){}};
  const html=document.documentElement,shell=document.querySelector<HTMLElement>('#game-shell')!;
  const strip=document.createElement('div'),slot=document.createElement('div');strip.id='banner-strip';strip.setAttribute('aria-hidden','true');slot.id='native-banner-slot';strip.append(slot);shell.append(strip);
  let alive=true,revision=0,running=false,queued=false,frame=0,listener:PluginListenerHandle|undefined,signature='',shown=false;
  let retry:ReturnType<typeof setTimeout>|undefined,needsLayout=false,pointers=new Set<number>(),policy:string|undefined,retryDelay=120;
  const value=(key:string,next:string):boolean=>{if(html.style.getPropertyValue(key)===next)return false;html.style.setProperty(key,next);return true;};
  const layout=():void=>{needsLayout=true;if(!pointers.size){needsLayout=false;options.layout();}};
  const hide=():void=>{if(shown){shown=false;signature='';void native.apply({revision,visible:false}).catch(()=>{});}};
  const schedule=():void=>{if(!alive)return;queued=true;if(!frame)frame=requestAnimationFrame(()=>{frame=0;void run();});};
  // Internal scene/progression holds do not affect the independent, stable ad slot.
  const eligible=():boolean=>options.visible()&&!document.hidden&&!options.activity.getBlockReasons().some(r=>r!=='menu'&&r!=='ad-transition');
  const invalidate=():void=>{if(!alive)return;revision++;if(!eligible())hide();schedule();};
  const refresh=():void=>{const next=String(eligible())+':'+String(options.reserve?.()??true);if(next===policy)return;policy=next;invalidate();};
  const run=async():Promise<void>=>{
    if(!alive||running)return;running=true;queued=false;const current=revision;
    try{
      // WebView rounds innerWidth/innerHeight to integers; DOM edges remain fractional.
      // The full-size root and slot must use the same CSS layout coordinate space.
      const bounds=html.getBoundingClientRect(),viewport={width:bounds.width,height:bounds.height},measurement=await native.measure({revision:current,viewport,slot:rect(slot)});
      if(!alive||current!==revision)return;
      const safe=resolveNativeSafeAreaCss({...measurement,viewport});
      if(safe.kind!=='safe'){hide();return;}
      if(pointers.size){needsLayout=true;hide();return;}
      let changed=false;for(const edge of ['left','top','right','bottom'] as const)changed=value('--native-safe-'+edge,safe.insets[edge]+'px')||changed;
      if(!measurement.configured||options.reserve?.()===false){hide();strip.style.visibility='hidden';if(value('--banner-occupied','0px')||html.classList.contains('has-native-banner')){html.classList.remove('has-native-banner');changed=true;}if(changed)layout();return;}
      const scale=measurement.webView.width/viewport.width;
      // Keep the same neutral reservation through load/no-fill and hidden dialogs.
      const height=Math.ceil((measurement.adHeight+2)/scale);
      const occupied=`calc(${height+8}px + var(--safe-bottom))`;
      changed=value('--banner-height',height+'px')||changed;changed=value('--banner-occupied',occupied)||changed;
      if(!html.classList.contains('has-native-banner')){html.classList.add('has-native-banner');changed=true;}
      strip.style.visibility='visible';
      if(changed){hide();layout();schedule();return;}
      // Do not move controls while any pointer is held; negotiate again after release.
      if(pointers.size||needsLayout){hide();return;}
      const slotRect=rect(slot),placement=resolveNativeBannerPlacement({...measurement,viewport,slot:slotRect});
      if(placement.kind==='reserve'){hide();value('--banner-height',placement.heightCss+'px');value('--banner-occupied',`calc(${placement.heightCss+8}px + var(--safe-bottom))`);layout();schedule();return;}
      const visible=placement.kind==='place'&&eligible();
      const key=JSON.stringify([measurement.token,visible,placement]);if(key===signature)return;
      signature=key;shown=visible;
      const result=await native.apply({revision:current,token:measurement.token,visible,...(placement.kind==='place'?{rect:placement.rect}:{})});
      if(!alive||current!==revision)return;
      if(!result.accepted){signature='';if(!retry){retry=setTimeout(()=>{retry=undefined;invalidate();},retryDelay);retryDelay=Math.min(30000,retryDelay*2);}}
      else{clearTimeout(retry);retry=undefined;retryDelay=120;}
    }catch{
      if(alive){hide();signature='';if(!retry)retry=setTimeout(()=>{retry=undefined;invalidate();},30000);}
    }finally{running=false;if(queued&&alive)schedule();}
  };
  const observer=new ResizeObserver(invalidate);observer.observe(slot);observer.observe(shell);
  const mutations=new MutationObserver(refresh);mutations.observe(shell,{attributes:true,attributeFilter:['data-status','data-screen','data-mode','data-progress']});
  for(const dialog of document.querySelectorAll('dialog'))mutations.observe(dialog,{attributes:true,attributeFilter:['open']});
  const removeActivity=options.activity.onBlockReasonsChange(refresh);
  const down=(e:PointerEvent):void=>{pointers.add(e.pointerId);};
  const up=(e:PointerEvent):void=>{pointers.delete(e.pointerId);if(!pointers.size&&needsLayout){needsLayout=false;options.layout();invalidate();}};
  document.addEventListener('pointerdown',down,true);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',up,true);
  window.addEventListener('resize',invalidate);window.visualViewport?.addEventListener('resize',invalidate);window.addEventListener('scroll',invalidate,true);document.addEventListener('visibilitychange',refresh);
  void native.addListener('bannerEvent',event=>{
    if(!alive)return;
    if(event.phase==='geometry'){signature='';invalidate();return;}
    options.analytics.track('banner_event',{phase:event.phase,request_id:event.requestId??'',width_px:event.width??0,height_px:event.height??0});
    if(event.phase==='impression'&&event.impressionId){const v=event.value;options.analytics.track('ad_impression_value',{event_id:`${event.impressionId}-impression`,request_id:event.requestId??event.impressionId,format:'banner',known:v?.known===true,amount:v?.known?v.amount:'',currency:v?.known?v.currency:'',precision:v?.precision??'unknown',source:'sdk-ilrd'});}
  }).then(handle=>{if(alive)listener=handle;else void handle.remove();}).catch(()=>{});
  refresh();
  return{refresh,destroy(){if(!alive)return;alive=false;revision++;cancelAnimationFrame(frame);clearTimeout(retry);observer.disconnect();mutations.disconnect();removeActivity();void listener?.remove();void native.destroy().catch(()=>{});strip.remove();html.classList.remove('has-native-banner');for(const key of ['--banner-height','--banner-occupied','--native-safe-left','--native-safe-top','--native-safe-right','--native-safe-bottom'])html.style.removeProperty(key);document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',up,true);window.removeEventListener('resize',invalidate);window.visualViewport?.removeEventListener('resize',invalidate);window.removeEventListener('scroll',invalidate,true);document.removeEventListener('visibilitychange',refresh);}};
}
