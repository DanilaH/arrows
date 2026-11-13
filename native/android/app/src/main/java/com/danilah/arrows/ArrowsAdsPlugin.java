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

/** All SDK transitions belong to the main thread; only an explicit saved intent owns a show. */
@CapacitorPlugin(name = "ArrowsAds")
public class ArrowsAdsPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean ready, destroyed, background, preparing, rewardDemand, initializationFailed;
    private int preloadGeneration;
    private long retryAt, rewardLoadStarted;
    private final RewardedCacheState rewardCache = new RewardedCacheState();
    private Runnable rewardLoadTimeout;
    private InterstitialAdLoader interLoader;
    private RewardedAdLoader rewardLoader;
    private InterstitialAd interstitial;
    private RewardedAd rewarded;
    private RewardJournal journal;
    private Session session;
    private static final class Session {
        final PluginCall call;
        final String kind, placement, attempt, mode, id;
        final int intentVersion;
        RewardedAd rewardAd;
        boolean invoked, shown, earned, impression;
        Session(PluginCall call, String kind, String placement, String attempt, String mode, String id, int intentVersion) {
            this.call=call;this.kind=kind;this.placement=placement;this.attempt=attempt;this.mode=mode;
            this.id=id.isEmpty()?UUID.randomUUID().toString():id;this.intentVersion=intentVersion;
        }
    }
    @Override public void load() {
        journal=new RewardJournal(getContext());
        if(BuildConfig.AD_MODE.equals("disabled"))return;
        handler.post(()->{
            try {
                YandexAds.setLocationTracking(false);
                // Test APK must not feed automatic SDK analytics either. SDK8.6.0 API verified.
                if(BuildConfig.ANALYTICS_API_KEY.isEmpty())YandexAds.setAppAdAnalyticsReporting(false);
                YandexAds.initialize(getContext(),()->handler.post(()->{
                    if(destroyed)return;
                    interLoader=new InterstitialAdLoader(getContext());rewardLoader=new RewardedAdLoader(getContext());ready=true;
                    event("rewarded","initialized");if(rewardDemand&&!background)loadRewarded();
                }));
            }catch(RuntimeException error){initializationFailed=true;event("rewarded","init_error");}
        });
    }
    private String unit(String kind){return kind.equals("rewarded")?BuildConfig.REWARDED_AD_UNIT_ID:BuildConfig.INTERSTITIAL_AD_UNIT_ID;}
    private boolean available(String kind){return ready&&!destroyed&&!unit(kind).isEmpty();}
    private JSObject readiness(){
        long now=SystemClock.elapsedRealtime();JSObject value=new JSObject();boolean configured=!BuildConfig.AD_MODE.equals("disabled")&&!unit("rewarded").isEmpty();
        String phase=!configured?"disabled":initializationFailed||destroyed?"unavailable":!ready?"initializing":rewardCache.phase(now);
        if(session!=null&&session.kind.equals("rewarded")&&session.invoked)phase="showing";
        value.put("configured",configured);value.put("phase",phase);value.put("ready",phase.equals("ready")&&rewarded!=null);
        value.put("preloadId","reward-load-"+rewardCache.generation());value.put("loadedAt",rewardCache.loadedAt);
        value.put("expiresInMs",Math.max(0,rewardCache.expiresAt-now));value.put("retryInMs",Math.max(0,rewardCache.retryAt-now));
        value.put("playtest",BuildConfig.APPLICATION_ID.endsWith(".playtest")&&BuildConfig.AD_MODE.equals("test"));return value;
    }
    private void event(String kind,String phase){
        if(destroyed)return;JSObject e=new JSObject();e.put("kind",kind);e.put("phase",phase);
        if(kind.equals("rewarded")){e.put("readiness",readiness());e.put("preloadId","reward-load-"+rewardCache.generation());e.put("elapsedMs",Math.max(0,SystemClock.elapsedRealtime()-rewardLoadStarted));}
        notifyListeners("adEvent",e);
    }
    private void event(Session s,String phase){event(s,phase,null);}
    private void event(Session s,String phase,@Nullable JSONObject value){
        if(destroyed)return;JSObject e=new JSObject();e.put("kind",s.kind);e.put("phase",phase);e.put("requestId",s.id);
        e.put("placement",s.placement);e.put("attempt",s.attempt);e.put("mode",s.mode);
        if(value!=null)e.put("value",value);e.put("readiness",readiness());notifyListeners("adEvent",e);
    }
    @PluginMethod public void status(PluginCall call){handler.post(()->{
        expireRewarded();JSObject result=new JSObject();result.put("ready",ready);result.put("mode",BuildConfig.AD_MODE);
        result.put("active",session==null?"idle":session.shown?"shown":session.invoked?"invoked":"loading");
        result.put("rewarded",available("rewarded"));result.put("interstitial",available("interstitial"));result.put("rewardedState",readiness());call.resolve(result);
    });}
    @PluginMethod public void prepareRewarded(PluginCall call){handler.post(()->{
        rewardDemand=call.getBoolean("active",true);
        if(rewardDemand&&!background&&session==null)loadRewarded();
        else if(!rewardDemand&&rewardCache.phase(SystemClock.elapsedRealtime()).equals("loading")&&session==null)cancelRewardLoad();
        call.resolve(readiness());
    });}
    private void expireRewarded(){
        if(!rewardCache.phase(SystemClock.elapsedRealtime()).equals("ready")&&rewarded!=null){rewarded.setAdEventListener(null);rewarded=null;event("rewarded","preload_expired");}
    }
    private void cancelRewardLoad(){
        rewardCache.invalidate();if(rewardLoadTimeout!=null)handler.removeCallbacks(rewardLoadTimeout);rewardLoadTimeout=null;
        if(rewardLoader!=null)rewardLoader.cancelLoading();
    }
    private void loadRewarded(){
        if(!available("rewarded")||background||session!=null&&session.invoked)return;
        expireRewarded();final int token=rewardCache.begin(SystemClock.elapsedRealtime());if(token<0)return;
        rewardLoadStarted=SystemClock.elapsedRealtime();event("rewarded","preload_start");
        rewardLoadTimeout=()->{
            if(!rewardCache.failed(token,SystemClock.elapsedRealtime()))return;
            rewardLoader.cancelLoading();event("rewarded","load_timeout");
            if(session!=null&&session.kind.equals("rewarded")&&!session.invoked)finish(session,"unavailable");
        };
        handler.postDelayed(rewardLoadTimeout,15000);
        try{rewardLoader.loadAd(new AdRequest.Builder(unit("rewarded")).build(),new RewardedAdLoadListener(){
            public void onAdLoaded(@NonNull RewardedAd ad){
                if(destroyed||background||!rewardCache.loaded(token,SystemClock.elapsedRealtime())){ad.setAdEventListener(null);return;}
                if(rewardLoadTimeout!=null)handler.removeCallbacks(rewardLoadTimeout);rewardLoadTimeout=null;
                rewarded=ad;event("rewarded","preload_ready");
                if(session!=null&&session.kind.equals("rewarded")&&!session.invoked)displayRewarded(session);
            }
            public void onAdFailedToLoad(@NonNull AdRequestError error){
                if(!rewardCache.failed(token,SystemClock.elapsedRealtime()))return;
                if(rewardLoadTimeout!=null)handler.removeCallbacks(rewardLoadTimeout);rewardLoadTimeout=null;
                event("rewarded","load_error");if(session!=null&&session.kind.equals("rewarded")&&!session.invoked)finish(session,"error");
            }
        });}catch(RuntimeException error){if(rewardLoadTimeout!=null)rewardLoadTimeout.run();}
    }
    @PluginMethod public void prepareInterstitial(PluginCall call){handler.post(()->{
        call.resolve();if(!available("interstitial")||preparing||interstitial!=null||session!=null||background||SystemClock.elapsedRealtime()<retryAt)return;
        final int generation=++preloadGeneration;preparing=true;event("interstitial","request");
        Runnable timeout=()->{if(!preparing||generation!=preloadGeneration)return;preparing=false;preloadGeneration++;retryAt=SystemClock.elapsedRealtime()+30000;interLoader.cancelLoading();event("interstitial","load_timeout");};
        handler.postDelayed(timeout,15000);
        try{interLoader.loadAd(new AdRequest.Builder(unit("interstitial")).build(),new InterstitialAdLoadListener(){
            public void onAdLoaded(@NonNull InterstitialAd ad){if(destroyed||generation!=preloadGeneration){ad.setAdEventListener(null);return;}handler.removeCallbacks(timeout);preparing=false;interstitial=ad;event("interstitial","loaded");}
            public void onAdFailedToLoad(@NonNull AdRequestError error){if(destroyed||generation!=preloadGeneration)return;handler.removeCallbacks(timeout);preparing=false;retryAt=SystemClock.elapsedRealtime()+30000;event("interstitial","load_error");}
        });}catch(RuntimeException error){timeout.run();}
    });}
    @PluginMethod public void show(PluginCall call){handler.post(()->{
        String kind=call.getString("kind",""),placement=call.getString("placement",""),attempt=call.getString("attempt",""),mode=call.getString("mode",""),id=call.getString("requestId","");
        Object intent=call.getData().opt("intentVersion");int intentVersion=intent==null?0:intent instanceof Number&&((Number)intent).doubleValue()==1?1:-1;
        if(intentVersion<0||intentVersion==1&&id.isEmpty()||!id.isEmpty()&&!id.matches("[a-zA-Z0-9_-]{1,100}")||
            (!kind.equals("rewarded")&&!kind.equals("interstitial"))||!attempt.matches("[a-zA-Z0-9_-]{1,100}")||(!mode.equals("campaign")&&!mode.equals("daily"))||
            (kind.equals("rewarded")?!placement.equals("hint")&&!placement.equals("lives"):!placement.equals("continue"))){call.reject("Invalid ad request");return;}
        expireRewarded();
        if(!available(kind)||session!=null||background||!getActivity().hasWindowFocus()||kind.equals("rewarded")&&rewardCache.phase(SystemClock.elapsedRealtime()).equals("backoff")){resolve(call,false,"unavailable");return;}
        try{if(journal.pending().length()>0){resolve(call,false,"unavailable");return;}}catch(Exception error){resolve(call,false,"unavailable");return;}
        Session s=new Session(call,kind,placement,attempt,mode,id,intentVersion);session=s;
        try{
            if(kind.equals("interstitial")){
                if(interstitial==null){finish(s,"unavailable");return;}
                interstitial.setAdEventListener(new InterstitialAdEventListener(){
                    public void onAdShown(){shown(s);}public void onAdFailedToShow(@NonNull AdError error){if(session==s){event(s,"show_error");finish(s,"error");}}
                    public void onAdDismissed(){if(session==s){event(s,"dismiss");finish(s,"dismissed");}}public void onAdClicked(){}
                    public void onAdImpression(@Nullable ImpressionData data){impression(s,data);}
                });s.invoked=true;event(s,"invoke");interstitial.show(getActivity());
            }else{event(s,"request");if(rewarded!=null)displayRewarded(s);else loadRewarded();}
        }catch(RuntimeException error){event(s,"show_error");finish(s,"error");}
    });}
    private void shown(Session s){if(session==s){s.shown=true;event(s,"show");}}
    private void impression(Session s,@Nullable ImpressionData data){
        if(!s.invoked||s.impression)return;s.impression=true;
        try{event(s,"impression",ImpressionValue.parse(data==null?null:data.getRawData()));}catch(Exception ignored){event(s,"impression");}
    }
    private void displayRewarded(Session s){
        if(session!=s||background||!getActivity().hasWindowFocus()){if(session==s)finish(s,"cancelled");return;}
        if(rewarded==null||!rewardCache.take(SystemClock.elapsedRealtime())){finish(s,"unavailable");return;}
        s.rewardAd=rewarded;rewarded=null;
        s.rewardAd.setAdEventListener(new RewardedAdEventListener(){
            public void onAdShown(){shown(s);}public void onAdFailedToShow(@NonNull AdError error){if(session==s){rewardCache.showFailed(SystemClock.elapsedRealtime());event(s,"show_error");finish(s,"error");}}
            public void onAdDismissed(){if(session==s){event(s,"dismiss");finish(s,"dismissed");}}public void onAdClicked(){}
            public void onAdImpression(@Nullable ImpressionData data){impression(s,data);}
            public void onRewarded(@NonNull Reward reward){
                if(!s.invoked||s.earned)return;s.earned=true;
                try{JSONObject receipt=new JSONObject().put("schema",s.intentVersion==1?2:1).put("id",s.id).put("placement",s.placement).put("attempt",s.attempt).put("mode",s.mode);
                    if(s.intentVersion==1)receipt.put("intentVersion",1).put("requestId",s.id);
                    journal.record(receipt);event(s,"earned");
                }catch(Exception error){event(s,"receipt_pending");}
            }
        });
        s.invoked=true;event(s,"invoke");try{s.rewardAd.show(getActivity());}catch(RuntimeException error){rewardCache.showFailed(SystemClock.elapsedRealtime());event(s,"show_error");finish(s,"error");}
    }
    @PluginMethod public void pending(PluginCall call){handler.post(()->{try{JSObject result=new JSObject();result.put("receipts",journal.pending());call.resolve(result);}catch(Exception error){call.reject("Earned receipt storage unavailable");}});}
    @PluginMethod public void acknowledge(PluginCall call){handler.post(()->{try{journal.acknowledge(call.getString("id",""));call.resolve();}catch(Exception error){call.reject("Earned receipt acknowledgement failed");}});}
    @PluginMethod public void cancelPending(PluginCall call){handler.post(()->{String id=call.getString("requestId","");if(session!=null&&!session.invoked&&(id.isEmpty()||id.equals(session.id)))finish(session,"cancelled");call.resolve();});}
    private void resolve(PluginCall call,boolean shown,String outcome){JSObject r=new JSObject();r.put("shown",shown);r.put("outcome",outcome);call.resolve(r);}
    private void finish(Session s,String outcome){
        if(session!=s)return;session=null;
        if(outcome.equals("cancelled")||outcome.equals("unavailable"))event(s,outcome);
        if(s.rewardAd!=null){s.rewardAd.setAdEventListener(null);s.rewardAd=null;}
        if(!s.invoked&&s.kind.equals("rewarded")&&rewardCache.phase(SystemClock.elapsedRealtime()).equals("loading"))cancelRewardLoad();
        if(interstitial!=null&&s.kind.equals("interstitial")){interstitial.setAdEventListener(null);interstitial=null;}
        JSObject r=new JSObject();r.put("shown",s.shown);r.put("outcome",outcome);r.put("earned",s.earned);r.put("requestId",s.id);s.call.resolve(r);
    }
    @Override protected void handleOnPause(){background=true;rewardDemand=false;if(session!=null&&!session.invoked)finish(session,"cancelled");if(rewardCache.phase(SystemClock.elapsedRealtime()).equals("loading"))cancelRewardLoad();}
    @Override protected void handleOnResume(){background=false;}
    @Override protected void handleOnDestroy(){
        destroyed=true;preloadGeneration++;rewardCache.invalidate();handler.removeCallbacksAndMessages(null);
        if(session!=null)finish(session,"cancelled");if(interLoader!=null)interLoader.cancelLoading();if(rewardLoader!=null)rewardLoader.cancelLoading();
        if(interstitial!=null)interstitial.setAdEventListener(null);if(rewarded!=null)rewarded.setAdEventListener(null);
        interstitial=null;rewarded=null;interLoader=null;rewardLoader=null;
    }
}
