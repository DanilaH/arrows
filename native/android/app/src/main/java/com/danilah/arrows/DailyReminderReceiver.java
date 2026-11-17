package com.danilah.arrows;

import android.content.*;

public class DailyReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        PendingResult pending=goAsync();
        ArrowsStoragePlugin.IO.execute(()->{try{DailyReminderEngine engine=new DailyReminderEngine(context);if(DailyReminderEngine.ACTION.equals(intent.getAction()))engine.deliver(intent.getLongExtra("at",0));else engine.reconcile(engine.read());}
            catch(Exception ignored){try{new DailyReminderEngine(context).invalidate();}catch(Exception unavailable){/* Optional capability. */}}
            finally{pending.finish();}});
    }
}
