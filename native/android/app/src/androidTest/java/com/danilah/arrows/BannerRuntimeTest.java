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
            for(String key:new String[]{"alive","sdkReady","fullscreen","foreground","desired","loaded","displayed","width","height","revision","token","placedToken","proof","requestId"})state.put(key,field(plugin,key));
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
    @Test public void ordinaryHomeLoadsAndShowsNativeDemoBanner()throws Exception{
        Intent intent=new Intent(instrumentation.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity=(MainActivity)instrumentation.startActivitySync(intent);
        try{
            waitJs("!!document.querySelector('#home-play:not(:disabled)') && document.querySelector('#game-shell').dataset.status==='ready'");
            js("document.querySelector('#home-play').click();true");
            waitJs("document.querySelector('#game-shell').dataset.screen==='game'");
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
            instrumentation.getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,new java.io.FileOutputStream(new java.io.File(instrumentation.getTargetContext().getExternalFilesDir(null),"native-banner.png")));
        }finally{instrumentation.runOnMainSync(()->activity.finish());}
    }
}
