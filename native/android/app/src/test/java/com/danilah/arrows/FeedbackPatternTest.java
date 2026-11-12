package com.danilah.arrows;
import org.junit.Test;
import static org.junit.Assert.*;

public class FeedbackPatternTest {
    @Test public void profilesAreFiniteDistinctAndBounded() {
        String[] cues = {"button", "remove", "combo", "error", "hint", "life", "win"};
        for (String cue : cues) {
            FeedbackPattern p = FeedbackPattern.forCue(cue);
            assertNotNull(p); assertEquals(p.timings.length, p.amplitudes.length);
            assertEquals(0, p.timings[0]); assertEquals(0, p.amplitudes[0]); long duration = 0;
            for (int i=0; i<p.timings.length; i++) {
                assertTrue(p.timings[i] >= 0); assertTrue(p.amplitudes[i] >= 0 && p.amplitudes[i] <= 255);
                if (i % 2 == 0) assertEquals(0, p.amplitudes[i]);
                duration += p.timings[i];
            }
            assertTrue(duration > 0 && duration <= 200);
        }
        assertEquals(2, FeedbackPattern.forCue("button").timings.length);
        assertEquals(4, FeedbackPattern.forCue("error").timings.length);
        assertEquals(6, FeedbackPattern.forCue("win").timings.length);
        assertNull(FeedbackPattern.forCue("unknown"));
    }
    @Test public void callersCannotMutateAnotherCueInstance() {
        FeedbackPattern p = FeedbackPattern.forCue("win"); p.timings[1] = 9999;
        assertEquals(20, FeedbackPattern.forCue("win").timings[1]);
    }
}
