package com.danilah.arrows;

import org.junit.Test;
import static org.junit.Assert.*;

public class AnalyticsEnvironmentTest {
    @Test public void distinguishesPlaytestDebugAndReleaseWithoutSecrets() {
        AnalyticsEnvironment p = new AnalyticsEnvironment(true,true,"test",false);
        assertEquals("playtest",p.build); assertEquals("test",p.ads); assertEquals("off",p.analytics);
        AnalyticsEnvironment d = new AnalyticsEnvironment(true,false,"test",true);
        assertEquals("debug",d.build); assertEquals("test",d.ads); assertEquals("debug",d.analytics);
        AnalyticsEnvironment r = new AnalyticsEnvironment(false,false,"live",true);
        assertEquals("release",r.build); assertEquals("live",r.ads); assertEquals("production",r.analytics);
    }
    @Test public void debugLiveAndUnknownAreNeverARelease() {
        assertEquals("debug",new AnalyticsEnvironment(true,false,"live",true).build);
        assertEquals("unknown",new AnalyticsEnvironment(false,false,"bad",true).ads);
        assertEquals("off",new AnalyticsEnvironment(false,false,"live",false).analytics);
    }
}
