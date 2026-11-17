package com.danilah.arrows;

import org.json.JSONObject;
import java.util.Iterator;

/** Pure validation seam used by the real plugin and exhaustive JVM schema tests. */
final class AnalyticsContract {
    static boolean valid(JSONObject contract, String name, JSONObject params) {
        JSONObject fields = contract.optJSONObject(name);
        if (fields == null || fields.length() != params.length()) return false;
        Iterator<String> keys = fields.keys();
        while (keys.hasNext()) {
            String key = keys.next(), type = fields.optString(key); Object value = params.opt(key);
            boolean valid = "string".equals(type) ? value instanceof String && ((String)value).length() <= 160
                : "boolean".equals(type) ? value instanceof Boolean
                : "number".equals(type) && value instanceof Number && Double.isFinite(((Number)value).doubleValue());
            if (!valid) return false;
        }
        return true;
    }
}
