package com.danilah.arrows;

import android.os.*;
import android.view.*;
import android.widget.FrameLayout;
import androidx.annotation.*;
import androidx.core.graphics.Insets;
import androidx.core.view.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.yandex.mobile.ads.banner.*;
import com.yandex.mobile.ads.common.*;
import org.json.*;
import java.util.UUID;

/** One SDK banner on the main thread. JS owns kit geometry, native revalidates current pixels. */
@CapacitorPlugin(name="ArrowsBanner")
public class ArrowsBannerPlugin extends Plugin {
    private static ArrowsBannerPlugin instance;
    private static boolean sdkReady,fullscreen;
    static void sdkReady(){sdkReady=true;if(instance!=null)instance.render();}
    static void fullscreen(boolean value){fullscreen=value;if(instance!=null)instance.render();}
    private final Handler handler=new Handler(Looper.getMainLooper());
    private FrameLayout host;
    private BannerAdView banner;
    private BannerAdSize size;
    private int width,height,generation;
    private long revision=-1,retryAt;
    private boolean alive,foreground=true,desired,loaded,displayed;
    private String proof="",token="",placedToken="",requestId="";
    private JSONObject measured,placement;
    private Runnable timeout,retry;
    private ViewTreeObserver.OnGlobalLayoutListener layoutListener;
    private ViewTreeObserver.OnWindowFocusChangeListener focusListener;
    private boolean configured(){return !BuildConfig.AD_MODE.equals("disabled")&&!BuildConfig.BANNER_AD_UNIT_ID.isEmpty();}
    @Override public void load(){handler.post(()->{
        alive=true;instance=this;
        host=new FrameLayout(getActivity());host.setClickable(false);host.setClipChildren(false);
        ((FrameLayout)getActivity().findViewById(android.R.id.content)).addView(host,new FrameLayout.LayoutParams(-1,-1));
        layoutListener=this::changed;focusListener=focused->{if(!focused)hide();else{changed();event("geometry");}};
        host.getViewTreeObserver().addOnGlobalLayoutListener(layoutListener);host.getViewTreeObserver().addOnWindowFocusChangeListener(focusListener);
        ViewCompat.setOnApplyWindowInsetsListener(host,(view,insets)->{changed();return insets;});ViewCompat.requestApplyInsets(host);
    });}
    private JSONObject capture()throws JSONException{
        View web=getBridge().getWebView(),decor=getActivity().getWindow().getDecorView();
        int[] h=new int[2],w=new int[2],d=new int[2];host.getLocationOnScreen(h);web.getLocationOnScreen(w);decor.getLocationOnScreen(d);
        WindowInsetsCompat wi=ViewCompat.getRootWindowInsets(decor);if(wi==null)throw new IllegalStateException("Insets not ready");Insets in=wi.getInsets(WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.displayCutout());
        JSONObject safe=new JSONObject().put("left",Math.max(0,d[0]+in.left-h[0])).put("top",Math.max(0,d[1]+in.top-h[1]))
            .put("right",Math.max(0,h[0]+host.getWidth()-(d[0]+decor.getWidth()-in.right))).put("bottom",Math.max(0,h[1]+host.getHeight()-(d[1]+decor.getHeight()-in.bottom)));
        return new JSONObject().put("webView",new JSONObject().put("x",w[0]-h[0]).put("y",w[1]-h[1]).put("width",web.getWidth()).put("height",web.getHeight()))
            .put("root",new JSONObject().put("width",host.getWidth()).put("height",host.getHeight())).put("safeInsets",safe).put("parentPadding",new JSONObject().put("left",0).put("top",0));
    }
    private boolean keyboard(){WindowInsetsCompat i=ViewCompat.getRootWindowInsets(host);return i!=null&&i.isVisible(WindowInsetsCompat.Type.ime());}
    private void changed(){if(!alive||host==null)return;try{String next=capture().toString();if(!next.equals(proof)){proof=next;token="";hide();notifyListeners("bannerEvent",new JSObject().put("phase","geometry"));}}catch(Exception e){hide();}}
    @PluginMethod public void measure(PluginCall call){handler.post(()->{try{
        if(!alive||host==null)throw new IllegalStateException();
        long rev=call.getLong("revision",-1L);if(rev<revision){call.reject("Stale banner geometry");return;}revision=rev;
        JSONObject vp=call.getObject("viewport"),slot=call.getObject("slot"),g=capture(),web=g.getJSONObject("webView");
        double vw=vp.getDouble("width"),vh=vp.getDouble("height"),x=slot.getDouble("x"),sw=slot.getDouble("width");
        if(!Double.isFinite(vw)||!Double.isFinite(vh)||!Double.isFinite(x)||!Double.isFinite(sw)||vw<=0||vh<=0||sw<=0||x<0||x+sw>vw+.01||web.getInt("width")<=0)throw new IllegalArgumentException();
        double scale=web.getDouble("width")/vw;int mapped=(int)Math.floor(web.getDouble("x")+(x+sw)*scale)-(int)Math.ceil(web.getDouble("x")+x*scale);
        if(mapped<=0)throw new IllegalArgumentException();
        if(mapped!=width){width=mapped;destroyBanner();size=BannerAdSize.inline(getActivity(),Math.max(1,(int)Math.floor(width/getContext().getResources().getDisplayMetrics().density)),50);height=size.getHeightInPixels(getActivity());}
        proof=g.toString();measured=g;token=proof+":"+width+":"+height;
        JSObject result=new JSObject(g.toString());result.put("configured",configured()).put("token",token).put("adHeight",height);call.resolve(result);
    }catch(Exception e){hide();call.reject("Banner geometry unavailable");}});}
    @PluginMethod public void apply(PluginCall call){handler.post(()->{try{
        long rev=call.getLong("revision",-1L);if(rev<revision){call.resolve(new JSObject().put("accepted",false));return;}revision=rev;
        if(!call.getBoolean("visible",false)){desired=false;hide();call.resolve(new JSObject().put("accepted",true));return;}
        JSONObject r=call.getObject("rect");boolean valid=alive&&configured()&&!token.isEmpty()&&token.equals(call.getString("token",""))&&capture().toString().equals(proof)&&valid(r);
        desired=valid;placement=r;placedToken=token;
        if(valid)render();else{hide();changed();}
        call.resolve(new JSObject().put("accepted",valid));
    }catch(Exception e){desired=false;hide();call.resolve(new JSObject().put("accepted",false));}});}
    private boolean valid(JSONObject r)throws JSONException{
        if(r==null||measured==null)return false;JSONObject w=measured.getJSONObject("webView"),root=measured.getJSONObject("root"),s=measured.getJSONObject("safeInsets");
        return BannerPlacementGuard.valid(r.getDouble("x"),r.getDouble("y"),r.getDouble("width"),r.getDouble("height"),w.getDouble("x"),w.getDouble("y"),w.getDouble("width"),w.getDouble("height"),root.getDouble("width"),root.getDouble("height"),s.getDouble("left"),s.getDouble("top"),s.getDouble("right"),s.getDouble("bottom"),width,height);
    }
    private boolean eligible(){return alive&&desired&&foreground&&!fullscreen&&getActivity().hasWindowFocus()&&!keyboard()&&!token.isEmpty()&&token.equals(placedToken);}
    private void event(String phase){event(phase,null);}
    private void event(String phase,JSONObject extra){if(!alive)return;JSObject e=new JSObject().put("phase",phase).put("requestId",requestId).put("width",width).put("height",height);if(extra!=null)for(java.util.Iterator<String> i=extra.keys();i.hasNext();){String k=i.next();try{e.put(k,extra.get(k));}catch(Exception ignored){}}notifyListeners("bannerEvent",e);}
    private void hide(){if(banner!=null)banner.setVisibility(View.INVISIBLE);if(displayed){displayed=false;event("hidden");}}
    private void render(){
        if(!eligible()||!sdkReady){hide();return;}
        try{if(!capture().toString().equals(proof)||!valid(placement)){changed();hide();return;}}catch(Exception e){hide();return;}
        if(banner==null){
            if(SystemClock.elapsedRealtime()<retryAt){if(retry==null){retry=()->{retry=null;render();};handler.postDelayed(retry,retryAt-SystemClock.elapsedRealtime());}return;}
            loadBanner();return;
        }
        try{FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(width,height);p.leftMargin=placement.getInt("x");p.topMargin=placement.getInt("y");banner.setLayoutParams(p);banner.setVisibility(loaded?View.VISIBLE:View.INVISIBLE);if(loaded&&!displayed){displayed=true;event("shown");}}catch(Exception e){hide();}
    }
    private void loadBanner(){
        final BannerAdView owned=new BannerAdView(getActivity());banner=owned;final int epoch=++generation;loaded=false;requestId=UUID.randomUUID().toString();
        owned.setVisibility(View.INVISIBLE);owned.setAdSize(size);host.addView(owned,new FrameLayout.LayoutParams(width,height));
        owned.setBannerAdEventListener(new BannerAdEventListener(){
            private boolean current(){return alive&&banner==owned&&generation==epoch;}
            public void onAdLoaded(){handler.post(()->{if(!current())return;handler.removeCallbacks(timeout);timeout=null;loaded=true;
                owned.measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));
                int required=Math.max(height,owned.getMeasuredHeight());if(required>height){height=required;token="";hide();event("geometry");}event("loaded");render();});}
            public void onAdFailedToLoad(@NonNull AdRequestError error){handler.post(()->{if(current())failed();});}
            public void onAdClicked(){handler.post(()->{if(current())event("clicked");});}
            public void onImpression(@Nullable ImpressionData data){handler.post(()->{if(!current())return;try{event("impression",new JSONObject().put("impressionId",UUID.randomUUID().toString()).put("value",ImpressionValue.parse(data==null?null:data.getRawData())));}catch(Exception e){event("impression");}});}
        });
        timeout=()->{if(alive&&banner==owned&&epoch==generation)failed();};handler.postDelayed(timeout,15000);event("request");
        try{owned.loadAd(new AdRequest.Builder(BuildConfig.BANNER_AD_UNIT_ID).build());}catch(RuntimeException e){if(banner==owned&&epoch==generation)failed();}
    }
    private void failed(){event("load_error");retryAt=SystemClock.elapsedRealtime()+30000;destroyBanner();render();}
    private void destroyBanner(){generation++;if(timeout!=null)handler.removeCallbacks(timeout);timeout=null;hide();if(banner!=null){banner.setBannerAdEventListener(null);host.removeView(banner);banner.destroy();banner=null;}loaded=false;}
    @PluginMethod public void destroy(PluginCall call){handler.post(()->{desired=false;destroyBanner();token="";placedToken="";revision=-1;call.resolve();});}
    @Override protected void handleOnPause(){handler.post(()->{foreground=false;hide();});}
    @Override protected void handleOnResume(){handler.post(()->{foreground=true;changed();event("geometry");});}
    @Override protected void handleOnDestroy(){handler.post(()->{desired=false;destroyBanner();alive=false;handler.removeCallbacksAndMessages(null);if(host!=null){host.getViewTreeObserver().removeOnGlobalLayoutListener(layoutListener);host.getViewTreeObserver().removeOnWindowFocusChangeListener(focusListener);ViewCompat.setOnApplyWindowInsetsListener(host,null);((android.view.ViewGroup)host.getParent()).removeView(host);}if(instance==this)instance=null;});}
}
