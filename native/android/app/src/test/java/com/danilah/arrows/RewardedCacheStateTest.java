package com.danilah.arrows;
import org.junit.Test;
import static org.junit.Assert.*;

public class RewardedCacheStateTest {
    @Test public void onlyOneLoadAndReadyObjectExistAndTakeIsSingleUse() {
        RewardedCacheState c = new RewardedCacheState(); int token=c.begin(100);
        assertEquals("loading",c.phase(100)); assertEquals(-1,c.begin(101));
        assertTrue(c.loaded(token,200)); assertEquals("ready",c.phase(201)); assertEquals(-1,c.begin(201));
        assertTrue(c.take(202)); assertFalse(c.take(202)); assertFalse(c.loaded(token,203));
    }
    @Test public void expiredObjectsCannotBeShownAndOldCallbacksCannotReplaceNewCache() {
        RewardedCacheState c = new RewardedCacheState(); int old=c.begin(0); c.loaded(old,10);
        assertEquals("expired",c.phase(300010)); assertFalse(c.take(300010));
        int next=c.begin(300011); assertFalse(c.loaded(old,300012)); assertTrue(c.loaded(next,300013));
    }
    @Test public void cancellationAndBackgroundInvalidateLoadingGeneration() {
        RewardedCacheState c = new RewardedCacheState(); int old=c.begin(0); c.invalidate();
        int fresh=c.begin(2); assertFalse(c.loaded(old,3)); assertFalse(c.failed(old,3)); assertTrue(c.loaded(fresh,4));
    }
    @Test public void failureBackoffNeedsANewDemandAndNeverStartsItself() {
        RewardedCacheState c = new RewardedCacheState(); int token=c.begin(0); assertTrue(c.failed(token,10));
        assertEquals(-1,c.begin(30009)); assertEquals("backoff",c.phase(30009));
        assertEquals("idle",c.phase(30010)); assertFalse(c.loaded(token,30010)); assertTrue(c.begin(30010)>token);
    }
}
