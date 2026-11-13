package com.danilah.arrows;

import java.math.BigDecimal;
import org.json.JSONObject;

/** Monetary observation only. Canonical custom export is separate from automatic AppMetrica totals. */
final class ImpressionValue {
    static JSONObject parse(String raw) throws Exception {
        JSONObject result = new JSONObject().put("amount", "").put("currency", "").put("precision", "unknown").put("known", false);
        if (raw == null) return result;
        try {
            JSONObject data = new JSONObject(raw);
            String currency = data.optString("currency", ""), precision = data.optString("precision", "unknown");
            if (precision.length() <= 60 && !precision.isEmpty()) result.put("precision", precision);
            String amount = data.optString("revenue", "");
            if (amount.isEmpty() || amount.length() > 60 || !currency.matches("[A-Z]{3}")) return result;
            BigDecimal value = new BigDecimal(amount);
            if (value.signum() < 0) return result;
            result.put("amount", amount).put("currency", currency).put("known", true);
        } catch (Exception ignored) { /* Missing/invalid value is unknown, not zero. */ }
        return result;
    }
}
