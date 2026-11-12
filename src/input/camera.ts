import type { Point } from '../domain/geometry';
import type { ViewState } from '../progression/save';
export interface Rect { x: number; y: number; width: number; height: number; }
export class BoardCamera {
  public x = 0; public y = 0; public scale = 1;
  public minScale = 1; public maxScale = 1;
  private view: Rect = { x: 0, y: 0, width: 1, height: 1 };
  public constructor(private readonly width: number, private readonly height: number) {}
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
  public focus(point: Point): ViewState { return { centerX: point.x, centerY: point.y, zoom: Math.max(this.scale, Math.min(26, this.maxScale)) / this.minScale }; }
  public layout(view: Rect, reset = false): void {
    const oldCenter = this.world({ x: this.view.x + this.view.width / 2, y: this.view.y + this.view.height / 2 });
    const oldRelative = this.scale / this.minScale;
    this.view = view;
    // Compact puzzles get a tighter 19px grid; larger fields still fit the viewport.
    const cellLimit = this.width <= 13 && this.height <= 13 ? 19 : 30;
    this.minScale = Math.min(cellLimit, (view.width - 40) / (this.width + 1), (view.height - 40) / (this.height + 1));
    this.maxScale = Math.max(42, this.minScale * 4);
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
    const limit = (offset: number, span: number, start: number, size: number): number => {
      if (span <= size - 32) return start + (size - span) / 2;
      return Math.max(start + size - span - 48, Math.min(start + 48, offset));
    };
    this.x = limit(this.x, (this.width - 1) * this.scale, this.view.x, this.view.width);
    this.y = limit(this.y, (this.height - 1) * this.scale, this.view.y, this.view.height);
  }
}
