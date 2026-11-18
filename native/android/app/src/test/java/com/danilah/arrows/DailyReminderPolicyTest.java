package com.danilah.arrows;
import org.junit.Test;
import org.json.*;
import java.util.*;
import java.text.SimpleDateFormat;
import static org.junit.Assert.*;

public class DailyReminderPolicyTest {
    private long at(String text,TimeZone zone)throws Exception{SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd HH:mm",Locale.ROOT);f.setTimeZone(zone);return f.parse(text).getTime();}
    private JSONObject projection()throws Exception{return new JSONObject("{\"version\":1,\"unlocked\":true,\"from\":\"2026-11-01\",\"to\":\"2026-12-31\",\"completed\":[],\"started\":[]}");}
    @Test public void fixedSlotsAcrossDstYearAndCompletion()throws Exception{
        TimeZone zone=TimeZone.getTimeZone("America/New_York");
        assertEquals(at("2026-03-08 13:00",zone),DailyReminderPolicy.next(at("2026-03-07 20:00",zone),false,"",zone));
        assertEquals(at("2026-11-01 13:00",zone),DailyReminderPolicy.next(at("2026-10-31 20:00",zone),false,"",zone));
        assertEquals(at("2027-01-01 13:00",zone),DailyReminderPolicy.next(at("2026-12-31 18:00",zone),true,"",zone));
        assertEquals(at("2026-11-17 19:00",zone),DailyReminderPolicy.next(at("2026-11-17 13:01",zone),false,"2026-11-17/13:00",zone));
        assertEquals(at("2026-11-18 13:00",zone),DailyReminderPolicy.next(at("2026-11-17 19:01",zone),false,"2026-11-17/19:00",zone));
        assertEquals(at("2026-11-18 13:00",zone),DailyReminderPolicy.next(at("2026-11-17 13:01",zone),true,"2026-11-17/13:00",zone));
        assertTrue(DailyReminderPolicy.validDay("2028-02-29"));assertFalse(DailyReminderPolicy.validDay("2027-02-29"));assertFalse(DailyReminderPolicy.validDay("2026-02-31"));
    }
    @Test public void twoSlotsAreIndependentButCompletionForegroundExpiryAndRollbackSuppress()throws Exception{
        JSONObject p=projection();TimeZone zone=TimeZone.getTimeZone("Asia/Yekaterinburg");String day="2026-11-17";
        long noon=at(day+" 13:00",zone),evening=at(day+" 19:00",zone);
        assertTrue(DailyReminderPolicy.eligible(p,day,"",noon,noon,false,zone));
        assertFalse(DailyReminderPolicy.eligible(p,day,day+"/13:00",noon,noon,false,zone));
        assertTrue(DailyReminderPolicy.eligible(p,day,day+"/13:00",evening,evening,false,zone));
        assertFalse(DailyReminderPolicy.eligible(p,day,day+"/19:00",evening,evening,false,zone));
        assertFalse(DailyReminderPolicy.eligible(p,day,"2026-11-18/13:00",evening,evening,false,zone));
        assertFalse(DailyReminderPolicy.eligible(p,day,"",noon,noon,true,zone));assertFalse(DailyReminderPolicy.eligible(p,day,"",noon-1,noon,false,zone));
        assertFalse(DailyReminderPolicy.eligible(p,day,"",noon+DailyReminderPolicy.LATE_MS+1,noon,false,zone));
        assertFalse(DailyReminderPolicy.eligible(p,"2026-11-18","",evening,evening,false,zone));
        p.getJSONArray("completed").put(day);assertFalse(DailyReminderPolicy.eligible(p,day,"",evening,evening,false,zone));
        p.put("unlocked",false);assertFalse(DailyReminderPolicy.eligible(p,day,"",evening,evening,false,zone));
        assertEquals(at("2026-11-18 19:00",zone),DailyReminderPolicy.next(noon,false,"2026-11-18/13:00",zone));
        assertEquals(at("2026-11-19 13:00",zone),DailyReminderPolicy.next(noon,false,"2026-11-18/19:00",zone));
    }
    @Test public void migrationRetainsNativeProofAndPendingTapButRemovesOldPreference()throws Exception{
        JSONObject old=new JSONObject().put("version",1).put("enabled",true).put("offered",true).put("time","20:30").put("last","2026-11-17").put("snapshot",projection()).put("pending","nonce");
        JSONObject upgraded=DailyReminderPolicy.upgrade(old);
        assertEquals(2,upgraded.getInt("version"));assertTrue(upgraded.getBoolean("enabled"));assertTrue(upgraded.getBoolean("requested"));
        assertFalse(upgraded.has("time"));assertFalse(upgraded.has("offered"));assertEquals("2026-11-17/19:00",upgraded.getString("last"));
        assertEquals("nonce",upgraded.getString("pending"));assertTrue(upgraded.has("snapshot"));
        JSONObject shownOnly=DailyReminderPolicy.upgrade(new JSONObject().put("version",1).put("enabled",false).put("offered",true));
        assertTrue(shownOnly.getBoolean("enabled"));assertFalse(shownOnly.getBoolean("requested"));
        assertTrue(DailyReminderPolicy.upgrade(upgraded).getBoolean("requested"));
    }
    @Test public void remindersContinueBeyondTheDetailedWindowWithoutGuessingFutureSavedWins()throws Exception{
        JSONObject p=projection();p.put("lastCompleted","2027-03-15");
        assertFalse(DailyReminderPolicy.covers(p,"2027-01-01"));assertFalse(DailyReminderPolicy.covers(p,"2027-03-15"));
        assertTrue(DailyReminderPolicy.covers(p,"2027-03-16"));assertTrue(DailyReminderPolicy.covers(p,"2030-01-01"));
        assertFalse(DailyReminderPolicy.covers(p,"2026-10-31"));
    }
    @Test public void deviceLocaleCannotChangeTheGregorianCupDenominator()throws Exception{
        Locale old=Locale.getDefault();
        try{Locale.setDefault(new Locale("th","TH"));JSONObject p=projection();JSONArray dates=p.getJSONArray("completed");for(int i=1;i<=28;i++)dates.put(String.format(Locale.ROOT,"2028-02-%02d",i));
            JSONArray avoid=new JSONArray("[\"fresh\",\"challenge\",\"cup\",\"first\",\"progress\"]");assertEquals("last",DailyReminderPolicy.message(p,"2028-02-29","en",avoid)[0]);
        }finally{Locale.setDefault(old);}
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
