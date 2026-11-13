import Phaser from 'phaser';
import {getBackingStoreSize,getRenderPixelRatio} from '@danilah/mini-games-kit/core';
import {destroyRenderer} from '@danilah/mini-games-kit/phaser';
import '../style.css';import '../themes.css';import '../polish.css';import './lab.css';
import {createPlatformRuntime} from '../app/platform';
import {applyTheme} from '../app/theme';
import {getInitialGameSize,installViewportRuntime} from '../app/viewport';
import {BoardScene,GAME_PRESENTABLE_EVENT} from '../game/BoardScene';
import {createUiMotion} from '../game/uiMotion';
import {BoardGestures} from '../input/gestures';
import {distanceToPath,type Point} from '../domain/geometry';
import {TargetLabStore,targetChallenges,targetFinished,type LabHelp} from './targetStore';

const $=<T extends HTMLElement=HTMLElement>(id:string):T=>document.getElementById(id) as T;
let alive=true,game:Phaser.Game|undefined,scene:BoardScene|undefined,ready=false,working=false,hold:ReturnType<typeof setTimeout>|undefined;
const disposers:(()=>void)[]=[];const cleanup=():void=>{if(!alive)return;alive=false;if(hold)clearTimeout(hold);for(const dispose of disposers.reverse())dispose();};
const back=():boolean=>{cleanup();location.href='./index.html';return true;};
const platform=createPlatformRuntime(back);platform.ads.destroy();platform.analytics.destroy();disposers.push(()=>platform.destroy());
const store=new TargetLabStore(platform.storage),motion=createUiMotion();disposers.push(()=>motion.destroy());let ru=platform.settings.state.language==='ru';
const root=$('game-root'),shell=$('game-shell'),options=$<HTMLDetailsElement>('lab-options');
function blocked():boolean{return !alive||!ready||working||platform.activity.isBlocked()||store.uncertain||store.board.hearts===0||targetFinished(store.current);}
const gestures=new BoardGestures({
  hit(p){if(blocked()||!scene)return null;const v=scene.playArea;if(p.y<v.y||p.y>v.y+v.height)return null;const w=scene.boardCamera.world(p),candidates=scene.board.remaining.map(a=>({id:a.id,d:distanceToPath(w,a.path)*scene!.boardCamera.scale})).filter(a=>a.d<=11).sort((a,b)=>a.d-b.d);if(candidates[1]&&candidates[1].d-candidates[0]!.d<1.5)return null;return candidates[0]?.id??null;},
  contains(id,p){const a=scene?.board.remaining.find(a=>a.id===id);return !!a&&distanceToPath(scene!.boardCamera.world(p),a.path)*scene!.boardCamera.scale<=13;},
  activate(id){const expected=store.current.board.id;void store.move(id,expected).then(result=>{if(!alive||!scene||store.current.board.id!==expected)return;scene.setGoal(store.current.goal,targetFinished(store.current));scene.acceptBoard(store.board,result);scene.setHint(store.current.hint,false);sync();}).catch(()=>{store.error=true;sync();});},
  press:id=>scene?.setPress(id),preview:id=>scene?.setPreview(id),pan:(x,y)=>{if(!blocked())scene?.pan(x,y);},pinch:(a,b,ratio)=>{if(!blocked())scene?.zoom(a,b,ratio);},
  emptyTap(p){if(!blocked()){motion.emptyTap(root,p);platform.feedback.play('button');}},
});
function cancel():void{if(hold)clearTimeout(hold);hold=undefined;gestures.cancel();}
function loadCurrent(quiet=true):void{if(!alive||!scene)return;cancel();platform.feedback.resetGameplay();scene.loadAttempt(store.board,null,false,store.current.hint,!quiet,quiet);scene.setGoal(store.current.goal,targetFinished(store.current),quiet);}
function sync():void {
  if(!alive||!scene)return;const a=store.current,won=targetFinished(a),b=store.board;
  shell.dataset.status='ready';shell.dataset.level=a.level.id;shell.dataset.remaining=String(b.remaining.length);shell.dataset.state=won?'target-complete':b.hearts===0?'lost':'playing';shell.dataset.helpMode=a.helpMode;
  root.dataset.camera=JSON.stringify({x:scene.boardCamera.x,y:scene.boardCamera.y,scale:scene.boardCamera.scale});root.dataset.goal=a.goal;
  $('app-title').textContent=ru?'Освободи цель':'Free the target';$('difficulty').textContent=`${ru?'Лаборатория':'Lab'} · ${store.state.index+1} / 3`;
  [...$('hearts').children].forEach((heart,i)=>heart.classList.toggle('empty',i>=b.hearts));$('hearts').setAttribute('aria-label',`${ru?'Жизни':'Lives'}: ${b.hearts}`);
  $('win').hidden=!won;$('win-title').textContent=ru?'Цель освобождена!':'Target freed!';$('win-detail').textContent=ru?`На поле осталось: ${b.remaining.length}`:`Arrows remaining: ${b.remaining.length}`;$('lab-next').textContent=ru?'Следующая цель':'Next target';
  $('app-status').textContent=won?'':b.hearts===0?(ru?'Жизни закончились. Можно начать заново.':'No lives left. You can restart.'):(ru?'Убери стрелку с ромбом. Остальные могут остаться.':'Remove the diamond arrow. The others may remain.');
  $('lab-hint').hidden=won||b.hearts===0||a.helpMode!=='single'||a.helpUsed;$('lab-hint').textContent=ru?'Тестовая A1 · без рекламы':'QA single · no ad';
  options.hidden=won;$<HTMLSelectElement>('lab-help').value=store.state.nextHelp;
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-target-index]')){const index=Number(button.dataset.targetIndex),id=targetChallenges[index]!.id;button.setAttribute('aria-pressed',String(index===store.state.index));button.textContent=`${index+1}${store.state.results[id]?' ✓':''}`;button.disabled=working||store.uncertain;}
  $('lab-save').hidden=!store.error&&!store.uncertain;$('lab-error').textContent=ru?'Не удалось подтвердить сохранение.':'Save could not be confirmed.';
  for(const id of ['lab-restart','lab-next','lab-hint','lab-help'])$<HTMLButtonElement>(id).disabled=working||store.uncertain;
  platform.activity.setGameplayDesired(!won&&b.hearts>0);scene.layout();
}
async function run(action:()=>Promise<unknown>):Promise<void>{if(!alive||working)return;working=true;try{await action();}catch{store.error=true;}finally{working=false;if(alive)sync();}}
function on<K extends keyof HTMLElementEventMap>(el:HTMLElement,name:K,fn:(e:HTMLElementEventMap[K])=>void):void{el.addEventListener(name,fn);disposers.push(()=>el.removeEventListener(name,fn));}
on(root,'pointerdown',e=>{if(blocked())return;e.preventDefault();root.setPointerCapture(e.pointerId);gestures.down(e.pointerId,{x:e.clientX,y:e.clientY},performance.now());if(hold)clearTimeout(hold);hold=setTimeout(()=>gestures.hold(performance.now()),305);});
on(root,'pointermove',e=>gestures.move(e.pointerId,{x:e.clientX,y:e.clientY}));on(root,'pointerup',e=>{if(hold)clearTimeout(hold);hold=undefined;gestures.up(e.pointerId,{x:e.clientX,y:e.clientY},performance.now());if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);});on(root,'pointercancel',cancel);on(root,'lostpointercapture',e=>{if(gestures.hasPointer(e.pointerId))cancel();});
on(root,'wheel',e=>{if(blocked()||!scene)return;e.preventDefault();const p={x:e.clientX,y:e.clientY};scene.zoom(p,p,Math.exp(-e.deltaY*.002));});
on($('lab-back'),'click',()=>back());on($('lab-restart'),'click',()=>{void run(async()=>{options.open=false;await store.restart();loadCurrent(false);});});on($('lab-next'),'click',()=>{void run(async()=>{await store.select((store.state.index+1)%targetChallenges.length);loadCurrent(false);});});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-target-index]'))on(button,'click',()=>{void run(async()=>{await store.select(Number(button.dataset.targetIndex));loadCurrent();});});
on($('lab-help'),'change',()=>{void run(()=>store.nextHelp($<HTMLSelectElement>('lab-help').value as LabHelp));});on($('lab-hint'),'click',()=>{void run(async()=>{if(await store.hint()&&alive&&scene){scene.setHint(store.current.hint);scene.revealHint(store.current.hint!);}});});
on(options,'toggle',()=>{platform.activity.setBlocked('settings',options.open);cancel();});on($('lab-retry'),'click',()=>{void run(async()=>{await store.load();loadCurrent();});});
const ui=(e:MouseEvent):void=>{if((e.target as Element).closest('button,summary'))platform.feedback.play('button','ui');};document.addEventListener('click',ui);disposers.push(()=>document.removeEventListener('click',ui));
window.addEventListener('pagehide',cleanup,{once:true});
try {
  await Promise.all([platform.settings.ready,store.load()]);if(!alive)throw Error('Lab closed');ru=platform.settings.state.language==='ru';document.documentElement.lang=ru?'ru':'en';$('lab-options').querySelector('summary')!.textContent=ru?'Тестовые настройки':'Playtest settings';$('lab-help-note').textContent=ru?'Применится после «Заново»':'Applies after Restart';$('lab-help').querySelector('option[value=none]')!.textContent=ru?'Без помощи':'No help';$('lab-help').querySelector('option[value=single]')!.textContent=ru?'Одиночная A1 · QA':'QA single A1';$('lab-back').setAttribute('aria-label',ru?'В игру':'Back to game');$('lab-restart').setAttribute('aria-label',ru?'Заново':'Restart');applyTheme(platform.settings.state.theme);
  const size=getInitialGameSize(),ratio=getRenderPixelRatio(2),backing=getBackingStoreSize(size.width,size.height,ratio);
  const wake=():void=>{if(alive&&ready&&game&&!platform.activity.isBlocked())game.loop.wake();};
  scene=new BoardScene({dirty:wake,move:()=>{},ready:s=>{scene=s;s.setTheme(platform.settings.state.theme);loadCurrent();disposers.push(s.subscribe(()=>{if(alive){root.dataset.camera=JSON.stringify({x:s.boardCamera.x,y:s.boardCamera.y,scale:s.boardCamera.scale});}}));
    disposers.push(s.subscribeFeedback(e=>{if(!alive||e.attempt!==store.board.attemptId)return;if(e.kind==='move-start')platform.feedback.play('remove');else if(e.kind==='auto-start')platform.feedback.play('auto');else if(e.kind==='blocked-start')platform.feedback.play('slide');else if(e.kind==='impact'){platform.feedback.play('error');motion.impact($('hearts'));}else if(e.kind==='repeat-impact')platform.feedback.play('repeat-error');else if(e.kind==='exit')platform.feedback.play('exit');else if(e.kind==='hint-ready')platform.feedback.play('hint');else if(e.kind==='victory')platform.feedback.play(store.current.board.errors.length===0?'perfect':'win');}));
  }});
  game=new Phaser.Game({type:Phaser.AUTO,parent:'game-root',width:backing.width,height:backing.height,transparent:true,audio:{noAudio:true},scene:[scene],scale:{mode:Phaser.Scale.NONE,zoom:1/ratio},callbacks:{preBoot:g=>{g.events.once(GAME_PRESENTABLE_EVENT,()=>g.events.once(Phaser.Core.Events.POST_RENDER,()=>{ready=true;$('lab-loading').hidden=true;sync();}));}}});
  disposers.push(cancel);const running=game;game.events.on(Phaser.Core.Events.POST_RENDER,()=>{if(ready&&(platform.activity.isBlocked()||!scene!.hasMotion()))running.loop.sleep();});disposers.push(()=>destroyRenderer(running));
  disposers.push(platform.activity.onBlockedChange(block=>{cancel();if(block){scene!.settlePresentation();running.loop.sleep();}else wake();}));const viewport=installViewportRuntime(running,wake);disposers.push(()=>viewport.destroy());
  const observer=new ResizeObserver(()=>{if(ready){scene!.layout();wake();}});observer.observe($('game-header'));observer.observe($('game-footer'));disposers.push(()=>observer.disconnect());
}catch{if(alive){$('lab-loading').textContent=ru?'Не удалось открыть лабораторию. Вернуться в игру':'Could not open the lab. Return to the game';$('lab-loading').onclick=()=>back();}}
