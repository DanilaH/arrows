package com.danilah.arrows;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.*;

@CapacitorPlugin(name="ArrowsDaily",permissions={@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class ArrowsDailyPlugin extends Plugin {
    private DailyReminderEngine engine(){return new DailyReminderEngine(getContext());}
    private interface Work { void run(DailyReminderEngine e,JSONObject s) throws Exception; }
    private void job(PluginCall call,Work work){ArrowsStoragePlugin.IO.execute(()->{try{DailyReminderEngine e=engine();JSONObject s=e.read();work.run(e,s);call.resolve(new JSObject().put("enabled",s.optBoolean("enabled")).put("time",s.getString("time")).put("offered",s.optBoolean("offered")).put("allowed",e.allowed()).put("pending",s.optString("pending")));}catch(Exception error){call.reject("Daily reminders unavailable");}});}
    @PluginMethod public void status(PluginCall call){job(call,(e,s)->{e.reconcile(s);});}
    @PluginMethod public void sync(PluginCall call){job(call,(e,s)->{String language=call.getString("language","ru");if(!language.equals("ru")&&!language.equals("en"))throw new IllegalArgumentException();s.put("language",language);JSONObject p=call.getObject("snapshot");if(p==null){s.remove("snapshot");e.write(s);e.invalidate();}else e.acceptSnapshot(s,p);});}
    @PluginMethod public void configure(PluginCall call){job(call,(e,s)->{String time=call.getString("time",s.getString("time"));if(!DailyReminderPolicy.time(time))throw new IllegalArgumentException();s.put("time",time).put("enabled",call.getBoolean("enabled",s.optBoolean("enabled"))).put("offered",true);e.write(s);e.reconcile(s);});}
    @PluginMethod public void markOffered(PluginCall call){job(call,(e,s)->{s.put("offered",true);e.write(s);});}
    @PluginMethod public void consume(PluginCall call){job(call,(e,s)->{if(s.optString("pending").equals(call.getString("nonce",""))){s.remove("pending");e.write(s);}});}
    @PluginMethod public void request(PluginCall call){if(Build.VERSION.SDK_INT>=33)requestPermissionForAlias("notifications",call,"notificationPermission");else status(call);}
    @PermissionCallback private void notificationPermission(PluginCall call){status(call);}
    @PluginMethod public void openSettings(PluginCall call){try{Intent i=Build.VERSION.SDK_INT>=26?new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getContext().getPackageName()):new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,android.net.Uri.parse("package:"+getContext().getPackageName()));getActivity().startActivity(i);call.resolve();}catch(Exception error){call.reject("Notification settings unavailable");}}
    private void accept(Intent intent){if(intent==null||!DailyReminderEngine.OPEN.equals(intent.getAction()))return;String nonce=intent.getStringExtra("dailyNonce");if(nonce==null||!nonce.matches("[a-f0-9-]{36}"))return;
        ArrowsStoragePlugin.IO.execute(()->{try{DailyReminderEngine e=engine();JSONObject s=e.read();if(!nonce.equals(s.optString("consumed"))){s.put("pending",nonce).put("consumed",nonce);e.write(s);notifyListeners("dailyEntry",new JSObject(),true);}}catch(Exception ignored){/* Main Home remains usable. */}});
    }
    @Override public void load(){DailyReminderEngine.foreground=true;accept(getActivity().getIntent());}
    @Override protected void handleOnNewIntent(Intent intent){accept(intent);}
    @Override protected void handleOnResume(){DailyReminderEngine.foreground=true;ArrowsStoragePlugin.IO.execute(()->{try{DailyReminderEngine e=engine();e.reconcile(e.read());notifyListeners("dailyEntry",new JSObject(),true);}catch(Exception ignored){}});}
    @Override protected void handleOnPause(){DailyReminderEngine.foreground=false;}
    @Override protected void handleOnDestroy(){DailyReminderEngine.foreground=false;}
}
