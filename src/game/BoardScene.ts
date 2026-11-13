import Phaser from 'phaser';
import { sampleStyle, retargetStyle, sameStyle, flightSchedule, type ArrowStyle, type StyleMotion } from './arrowPresentation';
import { predictHelp, routePending, type HelpPlan } from '../domain/assistance';
import { roundedRoute, roundedTip } from './arrowArt';
import { StableArrowBatch, type TrianglePaint } from './stableArrowBatch';
import type { BoardArtwork } from './boardTransition';
import { arrowContact, bumpTiming, sampleBump, type ArrowContact, type BumpTiming } from './bumpMotion';
import { boardPalettes } from '../app/theme';
import type { GameTheme } from '../app/settings';
import { stepDampedMotion } from '@danilah/mini-games-kit/feel';
import { campaign } from '../content/campaign';
import { Board, type MoveResult } from '../domain/board';
import { extractPath, measurePath, pointAt, type Arrow, type MeasuredPath, type Point } from '../domain/geometry';
import { BoardCamera, type Rect } from '../input/camera';
import type { ViewState } from '../progression/save';

const VICTORY_MS = 2300;
const ROUND_JOIN = Array.from({length:12},(_,i)=>({x:Math.cos(i*Math.PI/6),y:Math.sin(i*Math.PI/6)}));

export const GAME_PRESENTABLE_EVENT = 'arrows:scene-authored';

interface Flight { badge:number; goal:boolean; id:string; style:StyleMotion; automatic:boolean; path: MeasuredPath; travelled: number; speed: number; age: number; queued: boolean; }
interface Bump { id: string; path: MeasuredPath; timing: BumpTiming; contact: ArrowContact; started: number; impacted: boolean; first:boolean; style:StyleMotion; }
interface Impact { contact: ArrowContact; direction: Point; started: number; }
interface Confetto { x: number; y: number; delay: number; vx: number; vy: number; angle: number; spin: number; length: number; width: number; life: number; color: number; }
export type SceneFeedback = { kind: 'move-start' | 'blocked-start' | 'impact' | 'exit' | 'victory' | 'win-ready' | 'hint-ready' | 'auto-start' | 'repeat-impact' | 'help-finish' | 'route-step'; routeStep?:number; attempt: string; };
interface DotPulse { point: Point; motion: { x: number; v: number }; }
export interface SceneOptions { ready(scene: BoardScene): void; dirty(): void; move(result: MoveResult): void; }

