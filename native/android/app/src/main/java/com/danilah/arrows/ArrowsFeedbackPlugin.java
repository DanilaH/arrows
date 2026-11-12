package com.danilah.arrows;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Road Lines native capability/freshness recipe, with Arrows cues and a cancellation generation. */
@CapacitorPlugin(name = "ArrowsFeedback")
public class ArrowsFeedbackPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean foreground = true;
    private long generation, lastPulse = -1000, stoppedAt;
    /** JSON counters arrive as Integer; Capacitor getLong only accepts Long. */
    static long counter(Object value, long fallback) {
        if (!(value instanceof Number)) return fallback;
        double number = ((Number)value).doubleValue();
        return Double.isFinite(number) && number >= 0 && number <= 9007199254740991d && number == Math.rint(number)
            ? ((Number)value).longValue() : fallback;
    }
    private Vibrator vibrator() {
        if (Build.VERSION.SDK_INT >= 31) {
            VibratorManager manager = (VibratorManager)getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return manager == null ? null : manager.getDefaultVibrator();
        }
        return (Vibrator)getContext().getSystemService(Context.VIBRATOR_SERVICE);
    }
    @PluginMethod public void pulse(PluginCall call) { handler.post(() -> {
        String cue = call.getString("cue", "");
        long issued = counter(call.getData().opt("issuedAt"), 0L), epoch = counter(call.getData().opt("generation"), -1L), now = SystemClock.uptimeMillis();
        if (epoch < generation || issued <= stoppedAt || Math.abs(System.currentTimeMillis() - issued) > 250 || !foreground || now - lastPulse < 60) { call.resolve(); return; }
        FeedbackPattern pattern = FeedbackPattern.forCue(cue);
        if (pattern == null) { call.reject("Invalid haptic cue"); return; }
        generation = epoch;
        try {
            Vibrator v = vibrator();
            if (v != null && v.hasVibrator()) {
                lastPulse = now;
                AudioAttributes attributes = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
                if (Build.VERSION.SDK_INT >= 26) {
                    VibrationEffect effect = v.hasAmplitudeControl()
                        ? VibrationEffect.createWaveform(pattern.timings, pattern.amplitudes, -1)
                        : VibrationEffect.createWaveform(pattern.timings, -1);
                    v.vibrate(effect, attributes);
                } else v.vibrate(pattern.timings, -1, attributes);
            }
            call.resolve();
        } catch (RuntimeException error) { call.reject("Haptics unavailable"); }
    }); }
    @PluginMethod public void cancel(PluginCall call) { handler.post(() -> {
        long epoch = counter(call.getData().opt("generation"), generation);
        if (epoch >= generation) {
            generation = epoch;
            // JS generations invalidate earlier requests. A wall-clock cutoff here would
            // also reject a fresh UI pulse issued immediately after this cancellation.
            Vibrator v = vibrator(); if (v != null) v.cancel();
        }
        call.resolve();
    }); }
    private void stop() { stoppedAt = System.currentTimeMillis(); Vibrator v = vibrator(); if (v != null) v.cancel(); }
    @Override protected void handleOnPause() { foreground = false; stop(); }
    @Override protected void handleOnResume() { foreground = true; }
    @Override protected void handleOnDestroy() { foreground = false; stop(); handler.removeCallbacksAndMessages(null); }
}
