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
    private Vibrator vibrator() {
        if (Build.VERSION.SDK_INT >= 31) {
            VibratorManager manager = (VibratorManager)getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return manager == null ? null : manager.getDefaultVibrator();
        }
        return (Vibrator)getContext().getSystemService(Context.VIBRATOR_SERVICE);
    }
    @PluginMethod public void pulse(PluginCall call) { handler.post(() -> {
        String cue = call.getString("cue", "");
        long issued = call.getLong("issuedAt", 0L), epoch = call.getLong("generation", -1L), now = SystemClock.uptimeMillis();
        if (epoch < generation || issued <= stoppedAt || Math.abs(System.currentTimeMillis() - issued) > 250 || !foreground || now - lastPulse < 60) { call.resolve(); return; }
        if (!cue.matches("button|remove|error|hint|life|win")) { call.reject("Invalid haptic cue"); return; }
        generation = epoch;
        try {
            Vibrator v = vibrator();
            if (v != null && v.hasVibrator()) {
                lastPulse = now;
                AudioAttributes attributes = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
                long duration = cue.equals("win") ? 45 : cue.equals("error") ? 25 : 12;
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(duration,
                    v.hasAmplitudeControl() ? cue.equals("button") ? 100 : 180 : VibrationEffect.DEFAULT_AMPLITUDE), attributes);
                else v.vibrate(duration, attributes);
            }
            call.resolve();
        } catch (RuntimeException error) { call.reject("Haptics unavailable"); }
    }); }
    @PluginMethod public void cancel(PluginCall call) { handler.post(() -> {
        generation = Math.max(generation, call.getLong("generation", generation)); stop(); call.resolve();
    }); }
    private void stop() { stoppedAt = System.currentTimeMillis(); Vibrator v = vibrator(); if (v != null) v.cancel(); }
    @Override protected void handleOnPause() { foreground = false; stop(); }
    @Override protected void handleOnResume() { foreground = true; }
    @Override protected void handleOnDestroy() { foreground = false; stop(); handler.removeCallbacksAndMessages(null); }
}
