package com.danilah.arrows;

import android.app.*;
import android.content.*;
import android.os.Build;
import android.util.AtomicFile;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.json.*;

/** All methods run on the SAME disk queue as progress publication. Optional failures never fail a game save. */
final class DailyReminderEngine {
    static final String CHANNEL="arrows_daily_v1", ACTION="com.danilah.arrows.DAILY_ALARM", OPEN="com.danilah.arrows.OPEN_DAILY";
    static final int ID=2401;
    static volatile boolean foreground;
    private static volatile Boolean enabled;
    private final Context context;
    DailyReminderEngine(Context context) { this.context=context.getApplicationContext(); }
    private AtomicFile file() { return new AtomicFile(new File(context.getNoBackupFilesDir(),"arrows-reminders-v1.json")); }
    JSONObject read() throws Exception {
        AtomicFile f=file();
        if(!f.getBaseFile().exists()&&!new File(f.getBaseFile()+".bak").exists()){enabled=false;return new JSONObject().put("version",1).put("enabled",false).put("time","19:00").put("offered",false);}
        JSONObject s=new JSONObject(new String(f.readFully(),StandardCharsets.UTF_8));
        if(s.optInt("version")!=1||!DailyReminderPolicy.time(s.optString("time")))throw new IOException("Unreadable reminder preferences"); enabled=s.optBoolean("enabled");return s;
    }
    void write(JSONObject s) throws Exception {
        byte[] bytes=s.toString().getBytes(StandardCharsets.UTF_8); if(bytes.length>32768)throw new IOException("Reminder state too large");
        AtomicFile f=file(); FileOutputStream out=null;
        try {out=f.startWrite();out.write(bytes);f.finishWrite(out);out=null;if(!Arrays.equals(bytes,f.readFully()))throw new IOException("Reminder write unverified");}
        finally {if(out!=null)f.failWrite(out);}
        enabled=s.optBoolean("enabled");
    }
    void channel() {
        if(Build.VERSION.SDK_INT>=26)((NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(
            new NotificationChannel(CHANNEL,"Daily puzzles / Дэйлики",NotificationManager.IMPORTANCE_DEFAULT));
    }
    boolean allowed() {
        if(!NotificationManagerCompat.from(context).areNotificationsEnabled())return false;
        if(Build.VERSION.SDK_INT>=26){NotificationChannel c=((NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).getNotificationChannel(CHANNEL);if(c==null||c.getImportance()==NotificationManager.IMPORTANCE_NONE)return false;}return true;
    }
    static String hash(byte[] bytes) throws Exception { byte[] digest=MessageDigest.getInstance("SHA-256").digest(bytes);StringBuilder s=new StringBuilder();for(byte b:digest)s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString(); }
    boolean matches(JSONObject p) {
        if(p==null||!p.optString("rootHash").matches("[a-f0-9]{64}"))return false;
        try {byte[] raw=new AtomicFile(new File(context.getNoBackupFilesDir(),"arrows-state-v1/arrows.progress.v1.json")).readFully();return raw.length<=4*1024*1024&&hash(raw).equals(p.optString("rootHash"));}
        catch(Exception e){return false;}
    }
    private PendingIntent alarm(long at) { return PendingIntent.getBroadcast(context,ID,new Intent(context,DailyReminderReceiver.class).setAction(ACTION).putExtra("at",at),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE); }
    void invalidate() { ((AlarmManager)context.getSystemService(Context.ALARM_SERVICE)).cancel(alarm(0));NotificationManagerCompat.from(context).cancel(ID); }
    void invalidateForProgress() {
        // Default-off players incur no per-move alarm/notification Binder calls or preference reads.
        if(enabled==null)try{read();}catch(Exception unreadable){invalidate();return;}
        if(Boolean.TRUE.equals(enabled))invalidate();
    }
    private boolean visible() {
        ActivityManager.RunningAppProcessInfo info=new ActivityManager.RunningAppProcessInfo();ActivityManager.getMyMemoryState(info);
        return foreground||info.importance<=ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE;
    }
    void reconcile(JSONObject s) throws Exception {
        channel(); long now=System.currentTimeMillis();TimeZone zone=TimeZone.getDefault();String day=DailyReminderPolicy.day(now,zone);JSONObject p=s.optJSONObject("snapshot");
        if(!s.optBoolean("enabled")||!allowed()||!matches(p)||!DailyReminderPolicy.covers(p,day)){invalidate();s.remove("scheduled");write(s);return;}
        boolean done=DailyReminderPolicy.contains(p.optJSONArray("completed"),day);
        if(done||visible())NotificationManagerCompat.from(context).cancel(ID);
        long at=DailyReminderPolicy.next(now,s.getString("time"),done||day.compareTo(s.optString("last"))<=0,zone);
        if(!DailyReminderPolicy.covers(p,DailyReminderPolicy.day(at,zone))){invalidate();s.remove("scheduled");write(s);return;}
        s.put("scheduled",at);write(s);
        ((AlarmManager)context.getSystemService(Context.ALARM_SERVICE)).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,alarm(at));
    }
    void deliver(long expected) throws Exception {
        JSONObject s=read(),p=s.optJSONObject("snapshot");long now=System.currentTimeMillis();TimeZone zone=TimeZone.getDefault();String day=DailyReminderPolicy.day(now,zone);
        boolean valid=expected>0&&expected==s.optLong("scheduled")&&day.equals(DailyReminderPolicy.day(expected,zone));
        if(valid&&s.optBoolean("enabled")&&allowed()&&matches(p)&&DailyReminderPolicy.eligible(p,day,s.optString("last"),now,expected,visible())){
            String[] message=DailyReminderPolicy.message(p,day,s.optString("language","ru"),s.optJSONArray("recent"));
            JSONArray recent=s.optJSONArray("recent");if(recent==null)recent=new JSONArray();recent.put(message[0]);while(recent.length()>3)recent.remove(0);
            // Claim BEFORE post: a crash may miss one reminder, but never duplicates it.
            s.put("last",day).put("recent",recent);write(s);
            Intent open=new Intent(context,MainActivity.class).setAction(OPEN).putExtra("dailyNonce",UUID.randomUUID().toString()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent tap=PendingIntent.getActivity(context,ID,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            NotificationManagerCompat.from(context).notify(ID,new NotificationCompat.Builder(context,CHANNEL).setSmallIcon(com.danilah.arrows.R.drawable.arrows_mark_monochrome)
                .setContentTitle(message[1]).setContentText(message[2]).setStyle(new NotificationCompat.BigTextStyle().bigText(message[2])).setContentIntent(tap)
                .setAutoCancel(true).setCategory(NotificationCompat.CATEGORY_REMINDER).build());
        }
        reconcile(s);
    }
    void acceptSnapshot(JSONObject s, JSONObject p) throws Exception {
        String from=p.optString("from"),to=p.optString("to");
        String last=p.optString("lastCompleted");
        if(p.optInt("version")!=1||!DailyReminderPolicy.validDay(from)||!DailyReminderPolicy.validDay(to)||from.compareTo(to)>0||!p.has("lastCompleted")||!last.isEmpty()&&!DailyReminderPolicy.validDay(last))throw new IOException("Invalid projection");
        for(String key:new String[]{"completed","started"}){JSONArray a=p.optJSONArray(key);Set<String> seen=new HashSet<>();if(a==null||a.length()>62)throw new IOException("Invalid dates");for(int i=0;i<a.length();i++){String d=a.getString(i);if(!DailyReminderPolicy.validDay(d)||d.compareTo(from)<0||d.compareTo(to)>0||!seen.add(d))throw new IOException("Invalid dates");}}
        if(!matches(p))throw new IOException("Stale projection");s.put("snapshot",p);write(s);reconcile(s);
    }
}
