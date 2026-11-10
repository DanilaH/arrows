import Phaser from 'phaser';
import { arrowContact, bumpTiming, sampleBump, type ArrowContact, type BumpTiming } from './bumpMotion';
import { boardPalettes } from '../app/theme';
import type { GameTheme } from '../app/settings';
import { stepDampedMotion } from '@danilah/mini-games-kit/feel';
import { campaign } from '../content/campaign';
import { Board, type MoveResult } from '../domain/board';
import { extractPath, measurePath, pointAt, type Arrow, type MeasuredPath, type Point } from '../domain/geometry';
import { BoardCamera, type Rect } from '../input/camera';
import type { ViewState } from '../progression/save';

export const GAME_PRESENTABLE_EVENT = 'arrows:scene-authored';

interface Flight { path: MeasuredPath; travelled: number; speed: number; age: number; }
interface Bump { id: string; path: MeasuredPath; timing: BumpTiming; contact: ArrowContact; started: number; impacted: boolean; }
interface Impact { contact: ArrowContact; direction: Point; started: number; }
interface Confetto { vx: number; vy: number; angle: number; spin: number; length: number; width: number; life: number; color: number; }
export type SceneFeedback = { kind: 'move-start' | 'blocked-start' | 'impact' | 'exit' | 'victory' | 'win-ready'; attempt: string; };
interface DotPulse { point: Point; motion: { x: number; v: number }; }
export interface SceneOptions { ready(scene: BoardScene): void; dirty(): void; move(result: MoveResult): void; }

