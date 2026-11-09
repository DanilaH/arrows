export interface AdCadence { version: 1; activeMs: number; nextRequestMs: number; progressAtRequest: number; }
export const AD_INTERVAL_MS = 150_000;
export const freshAdCadence = (wins = 0): AdCadence => ({ version: 1, activeMs: 0, nextRequestMs: AD_INTERVAL_MS, progressAtRequest: wins });
export function decodeAdCadence(value: unknown, wins: number): AdCadence {
  if (value === undefined) return freshAdCadence(wins);
  const c = value as AdCadence | null;
  if (!c || c.version !== 1 || ![c.activeMs, c.nextRequestMs, c.progressAtRequest].every(n => Number.isSafeInteger(n) && n >= 0) || c.progressAtRequest > wins) throw Error('Invalid ad cadence');
  return { version: 1, activeMs: c.activeMs, nextRequestMs: c.nextRequestMs, progressAtRequest: c.progressAtRequest };
}
export function interstitialReason(cadence: AdCadence, wins: number): 'eligible' | 'protected' | 'cooldown' | 'progress' {
  if (wins < 6) return 'protected';
  if (cadence.activeMs < cadence.nextRequestMs) return 'cooldown';
  return wins - cadence.progressAtRequest >= 2 ? 'eligible' : 'progress';
}
export function deferAds(cadence: AdCadence, wins: number): void {
  cadence.nextRequestMs = Math.max(cadence.nextRequestMs, cadence.activeMs + AD_INTERVAL_MS); cadence.progressAtRequest = wins;
}
