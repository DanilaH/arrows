package com.danilah.arrows;

import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.yandex.mobile.ads.common.*;
import com.yandex.mobile.ads.interstitial.*;
import com.yandex.mobile.ads.rewarded.*;
import org.json.JSONObject;
import java.util.UUID;

/** Adapted from Road Lines 180d5b1. All SDK operations and session transitions belong to the main thread. */
@CapacitorPlugin(name = "ArrowsAds")
public class ArrowsAdsPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean ready, destroyed, background, preparing;
    private int preloadGeneration;
    private long retryAt, rewardRetryAt;
    private InterstitialAdLoader interLoader;
    private RewardedAdLoader rewardLoader;
    private InterstitialAd interstitial;
    private RewardedAd rewarded;
    private RewardJournal journal;
    private Session session;
    private static final class Session {
        final PluginCall call;
        final String kind, placement, attempt, mode;
        final String id;
        Runnable timeout;
        boolean invoked, shown, earned;
        Session(PluginCall call, String kind, String placement, String attempt, String mode, String requestId) {
            this.call = call; this.kind = kind; this.placement = placement; this.attempt = attempt; this.mode = mode; this.id = requestId.isEmpty() ? UUID.randomUUID().toString() : requestId;
        }
    }
    @Override public void load() {
        journal = new RewardJournal(getContext());
        if (BuildConfig.AD_MODE.equals("disabled")) return;
        handler.post(() -> {
            try {
                YandexAds.setLocationTracking(false);
                YandexAds.initialize(getContext(), () -> handler.post(() -> {
                    if (destroyed) return;
                    interLoader = new InterstitialAdLoader(getContext());
                    rewardLoader = new RewardedAdLoader(getContext()); ready = true;
                }));
            } catch (RuntimeException ignored) { event("interstitial", "init_error"); }
        });
    }
    private String unit(String kind) {
        return kind.equals("rewarded") ? BuildConfig.REWARDED_AD_UNIT_ID : BuildConfig.INTERSTITIAL_AD_UNIT_ID;
    }
    private boolean available(String kind) { return ready && !destroyed && !unit(kind).isEmpty(); }
    private void event(String kind, String phase) {
        if (destroyed) return;
        JSObject e = new JSObject(); e.put("kind", kind); e.put("phase", phase); notifyListeners("adEvent", e);
    }
    private void event(Session s, String phase) {
        if (destroyed) return;
        JSObject e = new JSObject(); e.put("kind", s.kind); e.put("phase", phase); e.put("requestId", s.id);
        e.put("placement", s.placement); e.put("attempt", s.attempt); e.put("mode", s.mode); notifyListeners("adEvent", e);
    }
    @PluginMethod public void status(PluginCall call) { handler.post(() -> {
        JSObject result = new JSObject(); result.put("ready", ready); result.put("mode", BuildConfig.AD_MODE);
        result.put("active", session == null ? "idle" : session.shown ? "shown" : session.invoked ? "invoked" : "loading");
        result.put("rewarded", available("rewarded")); result.put("interstitial", available("interstitial")); call.resolve(result);
    }); }
    @PluginMethod public void prepareInterstitial(PluginCall call) { handler.post(() -> {
        call.resolve();
        if (!available("interstitial") || preparing || interstitial != null || session != null || background || SystemClock.elapsedRealtime() < retryAt) return;
        final int generation = ++preloadGeneration;
        preparing = true; event("interstitial", "request");
        Runnable timeout = () -> {
            if (!preparing || generation != preloadGeneration) return;
            preparing = false; preloadGeneration++; retryAt = SystemClock.elapsedRealtime() + 30000;
            interLoader.cancelLoading(); event("interstitial", "load_timeout");
        };
        handler.postDelayed(timeout, 15000);
        try {
            interLoader.loadAd(new AdRequest.Builder(unit("interstitial")).build(), new InterstitialAdLoadListener() {
                public void onAdLoaded(@NonNull InterstitialAd ad) {
                    if (destroyed || generation != preloadGeneration) { ad.setAdEventListener(null); return; }
                    handler.removeCallbacks(timeout); preparing = false; interstitial = ad; event("interstitial", "loaded");
                }
                public void onAdFailedToLoad(@NonNull AdRequestError error) {
                    if (destroyed || generation != preloadGeneration) return;
                    handler.removeCallbacks(timeout); preparing = false; retryAt = SystemClock.elapsedRealtime() + 30000;
                    event("interstitial", "load_error");
                }
            });
        } catch (RuntimeException error) { timeout.run(); }
    }); }
    @PluginMethod public void show(PluginCall call) { handler.post(() -> {
        String kind = call.getString("kind", ""), placement = call.getString("placement", "");
        String attempt = call.getString("attempt", ""), mode = call.getString("mode", ""), requestId = call.getString("requestId", "");
        if ((!requestId.isEmpty() && !requestId.matches("[a-zA-Z0-9_-]{1,100}")) || (!kind.equals("interstitial") && !kind.equals("rewarded")) ||
            !attempt.matches("[a-zA-Z0-9_-]{1,100}") || (!mode.equals("campaign") && !mode.equals("daily")) ||
            (kind.equals("rewarded") ? !placement.equals("hint") && !placement.equals("lives") : !placement.equals("continue"))) {
            call.reject("Invalid ad request"); return;
        }
        if (!available(kind) || session != null || background || !getActivity().hasWindowFocus() || kind.equals("rewarded") && SystemClock.elapsedRealtime() < rewardRetryAt) { resolve(call, false, "unavailable"); return; }
        try { if (journal.pending().length() > 0) { resolve(call, false, "unavailable"); return; } }
        catch (Exception error) { resolve(call, false, "unavailable"); return; }
        Session s = new Session(call, kind, placement, attempt, mode, requestId); session = s;
        try {
            if (kind.equals("interstitial")) {
                if (interstitial == null) { finish(s, "unavailable"); return; }
                interstitial.setAdEventListener(new InterstitialAdEventListener() {
                    public void onAdShown() { shown(s); }
                    public void onAdFailedToShow(@NonNull AdError error) { if (session == s) { event(s, "show_error"); finish(s, "error"); } }
                    public void onAdDismissed() { if (session == s) { event(s, "dismiss"); finish(s, "dismissed"); } }
                    public void onAdClicked() {}
                    public void onAdImpression(@Nullable ImpressionData data) { if (session == s) event(s, "impression"); }
                });
                s.invoked = true; event(s, "invoke"); interstitial.show(getActivity());
            } else {
                event(s, "request");
                s.timeout = () -> { if (session == s && !s.invoked) { rewardRetryAt = SystemClock.elapsedRealtime() + 30000; event(s, "load_timeout"); finish(s, "unavailable"); } };
                handler.postDelayed(s.timeout, 15000);
                rewardLoader.loadAd(new AdRequest.Builder(unit(kind)).build(), new RewardedAdLoadListener() {
                    public void onAdLoaded(@NonNull RewardedAd ad) {
                        if (session != s || destroyed) { ad.setAdEventListener(null); return; }
                        if (background || !getActivity().hasWindowFocus()) { ad.setAdEventListener(null); finish(s, "cancelled"); return; }
                        rewarded = ad; event(s, "loaded"); displayRewarded(s);
                    }
                    public void onAdFailedToLoad(@NonNull AdRequestError error) {
                        if (session == s) { rewardRetryAt = SystemClock.elapsedRealtime() + 30000; event(s, "load_error"); finish(s, "error"); }
                    }
                });
            }
        } catch (RuntimeException error) { event(s, "show_error"); finish(s, "error"); }
    }); }
    private void shown(Session s) { if (session == s) { s.shown = true; event(s, "show"); } }
    private void displayRewarded(Session s) {
        rewarded.setAdEventListener(new RewardedAdEventListener() {
            public void onAdShown() { shown(s); }
            public void onAdFailedToShow(@NonNull AdError error) { if (session == s) { event(s, "show_error"); finish(s, "error"); } }
            public void onAdDismissed() { if (session == s) { event(s, "dismiss"); finish(s, "dismissed"); } }
            public void onAdClicked() {}
            public void onAdImpression(@Nullable ImpressionData data) { if (session == s) event(s, "impression"); }
            public void onRewarded(@NonNull Reward reward) {
                if (!s.invoked || s.earned) return;
                s.earned = true;
                try {
                    JSONObject receipt = new JSONObject(); receipt.put("schema", 1); receipt.put("id", s.id);
                    receipt.put("placement", s.placement); receipt.put("attempt", s.attempt); receipt.put("mode", s.mode);
                    journal.record(receipt); event(s, "earned");
                } catch (Exception error) { event(s, "receipt_pending"); }
            }
        });
        s.invoked = true; if (s.timeout != null) handler.removeCallbacks(s.timeout); event(s, "invoke");
        try { rewarded.show(getActivity()); }
        catch (RuntimeException error) { event(s, "show_error"); finish(s, "error"); }
    }
    @PluginMethod public void pending(PluginCall call) { handler.post(() -> {
        try {
            JSObject result = new JSObject(); result.put("receipts", journal.pending()); call.resolve(result);
        } catch (Exception error) { call.reject("Earned receipt storage unavailable"); }
    }); }
    @PluginMethod public void acknowledge(PluginCall call) { handler.post(() -> {
        try { journal.acknowledge(call.getString("id", "")); call.resolve(); }
        catch (Exception error) { call.reject("Earned receipt acknowledgement failed"); }
    }); }
    @PluginMethod public void cancelPending(PluginCall call) { handler.post(() -> {
        // Never guess that a displayed SDK screen has closed.
        String requestId = call.getString("requestId", "");
        if (session != null && !session.invoked && (requestId.isEmpty() || session.id.equals(requestId))) finish(session, "cancelled");
        call.resolve();
    }); }
    private void resolve(PluginCall call, boolean shown, String outcome) {
        JSObject result = new JSObject(); result.put("shown", shown); result.put("outcome", outcome); call.resolve(result);
    }
    private void finish(Session s, String outcome) {
        if (session != s) return;
        session = null; if (s.timeout != null) handler.removeCallbacks(s.timeout);
        if (outcome.equals("cancelled") || outcome.equals("unavailable")) event(s, outcome);
        if (rewarded != null) { rewarded.setAdEventListener(null); rewarded = null; }
        if (rewardLoader != null && !s.invoked && s.kind.equals("rewarded")) rewardLoader.cancelLoading();
        if (interstitial != null && s.kind.equals("interstitial")) { interstitial.setAdEventListener(null); interstitial = null; }
        JSObject result = new JSObject(); result.put("shown", s.shown); result.put("outcome", outcome); result.put("earned", s.earned); result.put("requestId", s.id); s.call.resolve(result);
    }
    @Override protected void handleOnPause() { background = true; if (session != null && !session.invoked) finish(session, "cancelled"); }
    @Override protected void handleOnResume() { background = false; }
    @Override protected void handleOnDestroy() {
        destroyed = true; preloadGeneration++; handler.removeCallbacksAndMessages(null);
        if (session != null) finish(session, "cancelled");
        if (interLoader != null) interLoader.cancelLoading();
        if (rewardLoader != null) rewardLoader.cancelLoading();
        if (interstitial != null) interstitial.setAdEventListener(null);
        interstitial = null; interLoader = null; rewardLoader = null;
    }
}
