import { distance, type Point } from '../domain/geometry';
export type GesturePhase = 'idle' | 'pressCandidate' | 'heldPreview' | 'pan' | 'pinch' | 'cancelled';
interface Callbacks {
  hit(point: Point): string | null;
  contains(id: string, point: Point): boolean;
  activate(id: string): void;
  preview(id: string | null): void;
  pan(dx: number, dy: number): void;
  pinch(previous: Point, current: Point, ratio: number): void;
}
/** Pointer state only. The DOM adapter owns capture, the one hold timer and disposal. */
export class BoardGestures {
  public phase: GesturePhase = 'idle';
  private pointers = new Map<number, Point>();
  private target: string | null = null;
  private start: Point = { x: 0, y: 0 };
  private downAt = 0;
  public constructor(private readonly callbacks: Callbacks) {}
  public hasPointer(id: number): boolean { return this.pointers.has(id); }
  public down(id: number, point: Point, time: number): void {
    this.pointers.set(id, point);
    if (this.pointers.size === 1 && this.phase === 'idle') {
      this.start = point; this.downAt = time; this.target = this.callbacks.hit(point); this.phase = 'pressCandidate';
    } else { this.target = null; this.callbacks.preview(null); this.phase = 'pinch'; }
  }
  public hold(time: number): void {
    if (this.phase === 'pressCandidate' && this.target && time - this.downAt >= 300) {
      this.phase = 'heldPreview'; this.callbacks.preview(this.target);
    }
  }
  public move(id: number, point: Point): void {
    const old = this.pointers.get(id); if (!old) return;
    const before = [...this.pointers.values()]; this.pointers.set(id, point);
    if (this.phase === 'pinch') {
      const after = [...this.pointers.values()];
      if (before.length !== 2 || after.length !== 2) return;
      const center = (p: Point[]): Point => ({ x: (p[0]!.x + p[1]!.x) / 2, y: (p[0]!.y + p[1]!.y) / 2 });
      const span = distance(before[0]!, before[1]!);
      if (span > 4) this.callbacks.pinch(center(before), center(after), distance(after[0]!, after[1]!) / span);
      return;
    }
    if (this.phase === 'heldPreview' && this.target && !this.callbacks.contains(this.target, point)) {
      this.target = null; this.phase = 'cancelled'; this.callbacks.preview(null);
    }
    if (this.phase !== 'pan' && distance(this.start, point) >= 8) {
      this.target = null; this.callbacks.preview(null); this.phase = 'pan';
    }
    if (this.phase === 'pan') this.callbacks.pan(point.x - old.x, point.y - old.y);
  }
  public up(id: number, point: Point): void {
    if (!this.pointers.has(id)) return;
    // Validate final displacement too: some WebViews coalesce the last move into pointerup.
    this.move(id, point);
    const target = this.target, activate = this.pointers.size === 1 &&
      (this.phase === 'pressCandidate' || this.phase === 'heldPreview') && target !== null && this.callbacks.contains(target, point);
    this.pointers.delete(id);
    this.target = null; this.callbacks.preview(null);
    if (!this.pointers.size) this.phase = 'idle';
    else this.phase = 'pinch';
    if (activate) this.callbacks.activate(target!);
  }
  public cancel(): void { this.pointers.clear(); this.target = null; this.phase = 'idle'; this.callbacks.preview(null); }
}
