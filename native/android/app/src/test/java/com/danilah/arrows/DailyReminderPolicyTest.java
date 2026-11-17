package com.danilah.arrows;
import org.junit.Test;
import org.json.*;
import java.util.*;
import java.text.SimpleDateFormat;
import static org.junit.Assert.*;

public class DailyReminderPolicyTest {
    private long at(String text,TimeZone zone)throws Exception{SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd HH:mm",Locale.ROOT);f.setTimeZone(zone);return f.parse(text).getTime();}
    private JSONObject projection()throws Exception{return new JSONObject("{\"version\":1,\"unlocked\":true,\"from\":\"2026-11-01\",\"to\":\"2026-12-31\",\"completed\":[],\"started\":[]}");}
    @Test public void calendarNotTwentyFourHourOffsetAcrossDstAndYear()throws Exception{
        TimeZone zone=TimeZone.getTimeZone("America/New_York");long now=at("2026-03-07 20:00",zone),next=DailyReminderPolicy.next(now,"19:00",false,zone);
        assertEquals(at("2026-03-08 19:00",zone),next);assertEquals(22*3600000L,next-now);
        assertEquals(at("2026-11-01 19:00",zone),DailyReminderPolicy.next(at("2026-10-31 20:00",zone),"19:00",false,zone));
        assertEquals(at("2027-01-01 19:00",zone),DailyReminderPolicy.next(at("2026-12-31 18:00",zone),"19:00",true,zone));
        assertTrue(DailyReminderPolicy.validDay("2028-02-29"));assertFalse(DailyReminderPolicy.validDay("2027-02-29"));assertFalse(DailyReminderPolicy.validDay("2026-02-31"));assertFalse(DailyReminderPolicy.time("24:00"));
    }
    @Test public void completionForegroundExpiryCoverageAndClockRollbackSuppressDelivery()throws Exception{
        JSONObject p=projection();long due=100000000;String day="2026-11-17";
        assertTrue(DailyReminderPolicy.eligible(p,day,"2026-11-16",due,due,false));
        assertFalse(DailyReminderPolicy.eligible(p,day,day,due,due,false));assertFalse(DailyReminderPolicy.eligible(p,day,"2026-11-18",due,due,false));
        assertFalse(DailyReminderPolicy.eligible(p,day,"",due,due,true));assertFalse(DailyReminderPolicy.eligible(p,day,"",due-1,due,false));
        assertFalse(DailyReminderPolicy.eligible(p,day,"",due+DailyReminderPolicy.LATE_MS+1,due,false));
        assertFalse(DailyReminderPolicy.eligible(p,"2027-01-01","",due,due,false));p.getJSONArray("completed").put(day);assertFalse(DailyReminderPolicy.eligible(p,day,"",due,due,false));
        p.put("unlocked",false);assertFalse(DailyReminderPolicy.eligible(p,"2026-11-18","",due,due,false));
    }
    @Test public void remindersContinueBeyondTheDetailedWindowWithoutGuessingFutureSavedWins()throws Exception{
        JSONObject p=projection();p.put("lastCompleted","2027-03-15");
        assertFalse(DailyReminderPolicy.covers(p,"2027-01-01"));assertFalse(DailyReminderPolicy.covers(p,"2027-03-15"));
        assertTrue(DailyReminderPolicy.covers(p,"2027-03-16"));assertTrue(DailyReminderPolicy.covers(p,"2030-01-01"));
        assertFalse(DailyReminderPolicy.covers(p,"2026-10-31"));
    }
    @Test public void rotationAvoidsLastThreeAndNeverClaimsFalseCupOrDuration()throws Exception{
        for(String language:new String[]{"ru","en"}){
            JSONObject p=projection();JSONArray recent=new JSONArray();Set<String> used=new HashSet<>();
            for(int i=1;i<=28;i++){
                String day=String.format(Locale.ROOT,"2026-11-%02d",i);String[] m=DailyReminderPolicy.message(p,day,language,recent);
                assertFalse(DailyReminderPolicy.contains(recent,m[0]));assertNotEquals("last",m[0]);assertNotEquals("resume",m[0]);assertFalse(m[2].contains("minutes"));
                used.add(m[0]);recent.put(m[0]);if(recent.length()>2)recent.remove(0);
            }assertTrue(used.size()>=3);
        }
        JSONObject p=projection();JSONArray completed=p.getJSONArray("completed");for(int i=1;i<30;i++)completed.put(String.format(Locale.ROOT,"2026-11-%02d",i));
        JSONArray avoid=new JSONArray("[\"fresh\",\"challenge\",\"cup\",\"first\",\"progress\"]");assertEquals("last",DailyReminderPolicy.message(p,"2026-11-30","en",avoid)[0]);
    }
}