/** Stable geometry is rebuilt on state/camera changes; only active flights/dots animate. */
export class BoardScene extends Phaser.Scene {
  private joinInk = -1;
  private joinFan: readonly Point[] = [];
  public board = new Board(campaign[0]!, crypto.randomUUID());
  public boardCamera = new BoardCamera(this.board.level.width, this.board.level.height);
  public guides = false;
  public preview: string | null = null;
  public hintTarget: string | null = null;
  public clock = 0;
  public frames = 0;
  public playArea: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private renderArea: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private colors: { arrow: number; exit: number; error: number; dot: number; guide: number; help:number; group:number } = boardPalettes.dark;
  private theme: GameTheme = 'dark';
  private styles=new Map<string,StyleMotion>();
  private group=new Set<string>();
  private nativeGroup=new Set<string>();
  private routeSteps=new Map<string,number>();
  private routeTarget:string|null=null;
  private pressed:string|null=null;
  private helpFinal=false;
  private manualCamera=false;
  public setAssistance(plan:HelpPlan|null,quiet=false):void {
    const predicted=plan?.kind==='cascade-v1'?predictHelp(this.board,plan):null;
    const next=new Set(predicted?.bonus??[]),native=new Set(predicted?.native??[]),pending=plan?.kind==='route-v1'?new Set(routePending(this.board,plan)):new Set<string>();
    const route=new Map((plan?.route??[]).flatMap((id,i)=>pending.has(id)?[[id,i+1] as const]:[])),routeChanged=JSON.stringify([...route])!==JSON.stringify([...this.routeSteps]);
    if([...next].join('|')===[...this.group].join('|')&&[...native].join('|')===[...this.nativeGroup].join('|')&&!routeChanged)return;
    this.group=next;this.nativeGroup=native;this.routeSteps=route;this.routeTarget=plan?.kind==='route-v1'?plan.target??null:null;const root=document.querySelector<HTMLElement>('#game-root');if(root){root.dataset.helpGroup=JSON.stringify([...next]);root.dataset.helpNative=JSON.stringify([...native]);root.dataset.helpRoute=JSON.stringify([...route.keys()]);root.dataset.helpTarget=this.routeTarget??'';}this.retarget(quiet);if(!quiet&&routeChanged&&route.size&&this.boardCamera.scale<12)this.focusHint(this.hintTarget,true);this.changed();
  }
  private targetStyle(id:string):ArrowStyle {
    const root=id===this.hintTarget,group=this.group.has(id),pressed=id===this.pressed,preview=id===this.preview;
    return {color:root?this.colors.help:group?this.colors.group:this.board.isError(id)?this.colors.error:preview?this.colors.exit:this.colors.arrow,
      weight:(root?1.5:group?1.24:1)*(pressed?1.17:1),marker:root?1:group?.62:this.nativeGroup.has(id)?.4:this.routeSteps.has(id)?.45:0};
  }
  private style(id:string):ArrowStyle {const m=this.styles.get(id);return m?sampleStyle(m,this.clock):this.targetStyle(id);}
  private retarget(quiet=false):void {
    for(const a of this.board.remaining){const to=this.targetStyle(a.id),m=this.styles.get(a.id);
      if(!m){this.styles.set(a.id,{from:to,to,started:this.clock,duration:0});continue;}
      if(!sameStyle(m.to,to)){this.styles.set(a.id,retargetStyle(m,to,this.clock,quiet||this.reducedMotion?0:180));}
    }
    this.stableDirty=true;
  }
  public setPress(id:string|null):void {if(id===this.pressed)return;this.pressed=id;this.retarget();this.changed();}
  private marker(layer:Phaser.GameObjects.Graphics,head:Point,style:ArrowStyle,id='',badge=this.routeSteps.get(id)??0,goal=id===this.routeTarget):void {
    if(style.marker<.01)return;const unit=1/this.boardCamera.scale;
    if(!badge){layer.lineStyle(1.2*unit,style.color,style.marker).strokeCircle(head.x,head.y,(4+3*style.marker)*unit);return;}
    const d=this.paths.get(id)?.direction??{x:1,y:0},r=Math.min(5*unit,.46),offset=r+3*unit,c={x:head.x-d.y*offset,y:head.y+d.x*offset},alpha=Math.min(1,style.marker*2);
    layer.fillStyle(this.theme==='dark'?0x1e1e2c:0xf3f4fa,alpha);this.dotCircle(layer,c.x,c.y,r);
    layer.lineStyle(1.1*unit,style.color,alpha);
    if(goal)layer.lineBetween(c.x-r,c.y,c.x,c.y-r).lineBetween(c.x,c.y-r,c.x+r,c.y).lineBetween(c.x+r,c.y,c.x,c.y+r).lineBetween(c.x,c.y+r,c.x-r,c.y);
    else layer.strokeCircle(c.x,c.y,r);
    const q=r*.44,x=c.x,y=c.y;
    if(badge===1)layer.lineBetween(x,y-q,x,y+q);
    else if(badge===2)layer.lineBetween(x-q,y-q,x+q,y-q).lineBetween(x+q,y-q,x+q,y).lineBetween(x+q,y,x-q,y+q).lineBetween(x-q,y+q,x+q,y+q);
    else layer.lineBetween(x-q,y-q,x+q,y-q).lineBetween(x+q,y-q,x+q,y+q).lineBetween(x+q,y+q,x-q,y+q).lineBetween(x,y,x+q,y);
  }
  public setTheme(theme: GameTheme): void {
    if (this.theme === theme) return; this.theme = theme;
    this.colors = boardPalettes[theme]; this.retarget(true); this.stableDirty = true;
    if (this.dots) { this.drawDots(); this.changed(); }
  }
  private world!: Phaser.GameObjects.Container;
  private stable!: Phaser.GameObjects.Graphics;
  private stableBatch: StableArrowBatch | undefined;
  private outgoing!: Phaser.GameObjects.Blitter | Phaser.GameObjects.Graphics;
  private outgoingWorld!: Phaser.GameObjects.Container;
  private transitionAt = -1;
  private hintReveal: { id: string; started: number; arrived: boolean } | null = null;
  private dots!: Phaser.GameObjects.Blitter | Phaser.GameObjects.Graphics;
  private guidesLayer!: Phaser.GameObjects.Graphics;
  private active!: Phaser.GameObjects.Graphics;
  private reactiveDots!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private paths = new Map<string, MeasuredPath>();
  private dotMask = new Map<string, Point>();
  private pulses = new Map<string, DotPulse>();
  private flights: Flight[] = [];
  private readonly bumps = new Map<string, Bump>();
  private impacts: Impact[] = [];
  private confetti: Confetto[] = [];
  private readonly feedbackListeners = new Set<(event: SceneFeedback) => void>();
  private previewAt = 0;
  private rewardCelebration = false;
  public setRewardCelebration(): void { this.rewardCelebration=true; }
  private entry = 0;
  private errorUntil = -1;
  private victoryAt = -1;
  private victoryCursor = 0;
  private victorySource: Point | null = null;
  private victoryDots: readonly Point[] = [];
  private victoryRadius = 1;
  private announcedWin = false;
  private finishFramed = false;
  private widthCss = 1;
  private heightCss = 1;
  private readonly listeners = new Set<() => void>();
  private stableDirty = true;
  private focusMotion: { from: ViewState; to: ViewState; elapsed: number } | null = null;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  public constructor(private readonly options: SceneOptions) { super('board'); }
  public create(): void {
    // One tiny two-theme atlas for WebGL background dots.
    const webgl=this.game.renderer.type===Phaser.WEBGL;
    if (webgl && !this.textures.exists('board-dot')) {
      const atlas=this.textures.createCanvas('board-dot',32,16)!;
      const ctx=atlas.getContext();
      for(const [i,theme] of (['dark','light'] as const).entries()){
        ctx.fillStyle=`#${boardPalettes[theme].dot.toString(16).padStart(6,'0')}`;
        ctx.beginPath();ctx.arc(i*16+8,8,7,0,Math.PI*2);ctx.fill();atlas.add(theme,0,i*16,0,16,16);
      }
      atlas.refresh();
    }
    // Blitter ignores its own scale; an owned parent supplies the transform in
    // WebGL. Canvas keeps its world-coordinate Graphics path.
    this.outgoing=webgl?this.add.blitter(0,0,'board-dot','dark'):this.add.graphics();
    this.outgoingWorld=this.add.container(0,0,[this.outgoing]);
    this.dots=webgl?this.add.blitter(0,0,'board-dot','dark'):this.add.graphics();
    const dotWorld=this.add.container(0,0,[this.dots]).setScale(webgl?.01:1);
    this.guidesLayer=this.add.graphics();this.stable=this.add.graphics();
    const stableRoot=this.add.container(0,0);
    if(this.game.renderer.type===Phaser.WEBGL)this.stableBatch=new StableArrowBatch(this,stableRoot);
    this.reactiveDots=this.add.graphics();this.active=this.add.graphics();
    this.world=this.add.container(0,0,[dotWorld,this.guidesLayer,this.stable,stableRoot,this.reactiveDots,this.active]);
    this.overlay = this.add.graphics();
    this.loadAttempt(this.board);
    const resized = (): void => this.layout(false);
    this.scale.on(Phaser.Scale.Events.RESIZE, resized);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, resized); this.listeners.clear(); this.feedbackListeners.clear(); this.pulses.clear(); this.flights.length = 0; this.bumps.clear(); this.impacts.length = 0; this.confetti.length = 0; this.victoryDots=[];
    });
    this.options.ready(this);
    this.game.events.emit(GAME_PRESENTABLE_EVENT);
  }
  public subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  public subscribeFeedback(listener: (event: SceneFeedback) => void): () => void { this.feedbackListeners.add(listener); return () => this.feedbackListeners.delete(listener); }
  private feedback(kind: SceneFeedback['kind'],routeStep?:number): void { for (const listener of this.feedbackListeners) listener({ kind,...(routeStep===undefined?{}:{routeStep}), attempt: this.board.attemptId }); }
  public get hasErrorMotion(): boolean { return this.bumps.size > 0; }
  /** Navigation/background settles presentation without changing the canonical board. */
  public settlePresentation(): void {
    this.bumps.clear(); this.impacts.length = 0; this.flights.length = 0; this.pulses.clear(); this.confetti.length = 0;
    this.pressed=null;this.retarget(true);for(const [id,m]of this.styles)this.styles.set(id,{from:m.to,to:m.to,started:this.clock,duration:0});
    this.hintReveal=null; this.victoryDots=[]; this.transitionAt=-1; this.outgoing?.clear(); this.dots?.setAlpha(1);
    this.errorUntil = -1; this.focusMotion = null; this.finishFramed = this.board.complete; this.entry = this.clock - 500;
    if (this.board.complete) { this.victoryAt = this.clock - VICTORY_MS - 1; this.victoryCursor = this.board.level.mask.length; this.announcedWin = true; }
    this.stableDirty = true; this.active?.clear(); this.overlay?.clear(); this.reactiveDots?.clear(); this.changed();
  }
  private changed(): void { for (const listener of this.listeners) listener(); this.options.dirty(); }
  public loadAttempt(board: Board, view: ViewState | null = null, guides = false, hint: string | null = null, transition = false, settled = false): void {
    const blend=transition && !this.reducedMotion && !board.complete && this.board.complete && this.board.attemptId!==board.attemptId;
    this.outgoing.clear(); this.outgoing.setAlpha(1);
    if(blend){const ratio=1/this.scale.zoom, old=this.boardCamera;this.outgoingWorld.setPosition(old.x*ratio,old.y*ratio).setScale(old.scale*ratio*(this.outgoing instanceof Phaser.GameObjects.Blitter?.01:1));this.dotBatch(this.outgoing,this.board.level.mask);}
    this.transitionAt=blend?this.clock:-1;this.hintReveal=null;this.victorySource=null;this.victoryDots=[];
    const level = board.level; this.board = board; this.guides = guides; this.hintTarget = null; this.focusMotion = null; this.finishFramed = board.complete;this.manualCamera=false;this.helpFinal=false;this.group.clear();this.nativeGroup.clear();this.routeSteps.clear();this.routeTarget=null;this.styles.clear();this.pressed=null;
    let left=level.width-1, top=level.height-1, right=0, bottom=0;
    for(const p of [...level.mask,...level.arrows.flatMap(arrow=>arrow.path)]){
      left=Math.min(left,p.x);top=Math.min(top,p.y);right=Math.max(right,p.x);bottom=Math.max(bottom,p.y);
    }
    this.boardCamera = new BoardCamera(level.width, level.height,{x:left,y:top,width:right-left,height:bottom-top});
    this.paths = new Map(level.arrows.map(a => [a.id, measurePath(a.path)]));
    this.dotMask = new Map(level.mask.map(p => [`${p.x},${p.y}`, p]));
    this.flights.length = 0; this.bumps.clear(); this.impacts.length = 0; this.confetti.length = 0; this.pulses.clear(); this.preview = null; this.rewardCelebration=false; this.active.clear(); this.overlay.clear(); this.reactiveDots.clear();
    this.entry = this.clock - (settled || this.reducedMotion || board.complete ? 500 : 0) + (blend?110:0); this.dots.setAlpha(blend?0:1); this.errorUntil = -1; this.victoryAt = board.complete ? this.clock - VICTORY_MS - 1 : -1; this.victoryCursor = board.complete ? level.mask.length : 0; this.announcedWin = board.complete;
    this.stableDirty = true; this.layout(true);
    if (view) { this.boardCamera.restore(view); this.transform(); }
    this.drawDots(); this.setHint(hint, !settled); this.retarget(true); this.changed();
  }
  public acceptBoard(board: Board, result?: MoveResult): void {
    this.board = board;
    if (result && result.kind !== 'ignored') this.presentMove(result);
    this.retarget();this.stableDirty = true; this.changed();
  }
  public setHint(id: string | null, focus = true): void {
    if(this.hintTarget===id)return;
    if(id)this.manualCamera=false;
    this.hintTarget=id;this.hintReveal=null;this.retarget();
    if(focus)this.focusHint(id);
    this.stableDirty=true;this.changed();
  }
  private focusHint(id: string | null,readability=false): void {
    const arrow=this.board.remaining.find(a=>a.id===id);if(!arrow||this.manualCamera)return;
    const head=arrow.path.at(-1)!,screen=this.boardCamera.screen(head),v=this.playArea;
    if(readability||screen.x<v.x+36||screen.x>v.x+v.width-36||screen.y<v.y+36||screen.y>v.y+v.height-36){
      const to=this.boardCamera.focus(head);
      if(this.reducedMotion){this.boardCamera.restore(to);this.transform();}
      else this.focusMotion={from:this.boardCamera.snapshot(),to,elapsed:0};
    }
  }
  public revealHint(id: string): void {
    if(id!==this.hintTarget||!this.board.remaining.some(a=>a.id===id))return;
    this.focusHint(id);
    if(this.reducedMotion)this.feedback('hint-ready');
    else this.hintReveal={id,started:-1,arrived:false};
    this.stableDirty=true;this.changed();
  }
  public get finished(): boolean { return this.announcedWin; }
  public artwork(): BoardArtwork {
    const ink=this.arrowWidth, color=(value:number)=>`#${value.toString(16).padStart(6,'0')}`;
    return { levelId:this.board.level.id, camera:{x:this.boardCamera.x,y:this.boardCamera.y,scale:this.boardCamera.scale}, viewport:{...this.renderArea}, ink,
      arrows:this.board.remaining.map(arrow=>{const style=this.style(arrow.id),width=Math.min(.68,ink*style.weight);return {path:arrow.path,width,tip:Math.min(.74,Math.max(.48,width*2.15)),color:color(style.color)};}),
      afterPaint: done=>{this.game.events.once(Phaser.Core.Events.POST_RENDER,done);return()=>{this.game.events.off(Phaser.Core.Events.POST_RENDER,done);};},
    };
  }
  private measureView(): Rect {
    // Insets are measured from the real DOM HUD, including enlarged fonts/cutouts.
    const header=document.querySelector<HTMLElement>('#game-header'), footer=document.querySelector<HTMLElement>('#game-footer');
    // Layout bounds exclude transient HUD transforms during a menu transition.
    const top=header?header.offsetTop+header.offsetHeight:92, bottom=footer?footer.offsetTop:this.heightCss-100;
    return { x: 0, y: top + 28, width: this.widthCss, height: Math.max(100, bottom - top - 36) };
  }
  public layout(reset = false): void {
    const ratio = 1 / this.scale.zoom;
    this.widthCss = this.scale.width / ratio; this.heightCss = this.scale.height / ratio;
    this.playArea = this.measureView();
    this.boardCamera.layout(this.playArea, reset);
    this.renderArea = {x:0,y:0,width:this.widthCss,height:this.heightCss};
    const root=document.querySelector<HTMLElement>('#game-root')!;
    root.style.setProperty('--board-clear-top',`${this.playArea.y}px`);
    root.style.setProperty('--board-clear-bottom',`${this.playArea.y+this.playArea.height}px`);
    // Render past the safe interaction/fit area; static DOM gradients soften the
    // edges in both WebGL and Canvas without renderer masks or texture passes.
    this.cameras.main.setViewport(0,0,this.widthCss*ratio,this.heightCss*ratio).setScroll(0,0);
    this.transform(); this.stableDirty = true; this.changed();
  }
  private transform(): void {
    const ratio = 1 / this.scale.zoom, camera = this.boardCamera;
    this.world.setPosition(camera.x * ratio, camera.y * ratio).setScale(camera.scale * ratio);
  }
  public pan(dx: number, dy: number): void { if(this.board.complete)return; this.focusMotion = null;this.manualCamera=true; this.boardCamera.pan(dx, dy); this.transform(); this.changed(); }
  public zoom(previous: Point, current: Point, ratio: number): void {
    if(this.board.complete)return; this.focusMotion = null;this.manualCamera=true; this.boardCamera.zoom(previous, current, ratio); this.transform(); this.stableDirty = true; this.changed();
  }
  public setPreview(id: string | null): void { if (id === this.preview) return; this.preview = id; this.previewAt=this.clock;this.retarget(); const arrow=this.board.remaining.find(a=>a.id===id); if(arrow)this.excite(arrow.path.at(-1)!,4); this.stableDirty = true; this.changed(); }
  public setGuides(value: boolean): void { this.guides = value; this.stableDirty = true; this.changed(); }
  public activate(id: string): MoveResult {
    const result = this.board.activate(id);
    if (result.kind === 'ignored') return result;
    this.presentMove(result); return result;
  }
  private presentMove(result: Exclude<MoveResult, { kind: 'ignored' }>): void {
    if (result.kind === 'removed') {
      const arrows=[result.arrow,...(result.released??[])];
      this.victorySource = arrows.at(-1)!.path.at(-1)!;
      const schedule=flightSchedule(arrows,a=>{const path=this.paths.get(a.id)!,p=this.boardCamera.screen(a.path.at(-1)!),d=path.direction,v=this.renderArea;return path.length+Math.max(0,(d.x>0?v.width-p.x:d.x<0?p.x:d.y>0?v.height-p.y:p.y)+32)/this.boardCamera.scale;},Math.max(22,950/this.boardCamera.scale));
      this.helpFinal=result.help?.kind==='cascade-v1'||result.help?.route?.targetReached===true;
      for(const [index,arrow] of arrows.entries()){
        const bump=this.bumps.get(arrow.id),travelled=bump?sampleBump(bump.timing,this.clock-bump.started).distance:0;
        const from=bump?sampleStyle(bump.style,this.clock):this.style(arrow.id),to={color:this.colors.exit,weight:1,marker:0};
        this.bumps.delete(arrow.id);this.styles.delete(arrow.id);
        if(!this.reducedMotion)this.flights.push({badge:this.routeSteps.get(arrow.id)??0,goal:arrow.id===this.routeTarget,id:arrow.id,style:{from,to,started:this.clock+schedule[index]!.delay,duration:210},automatic:index>0,path:this.paths.get(arrow.id)!,travelled,speed:schedule[index]!.speed,age:-schedule[index]!.delay,queued:index>0});
      }
      if(result.help?.route?.manualStep)this.feedback('route-step',result.help.route.completed);
      else this.feedback(result.help?.manual.length===0?'auto-start':'move-start');
      if(this.reducedMotion&&!result.complete)this.feedback(this.helpFinal?'help-finish':'exit');
    } else {
      const contact = arrowContact(result.arrow, this.board.remaining);
      if (this.reducedMotion || !contact) this.feedback(result.first?'impact':'repeat-impact');
      else if (!this.bumps.has(result.arrow.id)) {
        if (this.bumps.size >= 12) this.bumps.delete(this.bumps.keys().next().value!);
        this.bumps.set(result.arrow.id, { id: result.arrow.id, path: this.paths.get(result.arrow.id)!, timing: bumpTiming(contact.distance, this.boardCamera.scale), contact, started: this.clock, impacted: false,first:result.first,style:{from:this.style(result.arrow.id),to:{color:this.colors.error,weight:1,marker:0},started:this.clock,duration:150} });
        this.feedback('blocked-start');
      }
    }
    this.preview = null; this.stableDirty = true; this.changed(); this.options.move(result);
  }
  private drawDots(): void {
    this.dots.clear(); this.dotBatch(this.dots,this.board.level.mask);
  }
  private dotBatch(layer: Phaser.GameObjects.Blitter | Phaser.GameObjects.Graphics, points: readonly Point[]): void {
    if(layer instanceof Phaser.GameObjects.Graphics){
      // Canvas Blitter also applies camera scroll in atlas-pixel coordinates;
      // keep its existing world-coordinate Graphics path rather than offset dots.
      layer.fillStyle(this.colors.dot,1);for(const p of points)layer.fillCircle(p.x,p.y,.07);
    }else for(const point of points)layer.create(point.x*100-8,point.y*100-8,this.theme);
  }
  private dotCircle(layer: Phaser.GameObjects.Graphics,x:number,y:number,radius:number): void {
    for(let i=0;i<ROUND_JOIN.length;i++){
      const a=ROUND_JOIN[i]!,b=ROUND_JOIN[(i+1)%ROUND_JOIN.length]!;
      layer.fillTriangle(x,y,x+a.x*radius,y+a.y*radius,x+b.x*radius,y+b.y*radius);
    }
  }
  private stroke(layer: TrianglePaint, path: readonly Point[], color: number, width: number, arrowhead: boolean, alpha = 1): void {
    if (path.length < 2) return;
    const ink=Math.min(.68,width), size=Math.min(.74,Math.max(.48,ink*2.15));
    const route=roundedRoute(path,arrowhead?size*.82:0);
    if (route.length>1) {
      // A filled tube avoids WebGL miter spikes on short, thick curve segments.
      layer.fillStyle(color,alpha);
      let lastNx=0,lastNy=0,lastDx=0,lastDy=0,haveSegment=false;
      for (let i=1;i<route.length;i++) {
        const a=route[i-1]!,b=route[i]!,dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
        if (length<1e-9) continue;
        const nx=-dy*ink/(2*length),ny=dx*ink/(2*length);
        layer.fillTriangle(a.x+nx,a.y+ny,a.x-nx,a.y-ny,b.x+nx,b.y+ny);
        layer.fillTriangle(b.x+nx,b.y+ny,a.x-nx,a.y-ny,b.x-nx,b.y-ny);
        const cross=lastDx*dy-lastDy*dx;
        if (haveSegment&&Math.abs(cross)>1e-12) {
          const side=cross>0?-1:1;
          layer.fillTriangle(a.x,a.y,a.x+side*lastNx,a.y+side*lastNy,a.x+side*nx,a.y+side*ny);
        }
        lastNx=nx;lastNy=ny;lastDx=dx;lastDy=dy;haveSegment=true;
      }
      // Only the two exposed caps need a fan. Curved joins use bounded outer wedges.
      if (this.joinInk!==ink) { this.joinInk=ink;this.joinFan=ROUND_JOIN.map(p=>({x:p.x*ink/2,y:p.y*ink/2})); }
      for (const point of [route[0]!,route.at(-1)!]) for (let i=0;i<this.joinFan.length;i++) {
        const a=this.joinFan[i]!,b=this.joinFan[(i+1)%this.joinFan.length]!;
        layer.fillTriangle(point.x,point.y,point.x+a.x,point.y+a.y,point.x+b.x,point.y+b.y);
      }
    }
    if (arrowhead) {
      const tip=roundedTip(path,size);
      layer.fillStyle(color,alpha);
      // Rounded triangles are convex; reuse their exact outline without a
      // fresh Earcut allocation for every arrow on every rendered frame.
      for(let i=1;i<tip.length-1;i++)layer.fillTriangle(tip[0]!.x,tip[0]!.y,tip[i]!.x,tip[i]!.y,tip[i+1]!.x,tip[i+1]!.y);
    }
  }
  // One ink weight for static, moving, blocked and hinted arrows; keep a dense-board gap.
  private get arrowWidth(): number { return Math.min(.64, Math.max(.24, 4.6 / this.boardCamera.scale)); }
  private drawStable(): void {
    this.stableDirty = false; this.stable.clear(); this.stableBatch?.clear(); this.guidesLayer.clear();
    const paint=this.stableBatch??this.stable;
    const stroke = this.arrowWidth;
    for (const [index,arrow] of this.board.remaining.entries()) {
      const amount=Math.max(0,Math.min(1,(this.clock-this.entry-Math.min(90,index*8))/280)), ease=1-(1-amount)**3;
      const path = this.paths.get(arrow.id)!;
      if (this.guides || arrow.id === this.preview) {
        const head = arrow.path.at(-1)!, at=this.boardCamera.screen(head), dir=path.direction, view=this.renderArea;
        const distance=(dir.x>0?view.x+view.width-at.x:dir.x<0?at.x-view.x:dir.y>0?view.y+view.height-at.y:at.y-view.y)/this.boardCamera.scale;
        const growth=this.reducedMotion||this.guides?1:1-(1-Math.min(1,(this.clock-this.previewAt)/160))**3;
        this.guidesLayer.lineStyle(Math.min(.22, 1.8 / this.boardCamera.scale), this.colors.guide, 1);
        this.guidesLayer.lineBetween(head.x, head.y, head.x + path.direction.x * Math.max(0,distance)*growth, head.y + path.direction.y * Math.max(0,distance)*growth);
      }
      if (this.bumps.has(arrow.id)) continue;
      const motion=this.styles.get(arrow.id);if(motion&&this.clock<motion.started+motion.duration)continue;
      const visible = ease < 1 ? extractPath(path, 0, path.length * ease) : arrow.path;
      const style=this.style(arrow.id);this.stroke(paint,visible,style.color,stroke*style.weight,ease>.6);if(style.marker)this.marker(this.stable,arrow.path.at(-1)!,style,arrow.id);
    }
  }
  private excite(point: Point, impulse: number): void {
    if (this.reducedMotion) return;
    const x = Math.round(point.x), y = Math.round(point.y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const key = `${x + dx},${y + dy}`, dot = this.dotMask.get(key); if (!dot) continue;
      const falloff = Math.max(0, 1 - Math.hypot(dot.x - point.x, dot.y - point.y) / 1.5); if (falloff === 0) continue;
      let pulse = this.pulses.get(key);
      if (!pulse) {
        if (this.pulses.size >= 512) continue;
        pulse = { point: dot, motion: { x: 0, v: 0 } }; this.pulses.set(key, pulse);
      }
      pulse.motion.v = Math.max(-24, Math.min(24, pulse.motion.v + impulse * falloff));
    }
  }
  private startCelebration(): void {
    this.confetti.length = 0;
    if (this.reducedMotion) return;
    const source = this.victorySource ?? { x: this.board.level.width / 2, y: this.board.level.height / 2 };
    this.victorySource = source;
    const distance = (p: Point): number => Math.hypot(p.x - source.x, p.y - source.y);
    this.victoryDots = [...this.board.level.mask].sort((a,b) => distance(a)-distance(b));
    this.victoryRadius = Math.max(1, distance(this.victoryDots.at(-1) ?? source));
    let seed = this.board.level.mask.length*997+this.board.level.arrows.length*7919;
    const random = (): number => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
    const colors = [this.colors.arrow, this.colors.exit, this.theme === 'dark' ? 0xffd596 : 0xb17c2e];
    const special = this.board.snapshot().errors.length===0 || this.rewardCelebration || this.board.level.difficulty !== 'normal';
    const spread = Math.min(155, this.playArea.width*.32);
    for (let i=0; i<(special ? 100 : 72); i++) {
      const side = i%2 ? -1 : 1;
      this.confetti.push({ x: side*spread, y: 52, delay: (i%4<2 ? 0 : 155)+random()*65,
        vx: -side*(55+random()*150)+(random()-.5)*90, vy: -160-random()*170,
        angle: random()*Math.PI*2, spin: (random()-.5)*11, length: 4+random()*6, width: 1.8+random()*1.6,
        life: 1400+random()*(special ? 600 : 450), color: colors[i%colors.length]! });
    }
  }
  private drawCelebration(): void {
    if (this.reducedMotion || this.victoryAt < 0) return;
    const age = this.clock-this.victoryAt;
    if (age>=VICTORY_MS) { this.confetti.length=0; this.victoryDots=[]; return; }
    const ratio=1/this.scale.zoom, view=this.playArea, cx=view.x+view.width/2, cy=view.y+view.height*.43;
    const perfect=this.board.snapshot().errors.length===0, gold=this.theme==='dark'?0xffd596:0x9c6b24;
    const origin=perfect?this.boardCamera.screen({x:(this.board.level.width-1)/2,y:(this.board.level.height-1)/2}):this.victorySource ? this.boardCamera.screen(this.victorySource) : {x:cx,y:cy};
    if(perfect){
      for(let i=0;i<12;i++){
        const t=(age-100-i*16)/720;if(t<0||t>1)continue;
        const angle=i*Math.PI/6,near=28+t*65,far=near+Math.sin(t*Math.PI)*18,alpha=Math.sin(t*Math.PI)*.7;
        this.overlay.lineStyle(1.8*ratio,gold,alpha).lineBetween((origin.x+Math.cos(angle)*near)*ratio,(origin.y+Math.sin(angle)*near)*ratio,(origin.x+Math.cos(angle)*far)*ratio,(origin.y+Math.sin(angle)*far)*ratio);
      }
    }
    for(let beat=0;beat<2;beat++) {
      const t=(age-beat*150)/680;
      if(t<0||t>1)continue;
      this.overlay.lineStyle((beat ? 1 : 1.8)*ratio,beat ? this.colors.arrow : this.colors.exit,(1-t)*.48)
        .strokeCircle(origin.x*ratio,origin.y*ratio,(10+Math.sqrt(t)*(beat ? 90 : 125))*ratio);
    }
    // A few brief four-point glints leave plenty of empty space around the result.
    for(let i=0;i<8;i++) {
      const t=(age-190-i*31)/560;
      if(t<0||t>1)continue;
      const angle=i*Math.PI/4+.23, radius=60+(i%3)*27+t*12, size=Math.sin(t*Math.PI)*(i%2 ? 4 : 6);
      const x=cx+Math.cos(angle)*Math.min(radius,view.width*.37), y=cy+Math.sin(angle)*radius*.7;
      this.overlay.lineStyle(1.3*ratio,i%2 ? this.colors.arrow : this.colors.exit,Math.sin(t*Math.PI)*.8);
      this.overlay.lineBetween((x-size)*ratio,y*ratio,(x+size)*ratio,y*ratio).lineBetween(x*ratio,(y-size)*ratio,x*ratio,(y+size)*ratio);
    }
    for (const p of this.confetti) {
      const elapsed=age-p.delay;
      if (elapsed<0 || elapsed>p.life) continue;
      const t=elapsed/1000, alpha=Math.min(1,elapsed/65,(p.life-elapsed)/480);
      const x=cx+p.x+p.vx*t, y=cy+p.y+p.vy*t+175*t*t, a=p.angle+p.spin*t;
      const length=p.length*(.5+.5*Math.abs(Math.cos(p.spin*t*.7)));
      this.overlay.lineStyle(p.width*ratio,p.color,Math.max(0,alpha)).lineBetween((x-Math.cos(a)*length/2)*ratio,(y-Math.sin(a)*length/2)*ratio,(x+Math.cos(a)*length/2)*ratio,(y+Math.sin(a)*length/2)*ratio);
    }
  }
  public hasMotion(): boolean {
    return [...this.styles.values()].some(m=>this.clock<m.started+m.duration) || this.transitionAt>=0 || this.hintReveal!==null || this.preview !== null && this.clock-this.previewAt<180 || this.focusMotion !== null || this.clock - this.entry < 400 || this.flights.length > 0 || this.bumps.size > 0 || this.impacts.length > 0 || this.pulses.size > 0 || this.errorUntil > this.clock ||
      this.victoryAt >= 0 && this.clock - this.victoryAt < (this.reducedMotion ? 150 : VICTORY_MS);
  }
  public update(_time: number, delta: number): void {
    this.frames += 1;
    const dt = Math.min(40, Math.max(0, delta)); this.clock += dt;
    if(this.transitionAt>=0){const age=this.clock-this.transitionAt;this.outgoing.setAlpha(Math.max(0,1-age/220));this.dots.setAlpha(Math.min(1,Math.max(0,(age-60)/160)));if(age>=240){this.outgoing.clear();this.dots.setAlpha(1);this.transitionAt=-1;}}
    if (this.focusMotion) {
      const f = this.focusMotion; f.elapsed += dt; const t = 1 - (1 - Math.min(1, f.elapsed / 320)) ** 3;
      this.boardCamera.restore({ centerX: f.from.centerX + (f.to.centerX - f.from.centerX) * t,
        centerY: f.from.centerY + (f.to.centerY - f.from.centerY) * t, zoom: f.from.zoom + (f.to.zoom - f.from.zoom) * t });
      this.transform(); this.stableDirty = true;
      if (f.elapsed >= 320) { this.focusMotion = null; this.changed(); }
    }
    if (this.clock - this.entry < 420 || this.preview !== null && this.clock-this.previewAt<180) this.stableDirty = true;
    if (this.stableDirty) this.drawStable();
    this.active.clear(); const stroke = this.arrowWidth;
    for(const [id,m]of this.styles){
      if(m.duration===0)continue;
      if(this.clock>=m.started+m.duration){m.duration=0;m.from=m.to;this.stableDirty=true;continue;}
      if(this.bumps.has(id)||!this.paths.has(id))continue;
      const style=sampleStyle(m,this.clock),path=this.paths.get(id)!;this.stroke(this.active,path.points,style.color,stroke*style.weight,true);this.marker(this.active,path.points.at(-1)!,style,id);
    }
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i]!, old = flight.travelled;
      flight.age += dt;
      const style=sampleStyle(flight.style,this.clock);
      if(flight.age<0){const path=extractPath(flight.path,flight.travelled);this.stroke(this.active,path,style.color,stroke*style.weight,true);this.marker(this.active,path.at(-1)!,style,flight.id,flight.badge,flight.goal);continue;}
      if(flight.queued){flight.queued=false;if(this.flights.length%3===0)this.feedback('auto-start');}
      flight.travelled += flight.speed * dt / 1000;
      for (let d = old; d <= flight.travelled; d += .5) {
        this.excite(pointAt(flight.path, d), 7); this.excite(pointAt(flight.path, d + flight.path.length), 5);
      }
      const path = extractPath(flight.path, flight.travelled), tail = this.boardCamera.screen(path[0]!);
      const dir = flight.path.direction;
      const view = this.renderArea;
      const leftView = dir.x > 0 ? tail.x > view.x + view.width + 30 : dir.x < 0 ? tail.x < view.x - 30 : dir.y > 0 ? tail.y > view.y + view.height + 30 : tail.y < view.y - 30;
      if (flight.travelled >= flight.path.length && leftView) { this.flights.splice(i, 1); if(!this.board.complete&&this.flights.length===0){this.feedback(this.helpFinal?'help-finish':'exit');this.helpFinal=false;} continue; }
      this.stroke(this.active,path,style.color,stroke*style.weight,true);this.marker(this.active,path.at(-1)!,style,flight.id,flight.badge,flight.goal);
    }
    let bumpSettled = false;
    for (const [id, bump] of this.bumps) {
      if (!bump.impacted && !this.board.remaining.some(a => a.id === bump.contact.arrowId)) {
        const current = sampleBump(bump.timing, this.clock-bump.started).distance;
        bump.timing = { distance: current, outwardMs: 0, holdMs: 0, returnMs: 190, totalMs: 190 }; bump.started = this.clock; bump.impacted = true;
      }
      const sample = sampleBump(bump.timing, this.clock-bump.started);
      if (sample.contacted && !bump.impacted) {
        bump.impacted = true; if(bump.first)this.errorUntil = this.clock + 180;
        this.impacts.push({ contact: bump.contact, direction: bump.path.direction, started: this.clock });
        this.excite(bump.contact.point,bump.first?16:5); this.feedback(bump.first?'impact':'repeat-impact');
      }
      if (sample.done) { this.bumps.delete(id); this.stableDirty = true; bumpSettled = true; continue; }
      const style=sampleStyle(bump.style,this.clock);this.stroke(this.active, extractPath(bump.path, sample.distance),style.color,stroke*style.weight,true);
    }
    if(this.hintReveal){
      const reveal=this.hintReveal,path=this.paths.get(reveal.id),present=this.board.remaining.some(a=>a.id===reveal.id);
      if(!path||!present||reveal.id!==this.hintTarget)this.hintReveal=null;
      else if(!this.focusMotion){
        if(reveal.started<0)reveal.started=this.clock;
        const age=this.clock-reveal.started,duration=Math.max(360,Math.min(650,path.length*this.boardCamera.scale/750*1000));
        if(age<duration){
          const end=path.length*Math.min(1,age/duration),band=Math.min(path.length,Math.max(1.2,path.length*.18));
          const light=extractPath(path,Math.max(0,end-band),Math.min(band,end));
          this.stroke(this.active,light,this.colors.exit,stroke*2.7,false,.38);
          this.stroke(this.active,light,0xffffff,stroke*1.05,false,.95);
          this.excite(pointAt(path,end),3);
        }
        else{
          if(!reveal.arrived){reveal.arrived=true;this.excite(path.points.at(-1)!,9);this.feedback('hint-ready');}
          const t=(age-duration)/240,head=path.points.at(-1)!;
          if(t>=1)this.hintReveal=null;
          else this.active.lineStyle(1.4/this.boardCamera.scale,this.colors.exit,1-t).strokeCircle(head.x,head.y,(5+t*14)/this.boardCamera.scale);
        }
      }
    }
    if (this.stableDirty) this.drawStable();
    if (bumpSettled) this.changed();
    this.impacts = this.impacts.filter(impact => this.clock-impact.started < 220);
    for (const impact of this.impacts) {
      const t = (this.clock-impact.started)/220, p = impact.contact.point, d = impact.direction, unit = 1/this.boardCamera.scale;
      const blocker = this.paths.get(impact.contact.arrowId);
      if (blocker && this.board.remaining.some(a => a.id === impact.contact.arrowId)) this.stroke(this.active, blocker.points, this.colors.error, stroke*1.65, true, (1-t)*.5);
      this.active.lineStyle(1.6*unit, this.colors.error, 1-t);
      for (let ray = 0; ray < 5; ray++) {
        const angle = Math.atan2(-d.y,-d.x)+(ray-2)*.65, near = (3+t*5)*unit, far = (8+t*9)*unit;
        this.active.lineBetween(p.x+Math.cos(angle)*near,p.y+Math.sin(angle)*near,p.x+Math.cos(angle)*far,p.y+Math.sin(angle)*far);
      }
    }
    // An expired restored timestamp can be negative while the scene is young.
    if (this.board.complete && !this.announcedWin && this.flights.length === 0 && this.victoryAt === -1) {
      if(!this.finishFramed){
        this.finishFramed=true;this.hintReveal=null;
        const to={centerX:(this.board.level.width-1)/2,centerY:(this.board.level.height-1)/2,zoom:1};
        if(this.reducedMotion){this.boardCamera.restore(to);this.transform();}
        else this.focusMotion={from:this.boardCamera.snapshot(),to,elapsed:0};
      }
      if(!this.focusMotion){this.victoryAt=this.clock;this.startCelebration();this.feedback('victory');}
    }
    if (this.victoryAt >= 0) {
      const radius = Math.min(1, (this.clock-this.victoryAt)/500)*this.victoryRadius;
      while(this.victorySource && this.victoryCursor<this.victoryDots.length) {
        const point=this.victoryDots[this.victoryCursor]!;
        if(Math.hypot(point.x-this.victorySource.x,point.y-this.victorySource.y)>radius)break;
        this.victoryCursor++; this.excite(point,10);
      }
      if (!this.announcedWin && this.clock - this.victoryAt > (this.reducedMotion ? 80 : 340)) { this.announcedWin = true; this.changed(); this.feedback('win-ready'); }
    }
    this.reactiveDots.clear();
    const pulseColor=this.board.complete && this.board.snapshot().errors.length===0 ? (this.theme==='dark'?0xffd596:0x9c6b24) : this.colors.exit;
    for (const [key, pulse] of this.pulses) {
      stepDampedMotion(pulse.motion, dt / 1000, { angularFrequency: 24, damping: 9 });
      if (Math.abs(pulse.motion.x) < .008 && Math.abs(pulse.motion.v) < .1) { this.pulses.delete(key); continue; }
      const strength = Math.min(1, Math.abs(pulse.motion.x) * 2);
      this.reactiveDots.fillStyle(pulseColor,strength);this.dotCircle(this.reactiveDots,pulse.point.x,pulse.point.y,.07+Math.max(0,pulse.motion.x)*.18);
    }
    this.overlay.clear();
    this.drawCelebration();
    if (!this.reducedMotion && this.errorUntil > this.clock) this.overlay.fillStyle(this.colors.error, .065 * (this.errorUntil - this.clock) / 230).fillRect(0, 0, this.scale.width, this.scale.height);
  }
}
