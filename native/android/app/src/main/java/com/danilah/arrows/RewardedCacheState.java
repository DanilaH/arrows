package com.danilah.arrows;

/** Main-thread, ownerless cache policy; SDK objects and explicit show sessions stay in the plugin. */
final class RewardedCacheState {
    static final long TTL_MS = 300000, BACKOFF_MS = 30000;
    private int generation;
    private String phase = "idle";
    long loadedAt, expiresAt, retryAt;
    String phase(long now) {
        if (phase.equals("ready") && now >= expiresAt) { phase = "expired"; generation++; }
        if (phase.equals("backoff") && now >= retryAt) phase = "idle";
        return phase;
    }
    int begin(long now) {
        String current = phase(now);
        if (current.equals("loading") || current.equals("ready") || current.equals("backoff")) return -1;
        phase = "loading"; loadedAt = expiresAt = 0; return ++generation;
    }
    boolean loaded(int token, long now) {
        if (token != generation || !phase.equals("loading")) return false;
        phase = "ready"; loadedAt = now; expiresAt = now + TTL_MS; return true;
    }
    boolean failed(int token, long now) {
        if (token != generation || !phase.equals("loading")) return false;
        phase = "backoff"; retryAt = now + BACKOFF_MS; generation++; return true;
    }
    boolean take(long now) {
        if (!phase(now).equals("ready")) return false;
        phase = "idle"; generation++; return true;
    }
    void invalidate() { phase = "idle"; generation++; loadedAt = expiresAt = 0; }
    void showFailed(long now) { phase = "backoff"; retryAt = now + BACKOFF_MS; generation++; }
    int generation() { return generation; }
}
