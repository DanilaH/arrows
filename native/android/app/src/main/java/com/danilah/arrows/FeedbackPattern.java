package com.danilah.arrows;

/** Pure bounded cue profiles; the bridge owns freshness, foreground and cancellation. */
final class FeedbackPattern {
    final long[] timings;
    final int[] amplitudes;
    private FeedbackPattern(long[] timings, int[] amplitudes) { this.timings = timings; this.amplitudes = amplitudes; }
    static FeedbackPattern forCue(String cue) {
        if (cue == null) return null;
        switch (cue) {
            case "button": return new FeedbackPattern(new long[]{0, 12}, new int[]{0, 140});
            case "remove": return new FeedbackPattern(new long[]{0, 20}, new int[]{0, 190});
            case "combo": return new FeedbackPattern(new long[]{0, 12, 18, 18}, new int[]{0, 180, 0, 225});
            case "error": return new FeedbackPattern(new long[]{0, 28, 26, 18}, new int[]{0, 245, 0, 185});
            case "hint": return new FeedbackPattern(new long[]{0, 12, 24, 18}, new int[]{0, 145, 0, 190});
            case "life": return new FeedbackPattern(new long[]{0, 18, 30, 28}, new int[]{0, 160, 0, 225});
            case "win": return new FeedbackPattern(new long[]{0, 20, 40, 26, 50, 40}, new int[]{0, 165, 0, 210, 0, 245});
            default: return null;
        }
    }
}
