package com.danilah.arrows;

/** Pure bounded cue profiles; the bridge owns freshness, foreground and cancellation. */
final class FeedbackPattern {
    final long[] timings;
    final int[] amplitudes;
    private FeedbackPattern(long[] timings, int[] amplitudes) { this.timings = timings; this.amplitudes = amplitudes; }
    static FeedbackPattern forCue(String cue) {
        if (cue == null) return null;
        switch (cue) {
            case "button": return new FeedbackPattern(new long[]{0, 8}, new int[]{0, 90});
            case "remove": return new FeedbackPattern(new long[]{0, 12}, new int[]{0, 140});
            case "combo": return new FeedbackPattern(new long[]{0, 9, 22, 13}, new int[]{0, 150, 0, 195});
            case "error": return new FeedbackPattern(new long[]{0, 24, 32, 15}, new int[]{0, 230, 0, 160});
            case "hint": return new FeedbackPattern(new long[]{0, 9, 28, 14}, new int[]{0, 115, 0, 175});
            case "life": return new FeedbackPattern(new long[]{0, 14, 36, 25}, new int[]{0, 135, 0, 210});
            case "win": return new FeedbackPattern(new long[]{0, 16, 45, 22, 60, 38}, new int[]{0, 145, 0, 195, 0, 240});
            default: return null;
        }
    }
}
