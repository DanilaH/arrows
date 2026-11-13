import { Capacitor, registerPlugin } from '@capacitor/core';
export type HapticCue = 'button' | 'remove' | 'combo' | 'error' | 'hint' | 'life' | 'win' | 'route1' | 'route2' | 'route3';
interface FeedbackBridge {
  pulse(options: { cue: HapticCue; issuedAt: number; generation: number }): Promise<void>;
  cancel(options: { generation: number }): Promise<void>;
}
export function createHaptics() {
  const native = Capacitor.isNativePlatform() ? registerPlugin<FeedbackBridge>('ArrowsFeedback') : undefined;
  let generation = 0;
  let blocked = true;
  let enabled = true;
  let disposed = false;
  const cancel = (): void => { generation += 1; void native?.cancel({ generation }).catch(() => undefined); };
  return {
    cancel,
    setEnabled(value: boolean): void { enabled = value; if (!value) cancel(); },
    setBlocked(value: boolean): void { blocked = value; if (value) cancel(); },
    pulse(cue: HapticCue): void {
      if (!disposed && enabled && !blocked) void native?.pulse({ cue, issuedAt: Date.now(), generation }).catch(() => undefined);
    },
    destroy(): void { disposed = true; cancel(); },
  };
}
