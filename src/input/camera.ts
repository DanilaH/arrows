import type { Point } from '../domain/geometry';
import type { ViewState } from '../progression/save';
export interface Rect { x: number; y: number; width: number; height: number; }
export class BoardCamera {
  public x = 0; public y = 0; public scale = 1;
  public minScale = 1; public maxScale = 1;
  private view: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private fit: ViewState = { centerX: 0, centerY: 0, zoom: 1 };
  public constructor(private readonly width: number, private readonly height: number,
    private readonly bounds: Rect = { x: 0, y: 0, width: width - 1, height: height - 1 }) {}
  public screen(p: Point): Point { return { x: this.x + p.x * this.scale, y: this.y + p.y * this.scale }; }
  public world(p: Point): Point { return { x: (p.x - this.x) / this.scale, y: (p.y - this.y) / this.scale }; }
  public snapshot(): ViewState {
    const center = this.world({ x: this.view.x + this.view.width / 2, y: this.view.y + this.view.height / 2 });
    return { centerX: center.x, centerY: center.y, zoom: this.scale / this.minScale };
  }
  public restore(view: ViewState): void {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.minScale * view.zoom));
    this.x = this.view.x + this.view.width / 2 - view.centerX * this.scale;
    this.y = this.view.y + this.view.height / 2 - view.centerY * this.scale; this.clamp();
  }
  /** The original full-field view for the current viewport, never remaining paths. */
  public overview(): ViewState { return { ...this.fit }; }
  public get needsOverview(): boolean {
    const current=this.snapshot();
    return Math.abs(current.zoom-1)>.025 || Math.hypot((current.centerX-this.fit.centerX)*this.scale,(current.centerY-this.fit.centerY)*this.scale)>8;
  }
  public focus(point: Point): ViewState { return { centerX: point.x, centerY: point.y, zoom: Math.max(this.scale, Math.min(26, this.maxScale)) / this.minScale }; }
  /** Presentation-only overview. Keep saved world-centre/relative-zoom meaning. */
  public framePoints(points: readonly Point[], padding = 28): ViewState {
    if (!points.length) return this.snapshot();
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const scale = Math.max(this.minScale, Math.min(26, this.maxScale,
      (this.view.width - 2 * padding) / Math.max(1, right - left),
      (this.view.height - 2 * padding) / Math.max(1, bottom - top)));
    return { centerX: (left + right) / 2, centerY: (top + bottom) / 2, zoom: scale / this.minScale };
  }
  public layout(view: Rect, reset = false): void {
    const oldCenter = this.world({ x: this.view.x + this.view.width / 2, y: this.view.y + this.view.height / 2 });
    const oldRelative = this.scale / this.minScale;
    this.view = view;
    // Compact puzzles get a tighter 19px grid; larger fields still fit the viewport.
    const cellLimit = this.width <= 13 && this.height <= 13 ? 19 : 30;
    this.minScale = Math.min(cellLimit, (view.width - 40) / (this.width + 1), (view.height - 40) / (this.height + 1));
    this.maxScale = Math.max(42, this.minScale * 4);
    const fit=this.constrained(view.x+view.width/2-(this.width-1)/2*this.minScale,
      view.y+view.height/2-(this.height-1)/2*this.minScale,this.minScale);
    this.fit={centerX:(view.x+view.width/2-fit.x)/this.minScale,centerY:(view.y+view.height/2-fit.y)/this.minScale,zoom:1};
    this.scale = Math.min(this.maxScale, this.minScale * (reset ? 1 : oldRelative));
    const center = reset ? { x: (this.width - 1) / 2, y: (this.height - 1) / 2 } : oldCenter;
    this.x = view.x + view.width / 2 - center.x * this.scale;
    this.y = view.y + view.height / 2 - center.y * this.scale;
    this.clamp();
  }
  public pan(dx: number, dy: number): void { this.x += dx; this.y += dy; this.clamp(); }
  public zoom(previous: Point, current: Point, ratio: number): void {
    if (!Number.isFinite(ratio) || ratio <= 0) return;
    const anchor = this.world(previous);
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * ratio));
    this.x = current.x - anchor.x * this.scale; this.y = current.y - anchor.y * this.scale;
    this.clamp();
  }
  private clamp(): void {
    const p=this.constrained(this.x,this.y,this.scale);this.x=p.x;this.y=p.y;
  }
  private constrained(x:number,y:number,scale:number): Point {
    // Keep the fit view quiet. Zoom gradually opens a wider exploration band,
    // including the shorter axis, while retaining the ORIGINAL field on screen.
    const freedom = Math.max(0, Math.min(1, (scale / this.minScale - 1) / .6));
    const limit = (offset: number, span: number, start: number, size: number): number => {
      const center = start + (size - span) / 2;
      const fitTravel = Math.max(0, (span - size) / 2 + 48);
      const zoomTravel = Math.max(size * .3, (span - size) / 2 + Math.min(240, size * .42));
      const travel = fitTravel + (zoomTravel - fitTravel) * freedom;
      return Math.max(center - travel, Math.min(center + travel, offset));
    };
    // Bounds belong to the original field, never its shrinking remaining arrows.
    // Ignore catalogue padding while preserving world coordinates and saved zoom.
    const left = this.bounds.x * scale, top = this.bounds.y * scale;
    return {x:limit(x + left, this.bounds.width * scale, this.view.x, this.view.width) - left,
      y:limit(y + top, this.bounds.height * scale, this.view.y, this.view.height) - top};
  }
}
