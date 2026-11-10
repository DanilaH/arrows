import Phaser from 'phaser';
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
      this.scale.off(Phaser.Scale.Events.RESIZE, resized); this.listeners.clear(); this.pulses.clear(); this.flights.length = 0;
    });
    this.options.ready(this);
    this.game.events.emit(GAME_PRESENTABLE_EVENT);
  }
  public subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private changed(): void { for (const listener of this.listeners) listener(); this.options.dirty(); }
  public loadAttempt(board: Board, view: ViewState | null = null, guides = false, hint: string | null = null): void {
    const level = board.level; this.board = board; this.guides = guides; this.hintTarget = null; this.focusMotion = null;
    this.boardCamera = new BoardCamera(level.width, level.height);
    this.paths = new Map(level.arrows.map(a => [a.id, measurePath(a.path)]));
    this.dotMask = new Map(level.mask.map(p => [`${p.x},${p.y}`, p]));
    this.flights.length = 0; this.pulses.clear(); this.preview = null;
    this.entry = this.clock - (this.reducedMotion ? 500 : 0); this.errorUntil = -1; this.victoryAt = -1; this.victoryCursor = 0; this.announcedWin = false;
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
  public setPreview(id: string | null): void { if (id === this.preview) return; this.preview = id; this.stableDirty = true; this.changed(); }
  public setGuides(value: boolean): void { this.guides = value; this.stableDirty = true; this.changed(); }
  public activate(id: string): MoveResult {
    const result = this.board.activate(id);
    if (result.kind === 'ignored') return result;
    this.presentMove(result); return result;
  }
  private presentMove(result: Exclude<MoveResult, { kind: 'ignored' }>): void {
    if (result.kind === 'removed') {
      this.flights.push({ path: this.paths.get(result.arrow.id)!, travelled: 0, speed: Math.max(22, 950 / this.boardCamera.scale), age: 0 });
    } else {
      this.errorUntil = this.clock + 230; this.excite(result.arrow.path.at(-1)!, 12);
    }
    this.preview = null; this.stableDirty = true; this.changed(); this.options.move(result);
  }
  private drawDots(): void {
    this.dots.clear().fillStyle(this.colors.dot, 1);
    for (const point of this.board.level.mask) this.dots.fillCircle(point.x, point.y, .07);
  }
  private stroke(layer: Phaser.GameObjects.Graphics, path: readonly Point[], color: number, width: number, arrowhead: boolean): void {
    if (path.length < 2) return;
    layer.lineStyle(width, color, 1).beginPath().moveTo(path[0]!.x, path[0]!.y);
    for (let i = 1; i < path.length; i++) layer.lineTo(path[i]!.x, path[i]!.y);
    layer.strokePath().fillStyle(color, 1);
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
    const amount = Math.min(1, (this.clock - this.entry) / 380);
    const ease = 1 - (1 - amount) ** 3;
    for (const arrow of this.board.remaining) {
      const path = this.paths.get(arrow.id)!;
      if (this.guides || arrow.id === this.preview) {
        const head = arrow.path.at(-1)!;
        this.guidesLayer.lineStyle(Math.max(.035, .7 / this.boardCamera.scale), this.colors.guide, 1);
        this.guidesLayer.lineBetween(head.x, head.y, head.x + path.direction.x * 150, head.y + path.direction.y * 150);
      }
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
  public hasMotion(): boolean {
    return this.focusMotion !== null || this.clock - this.entry < 400 || this.flights.length > 0 || this.pulses.size > 0 || this.errorUntil > this.clock ||
      this.victoryAt >= 0 && this.clock - this.victoryAt < (this.reducedMotion ? 150 : 1200);
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
    if (this.clock - this.entry < 420) this.stableDirty = true;
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
      if (flight.travelled >= flight.path.length && leftView) { this.flights.splice(i, 1); continue; }
      this.stroke(this.active, path, this.colors.exit, stroke, true);
    }
    if (this.board.complete && this.flights.length === 0 && this.victoryAt < 0) this.victoryAt = this.clock;
    if (this.victoryAt >= 0) {
      const target = Math.min(this.board.level.mask.length, Math.floor((this.clock - this.victoryAt) / 450 * this.board.level.mask.length));
      while (this.victoryCursor < target) this.excite(this.board.level.mask[this.victoryCursor++]!, 8);
      if (!this.announcedWin && this.clock - this.victoryAt > (this.reducedMotion ? 80 : 500)) { this.announcedWin = true; this.changed(); }
    }
    this.reactiveDots.clear();
    for (const [key, pulse] of this.pulses) {
      stepDampedMotion(pulse.motion, dt / 1000, { angularFrequency: 24, damping: 9 });
      if (Math.abs(pulse.motion.x) < .008 && Math.abs(pulse.motion.v) < .1) { this.pulses.delete(key); continue; }
      const strength = Math.min(1, Math.abs(pulse.motion.x) * 2);
      this.reactiveDots.fillStyle(this.colors.exit, strength).fillCircle(pulse.point.x, pulse.point.y, .07 + Math.max(0, pulse.motion.x) * .18);
    }
    this.overlay.clear();
    if (!this.reducedMotion && this.errorUntil > this.clock) this.overlay.fillStyle(this.colors.error, .065 * (this.errorUntil - this.clock) / 230).fillRect(0, 0, this.scale.width, this.scale.height);
  }
}
