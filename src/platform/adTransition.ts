import type { GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';

/** A user transition waits for both terminal SDK settlement and every external foreground blocker. */
export function createAdTransition(activity: GameplayActivityCoordinator, changed: () => void, failed: () => void) {
  let alive = true, job: { settled: boolean; advancing: boolean; advance(): Promise<void> } | undefined;
  const drain = (): void => {
    const current = job;
    if (!alive || !current?.settled || current.advancing || activity.getBlockReasons().some(reason => reason !== 'ad-transition')) return;
    current.advancing = true;
    void current.advance().catch(() => { if (alive) failed(); }).finally(() => {
      if (!alive || job !== current) return;
      job = undefined; activity.setBlocked('ad-transition', false); changed();
    });
  };
  const unsubscribe = activity.onBlockReasonsChange(drain);
  return {
    get busy(): boolean { return job !== undefined; },
    start(before: () => Promise<boolean>, show: () => Promise<unknown>, advance: () => Promise<void>): void {
      if (!alive || job) return;
      const current = { settled: false, advancing: false, advance }; job = current;
      activity.setBlocked('ad-transition', true); changed();
      void (async () => {
        const eligible = await before(); if (!alive || job !== current) return;
        if (eligible) { activity.setBlocked('ad-transition', false); await show(); }
        if (!alive || job !== current) return;
        current.settled = true; activity.setBlocked('ad-transition', true); drain();
      })().catch(() => { if (!alive || job !== current) return; job = undefined; activity.setBlocked('ad-transition', false); failed(); changed(); });
    },
    destroy(): void { alive = false; job = undefined; unsubscribe(); activity.setBlocked('ad-transition', false); },
  };
}
