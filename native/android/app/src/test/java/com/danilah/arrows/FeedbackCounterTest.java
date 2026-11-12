package com.danilah.arrows;
import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;
public class FeedbackCounterTest {
    @Test public void realBridgeNumbersSurviveJsonIntegerAndLongRepresentations() throws Exception {
        JSONObject data = new JSONObject("{\"generation\":1,\"issuedAt\":1794470000123}");
        assertTrue(data.opt("generation") instanceof Integer);
        assertTrue(data.opt("issuedAt") instanceof Long);
        assertEquals(1, ArrowsFeedbackPlugin.counter(data.opt("generation"), -1));
        assertEquals(1794470000123L, ArrowsFeedbackPlugin.counter(data.opt("issuedAt"), -1));
        assertEquals(0, ArrowsFeedbackPlugin.counter(0, -1));
        assertEquals(2, ArrowsFeedbackPlugin.counter(2d, -1));
    }
    @Test public void malformedOrUnsafeCountersCannotBypassCancellation() {
        Object[] invalid = {null, "1", -1, 1.5, Double.NaN, Double.POSITIVE_INFINITY, 9007199254740992d};
        for (Object value : invalid) assertEquals(-1, ArrowsFeedbackPlugin.counter(value, -1));
    }
}
