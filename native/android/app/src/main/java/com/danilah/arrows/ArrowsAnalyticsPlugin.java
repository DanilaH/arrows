package com.danilah.arrows;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import io.appmetrica.analytics.AppMetrica;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

/** Road Lines transport, with one shared per-event schema instead of two hand-maintained whitelists. */
@CapacitorPlugin(name = "ArrowsAnalytics")
public class ArrowsAnalyticsPlugin extends Plugin {
    private JSONObject contract = new JSONObject();
    private final AnalyticsEnvironment environment = new AnalyticsEnvironment(BuildConfig.DEBUG, BuildConfig.APPLICATION_ID.endsWith(".playtest"), BuildConfig.AD_MODE, !BuildConfig.ANALYTICS_API_KEY.isEmpty());
    @Override public void load() {
        try (InputStream in = getContext().getAssets().open("arrows-analytics-contract.json")) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024]; int n;
            while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
            contract = new JSONObject(new String(out.toByteArray(), StandardCharsets.UTF_8));
        } catch (Exception ignored) { /* Invalid/missing contract disables transport. */ }
    }
    @PluginMethod public void status(PluginCall call) {
        JSObject result = new JSObject(); result.put("enabled", ArrowsApplication.analyticsEnabled);
        result.put("configured", !BuildConfig.ANALYTICS_API_KEY.isEmpty()); result.put("contractEvents", contract.length()); call.resolve(result);
    }
    @PluginMethod public void flush(PluginCall call) {
        if (ArrowsApplication.analyticsEnabled) { try { AppMetrica.sendEventsBuffer(); } catch (RuntimeException ignored) {} }
        call.resolve();
    }
    @PluginMethod public void report(PluginCall call) {
        String name = call.getString("event", "");
        JSObject params = call.getObject("params", new JSObject());
        JSONObject fields = contract.optJSONObject(name);
        if (fields == null || fields.length() != params.length()) { call.reject("Invalid event"); return; }
        Iterator<String> keys = fields.keys();
        while (keys.hasNext()) {
            String key = keys.next(), type = fields.optString(key); Object value = params.opt(key);
            boolean valid = "string".equals(type) ? value instanceof String && ((String)value).length() <= 160
                : "boolean".equals(type) ? value instanceof Boolean
                : "number".equals(type) && value instanceof Number && Double.isFinite(((Number)value).doubleValue());
            if (!valid) { call.reject("Invalid event parameter"); return; }
        }
        JSObject result = new JSObject(); result.put("accepted", false); result.put("disabled", !ArrowsApplication.analyticsEnabled);
        if (ArrowsApplication.analyticsEnabled) {
            try {
                // Validate the exact shared event schema first, then add the native
                // envelope. JS/QA flags cannot relabel a test build as live.
                params.put("environment_version", 1);
                params.put("build_environment", environment.build);
                params.put("ad_environment", environment.ads);
                params.put("analytics_environment", environment.analytics);
                params.put("app_version", BuildConfig.VERSION_NAME);
                params.put("app_version_code", BuildConfig.VERSION_CODE);
                AppMetrica.reportEvent(name, params.toString()); result.put("accepted", true);
            }
            catch (RuntimeException ignored) { /* Never a gameplay dependency. */ }
        }
        call.resolve(result);
    }
}
