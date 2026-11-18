package com.danilah.arrows;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONObject;
import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Real APK/WebView/Capacitor/Yandex SDK. No JS bridge or creative substitution. */
@RunWith(AndroidJUnit4.class)
public class BannerRuntimeTest {
    private final Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
    private MainActivity activity;
    private String js(String expression)throws Exception{
        CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
        instrumentation.runOnMainSync(()->activity.getBridge().getWebView().evaluateJavascript(expression,value->{result.set(value);latch.countDown();}));
        assertTrue("WebView callback",latch.await(5,TimeUnit.SECONDS));return result.get();
    }
    private Object field(Object target,String name)throws Exception{
        Field f=ArrowsBannerPlugin.class.getDeclaredField(name);f.setAccessible(true);return f.get(target);
    }
    private JSONObject nativeState()throws Exception{
        AtomicReference<JSONObject> result=new AtomicReference<>();AtomicReference<Exception> error=new AtomicReference<>();
        instrumentation.runOnMainSync(()->{try{
            Object plugin=activity.getBridge().getPlugin("ArrowsBanner").getInstance();JSONObject state=new JSONObject();
            for(String key:new String[]{"alive","sdkReady","fullscreen","foreground","desired","loaded","displayed","width","height","generation","revision","token","placedToken","proof","requestId"})state.put(key,field(plugin,key));
            View banner=(View)field(plugin,"banner"),host=(View)field(plugin,"host");
            state.put("focus",activity.hasWindowFocus()).put("hostWidth",host.getWidth()).put("hostHeight",host.getHeight());
            state.put("bannerVisibility",banner==null?-1:banner.getVisibility()).put("bannerShown",banner!=null&&banner.isShown());result.set(state);
        }catch(Exception e){error.set(e);}});
        if(error.get()!=null)throw error.get();return result.get();
    }
    private void waitJs(String expression)throws Exception{
        long deadline=SystemClock.elapsedRealtime()+30000;
        while(!"true".equals(js(expression))&&SystemClock.elapsedRealtime()<deadline)SystemClock.sleep(250);
        assertEquals(expression,"true",js(expression));
    }
    private void shell(String command)throws Exception{
        try(java.io.InputStream in=new android.os.ParcelFileDescriptor.AutoCloseInputStream(instrumentation.getUiAutomation().executeShellCommand(command))){
            byte[] buffer=new byte[4096];while(in.read(buffer)!=-1){}
        }
    }
    private void tapTutorialArrow()throws Exception{
        org.json.JSONArray point=new org.json.JSONArray((String)new org.json.JSONTokener(js("JSON.stringify([parseFloat(document.querySelector('#tutorial-pointer').style.left),parseFloat(document.querySelector('#tutorial-pointer').style.top),document.documentElement.getBoundingClientRect().width])")).nextValue());
        AtomicReference<float[]> nativePoint=new AtomicReference<>();
        instrumentation.runOnMainSync(()->{View web=activity.getBridge().getWebView();int[] location=new int[2];web.getLocationOnScreen(location);
            double scale=web.getWidth()/point.optDouble(2);nativePoint.set(new float[]{location[0]+(float)(point.optDouble(0)*scale),location[1]+(float)(point.optDouble(1)*scale)});
        });
        float[] xy=nativePoint.get();long time=SystemClock.uptimeMillis();
        android.view.MotionEvent down=android.view.MotionEvent.obtain(time,time,android.view.MotionEvent.ACTION_DOWN,xy[0],xy[1],0);
        instrumentation.sendPointerSync(down);down.recycle();SystemClock.sleep(80);
        android.view.MotionEvent up=android.view.MotionEvent.obtain(time,SystemClock.uptimeMillis(),android.view.MotionEvent.ACTION_UP,xy[0],xy[1],0);
        instrumentation.sendPointerSync(up);up.recycle();
    }
    private void waitBanner(boolean visible)throws Exception{
        long deadline=SystemClock.elapsedRealtime()+90000;
        while(nativeState().optBoolean("displayed")!=visible&&SystemClock.elapsedRealtime()<deadline)SystemClock.sleep(200);
        assertEquals("Native banner visibility",visible,nativeState().optBoolean("displayed"));
    }
    private void continuousScenes()throws Exception{
        JSONObject initial=nativeState();assertTrue(initial.getBoolean("bannerShown"));
        java.util.concurrent.atomic.AtomicInteger frames=new java.util.concurrent.atomic.AtomicInteger(),hiddenFrames=new java.util.concurrent.atomic.AtomicInteger();
        AtomicReference<View> owned=new AtomicReference<>();
        instrumentation.runOnMainSync(()->{try{owned.set((View)field(activity.getBridge().getPlugin("ArrowsBanner").getInstance(),"banner"));}catch(Exception e){throw new RuntimeException(e);}});
        android.view.ViewTreeObserver.OnPreDrawListener probe=()->{frames.incrementAndGet();if(!owned.get().isShown())hiddenFrames.incrementAndGet();return true;};
        shell("mkdir -p /sdcard/Movies/ArrowsQA");
        android.os.ParcelFileDescriptor recording=instrumentation.getUiAutomation().executeShellCommand("screenrecord --time-limit 12 --bit-rate 1500000 /sdcard/Movies/ArrowsQA/banner-scenes.mp4");
        try{
            SystemClock.sleep(500);
            instrumentation.runOnMainSync(()->activity.getWindow().getDecorView().getViewTreeObserver().addOnPreDrawListener(probe));
            for(int i=0;i<3;i++){
                js("document.querySelector('#home-play').click();true");waitJs("document.querySelector('#game-shell').dataset.screen==='game'");SystemClock.sleep(650);
                js("document.querySelector('#choose-field').click();true");waitJs("document.querySelector('#game-shell').dataset.screen==='home'");SystemClock.sleep(650);
            }
            instrumentation.runOnMainSync(()->activity.getWindow().getDecorView().getViewTreeObserver().removeOnPreDrawListener(probe));
            assertTrue("Observed native transition frames",frames.get()>12);assertEquals("Banner hidden during ordinary scenes",0,hiddenFrames.get());
            JSONObject after=nativeState();assertEquals(initial.getString("requestId"),after.getString("requestId"));assertEquals(initial.getInt("generation"),after.getInt("generation"));
            AtomicReference<Boolean> same=new AtomicReference<>();instrumentation.runOnMainSync(()->{try{same.set(owned.get()==field(activity.getBridge().getPlugin("ArrowsBanner").getInstance(),"banner"));}catch(Exception e){throw new RuntimeException(e);}});assertTrue("Same SDK view",same.get());
            Log.i("ArrowsBannerTest","CONTINUITY frames="+frames.get()+" hiddenFrames="+hiddenFrames.get()+" sameRequest=true sameView=true transitions=6");
            try(java.io.InputStream in=new android.os.ParcelFileDescriptor.AutoCloseInputStream(recording)){byte[] buffer=new byte[4096];while(in.read(buffer)!=-1){}}
        }finally{instrumentation.runOnMainSync(()->activity.getWindow().getDecorView().getViewTreeObserver().removeOnPreDrawListener(probe));recording.close();}
        js("document.querySelector('#home-settings').click();true");waitJs("!!document.querySelector('#settings-dialog[open]')");waitBanner(false);
        js("document.querySelector('#close-settings').click();true");waitJs("!document.querySelector('#settings-dialog[open]')");waitBanner(true);
    }
    @Test public void ordinaryScenesKeepTheRealNativeBannerVisible()throws Exception{
        assertEquals("Runtime test must use demo ads","test",BuildConfig.AD_MODE);
        Intent intent=new Intent(instrumentation.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity=(MainActivity)instrumentation.startActivitySync(intent);
        try{
            waitJs("!!document.querySelector('#home-play:not(:disabled)') && document.querySelector('#game-shell').dataset.status==='ready'");
            js("document.querySelector('#home-play').click();true");
            waitJs("document.querySelector('#game-shell').dataset.screen==='game'");
            waitJs("!document.querySelector('.route-snapshot,.board-transition') && !document.querySelector('#tutorial-pointer').hidden");
            tapTutorialArrow();waitJs("document.querySelector('#game-shell').dataset.remaining==='2' && document.querySelector('#tutorial-pointer').hidden");
            js("document.querySelector('#choose-field').click();true");
            waitJs("!!document.querySelector('#home-play:not(:disabled)') && !document.querySelector('.theme-intro-screen')");
            JSONObject state=null;long deadline=SystemClock.elapsedRealtime()+90000;
            do{
                state=nativeState();Log.i("ArrowsBannerTest",state.toString());
                Log.i("ArrowsBannerTest","web="+js("JSON.stringify({screen:document.querySelector('#game-shell').dataset,slot:document.querySelector('#native-banner-slot')?.getBoundingClientRect().toJSON(),classes:document.documentElement.className,css:document.documentElement.style.cssText,dialogs:[...document.querySelectorAll('dialog[open]')].map(x=>x.id)})"));
                if(state.optBoolean("displayed"))break;SystemClock.sleep(1000);
            }while(SystemClock.elapsedRealtime()<deadline);
            assertTrue("Native banner never shown: "+state,state.getBoolean("displayed"));
            assertTrue("Native banner visible in hierarchy",state.getBoolean("bannerShown"));
            waitJs("!matchMedia('(prefers-reduced-motion: reduce)').matches");
            continuousScenes();
            instrumentation.waitForIdleSync();SystemClock.sleep(1000);
            // Persist the native frame through Gradle's test-app uninstall on this disposable emulator.
            android.content.ContentValues values=new android.content.ContentValues();
            values.put(android.provider.MediaStore.Images.Media.DISPLAY_NAME,"native-banner.png");
            values.put(android.provider.MediaStore.Images.Media.MIME_TYPE,"image/png");
            values.put(android.provider.MediaStore.Images.Media.RELATIVE_PATH,"Pictures/ArrowsQA");
            android.net.Uri uri=activity.getContentResolver().insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);
            assertNotNull(uri);
            try(java.io.OutputStream output=activity.getContentResolver().openOutputStream(uri)){
                assertTrue(instrumentation.getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,output));
            }
        }finally{instrumentation.runOnMainSync(()->activity.finish());}
    }
}
