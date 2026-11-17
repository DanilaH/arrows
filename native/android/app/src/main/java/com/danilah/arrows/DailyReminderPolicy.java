package com.danilah.arrows;

import java.text.SimpleDateFormat;
import java.util.*;
import org.json.*;

/** Android-free calendar and truth/variety rules, also exercised on the JVM. */
final class DailyReminderPolicy {
    static final long LATE_MS = 3 * 60 * 60 * 1000L;
    static String day(long at, TimeZone zone) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT); f.setTimeZone(zone); return f.format(new Date(at));
    }
    static boolean validDay(String key) {
        if (!key.matches("(?:20[2-9][0-9]|21[0-9]{2}|2200)-[0-9]{2}-[0-9]{2}") || key.compareTo("2026-01-01") < 0) return false;
        try { SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT); f.setTimeZone(TimeZone.getTimeZone("UTC")); f.setLenient(false); return key.equals(f.format(f.parse(key))); }
        catch (Exception e) { return false; }
    }
    static boolean time(String value) { return value.matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]"); }
    static long next(long now, String time, boolean skipToday, TimeZone zone) {
        if (!time(time)) throw new IllegalArgumentException("Invalid time");
        Calendar c = Calendar.getInstance(zone); c.setTimeInMillis(now);
        c.set(Calendar.HOUR_OF_DAY, Integer.parseInt(time.substring(0, 2))); c.set(Calendar.MINUTE, Integer.parseInt(time.substring(3)));
        c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
        if (skipToday || c.getTimeInMillis() <= now) { c.add(Calendar.DATE, 1); c.set(Calendar.HOUR_OF_DAY, Integer.parseInt(time.substring(0, 2))); c.set(Calendar.MINUTE, Integer.parseInt(time.substring(3))); }
        return c.getTimeInMillis();
    }
    static boolean contains(JSONArray dates, String day) { if (dates != null) for (int i=0;i<dates.length();i++) if (day.equals(dates.optString(i))) return true; return false; }
    static boolean covers(JSONObject p, String day) {
        return p != null && p.optInt("version") == 1 && p.optBoolean("unlocked") && validDay(day)
            && day.compareTo(p.optString("from")) >= 0 && (day.compareTo(p.optString("to")) <= 0
                // Beyond the detailed window, only dates AFTER every durable win are provably unfinished.
                || p.has("lastCompleted") && day.compareTo(p.optString("lastCompleted")) > 0);
    }
    static boolean eligible(JSONObject p, String day, String last, long now, long scheduled, boolean foreground) {
        return covers(p,day) && !contains(p.optJSONArray("completed"),day) && day.compareTo(last)>0 && !foreground
            && now >= scheduled && now - scheduled <= LATE_MS;
    }
    static String[] message(JSONObject p, String day, String language, JSONArray recent) {
        boolean ru = "ru".equals(language); List<String[]> choices = new ArrayList<>();
        choices.add(new String[]{"fresh", ru?"Сегодня — новый узор":"A new pattern today", ru?"Дэйлик ждёт. Какая стрелка уйдёт первой?":"Your daily is ready. Which arrow goes first?"});
        choices.add(new String[]{"challenge",ru?"Стрелки приготовили вызов":"Arrows has a challenge",ru?"Новый дэйлик уже можно пройти.":"Today's daily is ready to play."});
        choices.add(new String[]{"first",ru?"Найдём первую стрелку?":"Find the first arrow?",ru?"Сегодняшний узор ждёт своего решения.":"Today's pattern is waiting to be solved."});
        choices.add(new String[]{"cup",ru?"Ещё один шаг к кубку":"Another step toward the cup",ru?"Пройдите сегодняшний дэйлик и пополните месяц победой.":"Complete today's daily and add a win to your month."});
        if (contains(p.optJSONArray("started"),day)) choices.add(new String[]{"resume",ru?"Узор ждёт продолжения":"Your pattern is waiting",ru?"Сегодняшний дэйлик уже начат. Продолжим?":"Today's daily is already started. Pick up where you left off?"});
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone("UTC")); c.set(Integer.parseInt(day.substring(0,4)),Integer.parseInt(day.substring(5,7))-1,1);
        int total=c.getActualMaximum(Calendar.DAY_OF_MONTH),done=0; JSONArray dates=p.optJSONArray("completed");
        if(dates!=null)for(int i=0;i<dates.length();i++)if(dates.optString(i).startsWith(day.substring(0,7)))done++;
        if(done>0)choices.add(new String[]{"progress",ru?"Кубок становится ближе":"The cup is getting closer",ru?"Дней пройдено: "+done+" из "+total+". Сегодняшний ещё впереди.":"Days completed: "+done+" of "+total+". Today's daily is still waiting."});
        if(total-done==1)choices.add(new String[]{"last",ru?"До кубка — один дэйлик":"One daily left for the cup",ru?"Остался сегодняшний узор. Заберём кубок месяца?":"Just today's pattern remains. Ready to earn the month's cup?"});
        List<String[]> fresh=new ArrayList<>(); for(String[] choice:choices)if(!contains(recent,choice[0]))fresh.add(choice);
        List<String[]> pool=fresh.isEmpty()?choices:fresh;
        return pool.get(Math.floorMod(day.hashCode(),pool.size()));
    }
}
