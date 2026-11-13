package com.danilah.arrows;

/** Safe export provenance, not SDK IDs/keys and not proof of dashboard delivery. */
final class AnalyticsEnvironment {
    final String build, ads, analytics;
    AnalyticsEnvironment(boolean debug, boolean playtest, String adMode, boolean configured) {
        build = playtest ? "playtest" : debug ? "debug" : "release";
        ads = "live".equals(adMode) || "test".equals(adMode) || "disabled".equals(adMode) ? adMode : "unknown";
        analytics = !configured ? "off" : "live".equals(ads) ? "production" : "debug";
    }
}