/** Stable geometry is rebuilt on state/camera changes; only active flights/dots animate. */
export class BoardScene extends Phaser.Scene {
  public board = new Board(campaign[0]!, crypto.randomUUID());
  public boardCamera = new BoardCamera(this.board.level.width, this.board.level.height);
  public guides = false;
  public preview: string | null = null;
  public hintTarget: string | null = null;
  public clock = 0;
  public frames = 0;
  public playArea: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private colors: { arrow: number; exit: number; error: number; dot: number; guide: number } = boardPalettes.dark;
  private theme: GameTheme = 'dark';
  public setTheme(theme: GameTheme): void {
    if (this.theme === theme) return; this.theme = theme;
    this.colors = boardPalettes[theme]; this.stableDirty = true;
    if (this.dots) { this.drawDots(); this.changed(); }
  }
  private world!: Phaser.GameObjects.Container;
  private stable!: Phaser.GameObjects.Graphics;
  private dots!: Phaser.GameObjects.Graphics;
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
  private announcedWin = false;
  private widthCss = 1;
  private heightCss = 1;
  private readonly listeners = new Set<() => void>();
  private stableDirty = true;
  private focusMotion: { from: ViewState; to: ViewState; elapsed: number } | null = null;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  public constructor(private readonly options: SceneOptions) { super('board'); }
  public create(): void {
    this.dots = this.add.graphics(); this.guidesLayer = this.add.graphics(); this.stable = this.add.graphics();
    this.reactiveDots = this.add.graphics(); this.active = this.add.graphics();
    this.world = this.add.container(0, 0, [this.dots, this.guidesLayer, this.stable, this.reactiveDots, this.active]);
    this.overlay = this.add.graphics();
    this.loadAttempt(this.board);
    const resized = (): void => this.layout(false);
    this.scale.on(Phaser.Scale.Events.RESIZE, resized);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, resized); this.listeners.clear(); this.feedbackListeners.clear(); this.pulses.clear(); this.flights.length = 0; this.bumps.clear(); this.impacts.length = 0; this.confetti.length = 0;
    });
    this.options.ready(this);
    this.game.events.emit(GAME_PRESENTABLE_EVENT);
  }
  public subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  public subscribeFeedback(listener: (event: SceneFeedback) => void): () => void { this.feedbackListeners.add(listener); return () => this.feedbackListeners.delete(listener); }
  private feedback(kind: SceneFeedback['kind']): void { for (const listener of this.feedbackListeners) listener({ kind, attempt: this.board.attemptId }); }
  public get hasErrorMotion(): boolean { return this.bumps.size > 0; }
  /** Navigation/background settles presentation without changing the canonical board. */
  public settlePresentation(): void {
    this.bumps.clear(); this.impacts.length = 0; this.flights.length = 0; this.pulses.clear(); this.confetti.length = 0;
    this.errorUntil = -1; this.focusMotion = null; this.entry = this.clock - 500;
    if (this.board.complete) { this.victoryAt = this.clock - 2200; this.victoryCursor = this.board.level.mask.length; this.announcedWin = true; }
    this.stableDirty = true; this.active?.clear(); this.overlay?.clear(); this.reactiveDots?.clear(); this.changed();
  }
  private changed(): void { for (const listener of this.listeners) listener(); this.options.dirty(); }
  public loadAttempt(board: Board, view: ViewState | null = null, guides = false, hint: string | null = null): void {
    const level = board.level; this.board = board; this.guides = guides; this.hintTarget = null; this.focusMotion = null;
    this.boardCamera = new BoardCamera(level.width, level.height);
    this.paths = new Map(level.arrows.map(a => [a.id, measurePath(a.path)]));
    this.dotMask = new Map(level.mask.map(p => [`${p.x},${p.y}`, p]));
    this.flights.length = 0; this.bumps.clear(); this.impacts.length = 0; this.confetti.length = 0; this.pulses.clear(); this.preview = null; this.rewardCelebration=false; this.active.clear(); this.overlay.clear(); this.reactiveDots.clear();
    this.entry = this.clock - (this.reducedMotion || board.complete ? 500 : 0); this.errorUntil = -1; this.victoryAt = board.complete ? this.clock - 2200 : -1; this.victoryCursor = board.complete ? level.mask.length : 0; this.announcedWin = board.complete;
    this.stableDirty = true; this.layout(true);
    if (view) { this.boardCamera.restore(view); this.transform(); }
    this.drawDots(); this.setHint(hint); this.changed();
  }
  public acceptBoard(board: Board, result?: MoveResult): void {
    this.board = board;
    if (result && result.kind !== 'ignored') this.presentMove(result);
    this.stableDirty = true; this.changed();
  }
  public setHint(id: string | null, focus = true): void {
    if (this.hintTarget === id) return;
    this.hintTarget = id;
    const arrow = this.board.remaining.find(a => a.id === id);
    if (arrow && focus) {
      const head = arrow.path.at(-1)!, screen = this.boardCamera.screen(head), v = this.playArea;
      if (screen.x < 36 || screen.x > v.width - 36 || screen.y < v.y + 36 || screen.y > v.y + v.height - 36 || this.boardCamera.scale < 15) {
        const to = this.boardCamera.focus(head);
        if (this.reducedMotion) { this.boardCamera.restore(to); this.transform(); }
        else this.focusMotion = { from: this.boardCamera.snapshot(), to, elapsed: 0 };
      }
    }
    this.stableDirty = true; this.changed();
  }
  public get finished(): boolean { return this.announcedWin; }
  private measureView(): Rect {
    // Insets are measured from the real DOM HUD, including enlarged fonts/cutouts.
    const header = document.querySelector<HTMLElement>('#game-header')?.getBoundingClientRect();
    const footer = document.querySelector<HTMLElement>('#game-footer')?.getBoundingClientRect();
    const top = header?.bottom ?? 92, bottom = footer?.top ?? this.heightCss - 100;
    return { x: 0, y: top + 12, width: this.widthCss, height: Math.max(100, bottom - top - 24) };
  }
  public layout(reset = false): void {
    const ratio = 1 / this.scale.zoom;
    this.widthCss = this.scale.width / ratio; this.heightCss = this.scale.height / ratio;
    this.playArea = this.measureView();
    this.boardCamera.layout(this.playArea, reset);
    const view = this.playArea;
    // A camera viewport is a scissor in both renderer backends; no offscreen mask/filter allocation.
    this.cameras.main.setViewport(view.x * ratio, view.y * ratio, view.width * ratio, view.height * ratio)
      .setScroll(view.x * ratio, view.y * ratio);
    this.transform(); this.stableDirty = true; this.changed();
  }
  private transform(): void {
    const ratio = 1 / this.scale.zoom, camera = this.boardCamera;
    this.world.setPosition(camera.x * ratio, camera.y * ratio).setScale(camera.scale * ratio);
  }
  public pan(dx: number, dy: number): void { this.focusMotion = null; this.boardCamera.pan(dx, dy); this.transform(); this.changed(); }
  public zoom(previous: Point, current: Point, ratio: number): void {
    this.focusMotion = null; this.boardCamera.zoom(previous, current, ratio); this.transform(); this.stableDirty = true; this.changed();
  }
  public setPreview(id: string | null): void { if (id === this.preview) return; this.preview = id; this.previewAt=this.clock; const arrow=this.board.remaining.find(a=>a.id===id); if(arrow)this.excite(arrow.path.at(-1)!,4); this.stableDirty = true; this.changed(); }
  public setGuides(value: boolean): void { this.guides = value; this.stableDirty = true; this.changed(); }
  public activate(id: string): MoveResult {
    const result = this.board.activate(id);
    if (result.kind === 'ignored') return result;
    this.presentMove(result); return result;
  }
  private presentMove(result: Exclude<MoveResult, { kind: 'ignored' }>): void {
    if (result.kind === 'removed') {
      const bump = this.bumps.get(result.arrow.id), travelled = bump ? sampleBump(bump.timing, this.clock-bump.started).distance : 0;
      this.bumps.delete(result.arrow.id);
      if (!this.reducedMotion) this.flights.push({ path: this.paths.get(result.arrow.id)!, travelled, speed: Math.max(22, 950 / this.boardCamera.scale), age: 0 });
      else this.feedback('exit');
      this.feedback('move-start');
    } else {
      const contact = arrowContact(result.arrow, this.board.remaining);
      if (this.reducedMotion || !contact) this.feedback('impact');
      else if (!this.bumps.has(result.arrow.id)) {
        if (this.bumps.size >= 12) this.bumps.delete(this.bumps.keys().next().value!);
        this.bumps.set(result.arrow.id, { id: result.arrow.id, path: this.paths.get(result.arrow.id)!, timing: bumpTiming(contact.distance, this.boardCamera.scale), contact, started: this.clock, impacted: false });
        this.feedback('blocked-start');
      }
    }
    this.preview = null; this.stableDirty = true; this.changed(); this.options.move(result);
  }
  private drawDots(): void {
    this.dots.clear().fillStyle(this.colors.dot, 1);
    for (const point of this.board.level.mask) this.dots.fillCircle(point.x, point.y, .07);
  }
  private stroke(layer: Phaser.GameObjects.Graphics, path: readonly Point[], color: number, width: number, arrowhead: boolean, alpha = 1): void {
    if (path.length < 2) return;
    layer.lineStyle(width, color, alpha).beginPath().moveTo(path[0]!.x, path[0]!.y);
    for (let i = 1; i < path.length; i++) layer.lineTo(path[i]!.x, path[i]!.y);
    layer.strokePath().fillStyle(color, alpha);
    for (let i = 0; i < path.length - 1; i++) layer.fillCircle(path[i]!.x, path[i]!.y, width / 2);
    if (!arrowhead) return;
    const head = path.at(-1)!, previous = path.at(-2)!;
    const dx = Math.sign(head.x - previous.x), dy = Math.sign(head.y - previous.y);
    const size = Math.max(.28, width * 2.8);
    layer.fillTriangle(head.x + dx * size * .12, head.y + dy * size * .12,
      head.x - dx * size - dy * size * .58, head.y - dy * size + dx * size * .58,
      head.x - dx * size + dy * size * .58, head.y - dy * size - dx * size * .58);
  }
  private drawStable(): void {
    this.stableDirty = false; this.stable.clear(); this.guidesLayer.clear();
    const stroke = Math.max(.11, 1.9 / this.boardCamera.scale);
    for (const [index,arrow] of this.board.remaining.entries()) {
      const amount=Math.max(0,Math.min(1,(this.clock-this.entry-Math.min(90,index*8))/280)), ease=1-(1-amount)**3;
      const path = this.paths.get(arrow.id)!;
      if (this.guides || arrow.id === this.preview) {
        const head = arrow.path.at(-1)!, at=this.boardCamera.screen(head), dir=path.direction, view=this.playArea;
        const distance=(dir.x>0?view.x+view.width-at.x:dir.x<0?at.x-view.x:dir.y>0?view.y+view.height-at.y:at.y-view.y)/this.boardCamera.scale;
        const growth=this.reducedMotion||this.guides?1:1-(1-Math.min(1,(this.clock-this.previewAt)/160))**3;
        this.guidesLayer.lineStyle(Math.max(.035, .7 / this.boardCamera.scale), this.colors.guide, 1);
        this.guidesLayer.lineBetween(head.x, head.y, head.x + path.direction.x * Math.max(0,distance)*growth, head.y + path.direction.y * Math.max(0,distance)*growth);
      }
      if (this.bumps.has(arrow.id)) continue;
      const visible = ease < 1 ? extractPath(path, 0, path.length * ease) : arrow.path;
      this.stroke(this.stable, visible, arrow.id === this.preview || arrow.id === this.hintTarget ? this.colors.exit : this.board.isError(arrow.id) ? this.colors.error : this.colors.arrow, stroke * (arrow.id === this.hintTarget ? 1.65 : 1), ease > .6);
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
    this.confetti.length = 0; if (this.reducedMotion) return;
    let seed = this.board.level.mask.length*997+this.board.level.arrows.length*7919;
    const random = (): number => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
    const colors = [0xc0b4ff,0xffd37f,0x91e6e8,0xff91b7,0x7d7dff,0xfff0d0];
    for (let i=0; i<(this.rewardCelebration || this.board.level.difficulty === 'nightmare' ? 104 : this.board.level.difficulty === 'hard' ? 80 : 48); i++) this.confetti.push({ vx: (random()-.5)*340, vy: -100-random()*200, angle: random()*Math.PI*2, spin: (random()-.5)*12, length: 4+random()*6, width: 2+random()*2, life: (this.rewardCelebration || this.board.level.difficulty !== 'normal' ? 1400 : 900)+random()*450, color: colors[i%colors.length]! });
  }
  private drawCelebration(): void {
    if (this.reducedMotion || this.victoryAt < 0) return;
    const age = this.clock-this.victoryAt; if (age>2000) { this.confetti.length=0; return; }
    const ratio=1/this.scale.zoom, view=this.playArea, cx=view.x+view.width/2, cy=view.y+view.height*.46;
    if (age<650) {
      const t=age/650; this.overlay.lineStyle(2*ratio,this.colors.exit,(1-t)*.45).strokeCircle(cx*ratio,cy*ratio,(16+Math.sqrt(t)*100)*ratio);
      this.overlay.lineStyle(1.2*ratio,0xffd37f,(1-t)*.65).strokeCircle(cx*ratio,cy*ratio,(10+Math.sqrt(t)*72)*ratio);
    }
    for (const p of this.confetti) {
      if (age>p.life) continue; const t=age/1000, alpha=Math.min(1,(p.life-age)/400), x=cx+p.vx*t, y=cy+p.vy*t+170*t*t, a=p.angle+p.spin*t;
      const length=p.length*(.55+.45*Math.abs(Math.cos(p.spin*t*.7)));
      this.overlay.lineStyle(p.width*ratio,p.color,Math.max(0,alpha)).lineBetween((x-Math.cos(a)*length/2)*ratio,(y-Math.sin(a)*length/2)*ratio,(x+Math.cos(a)*length/2)*ratio,(y+Math.sin(a)*length/2)*ratio);
    }
  }
  public hasMotion(): boolean {
    return this.preview !== null && this.clock-this.previewAt<180 || this.focusMotion !== null || this.clock - this.entry < 400 || this.flights.length > 0 || this.bumps.size > 0 || this.impacts.length > 0 || this.pulses.size > 0 || this.errorUntil > this.clock ||
      this.victoryAt >= 0 && this.clock - this.victoryAt < (this.reducedMotion ? 150 : 2100);
  }
  public update(_time: number, delta: number): void {
    this.frames += 1;
    const dt = Math.min(40, Math.max(0, delta)); this.clock += dt;
    if (this.focusMotion) {
      const f = this.focusMotion; f.elapsed += dt; const t = 1 - (1 - Math.min(1, f.elapsed / 320)) ** 3;
      this.boardCamera.restore({ centerX: f.from.centerX + (f.to.centerX - f.from.centerX) * t,
        centerY: f.from.centerY + (f.to.centerY - f.from.centerY) * t, zoom: f.from.zoom + (f.to.zoom - f.from.zoom) * t });
      this.transform(); this.stableDirty = true;
      if (f.elapsed >= 320) { this.focusMotion = null; this.changed(); }
    }
    if (this.clock - this.entry < 420 || this.preview !== null && this.clock-this.previewAt<180) this.stableDirty = true;
    if (this.stableDirty) this.drawStable();
    this.active.clear(); const stroke = Math.max(.11, 1.9 / this.boardCamera.scale);
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i]!, old = flight.travelled;
      flight.age += dt; flight.travelled += flight.speed * dt / 1000 * Math.min(1, .3 + flight.age / 110);
      for (let d = old; d <= flight.travelled; d += .5) {
        this.excite(pointAt(flight.path, d), 7); this.excite(pointAt(flight.path, d + flight.path.length), 5);
      }
      const path = extractPath(flight.path, flight.travelled), tail = this.boardCamera.screen(path[0]!);
      const dir = flight.path.direction;
      const view = this.playArea;
      const leftView = dir.x > 0 ? tail.x > view.x + view.width + 30 : dir.x < 0 ? tail.x < view.x - 30 : dir.y > 0 ? tail.y > view.y + view.height + 30 : tail.y < view.y - 30;
      if (flight.travelled >= flight.path.length && leftView) { this.flights.splice(i, 1); this.feedback('exit'); continue; }
      this.stroke(this.active, path, this.colors.exit, stroke, true);
    }
    let bumpSettled = false;
    for (const [id, bump] of this.bumps) {
      if (!bump.impacted && !this.board.remaining.some(a => a.id === bump.contact.arrowId)) {
        const current = sampleBump(bump.timing, this.clock-bump.started).distance;
        bump.timing = { distance: current, outwardMs: 0, holdMs: 0, returnMs: 190, totalMs: 190 }; bump.started = this.clock; bump.impacted = true;
      }
      const sample = sampleBump(bump.timing, this.clock-bump.started);
      if (sample.contacted && !bump.impacted) {
        bump.impacted = true; this.errorUntil = this.clock + 180;
        this.impacts.push({ contact: bump.contact, direction: bump.path.direction, started: this.clock });
        this.excite(bump.contact.point, 16); this.feedback('impact');
      }
      if (sample.done) { this.bumps.delete(id); this.stableDirty = true; bumpSettled = true; continue; }
      this.stroke(this.active, extractPath(bump.path, sample.distance), this.colors.error, stroke, true);
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
    if (this.board.complete && this.flights.length === 0 && this.victoryAt < 0) { this.victoryAt = this.clock; this.startCelebration(); this.feedback('victory'); }
    if (this.victoryAt >= 0) {
      const target = Math.min(this.board.level.mask.length, Math.floor((this.clock - this.victoryAt) / 450 * this.board.level.mask.length));
      while (this.victoryCursor < target) this.excite(this.board.level.mask[this.victoryCursor++]!, 8);
      if (!this.announcedWin && this.clock - this.victoryAt > (this.reducedMotion ? 80 : 340)) { this.announcedWin = true; this.changed(); this.feedback('win-ready'); }
    }
    this.reactiveDots.clear();
    for (const [key, pulse] of this.pulses) {
      stepDampedMotion(pulse.motion, dt / 1000, { angularFrequency: 24, damping: 9 });
      if (Math.abs(pulse.motion.x) < .008 && Math.abs(pulse.motion.v) < .1) { this.pulses.delete(key); continue; }
      const strength = Math.min(1, Math.abs(pulse.motion.x) * 2);
      this.reactiveDots.fillStyle(this.colors.exit, strength).fillCircle(pulse.point.x, pulse.point.y, .07 + Math.max(0, pulse.motion.x) * .18);
    }
    this.overlay.clear();
    this.drawCelebration();
    if (!this.reducedMotion && this.errorUntil > this.clock) this.overlay.fillStyle(this.colors.error, .065 * (this.errorUntil - this.clock) / 230).fillRect(0, 0, this.scale.width, this.scale.height);
  }
}
