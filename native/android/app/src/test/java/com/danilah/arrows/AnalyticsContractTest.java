package com.danilah.arrows;

import org.junit.Test;
import org.json.JSONObject;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Iterator;
import static org.junit.Assert.*;

public class AnalyticsContractTest {
    @Test public void everySharedEventAcceptsExactTypesAndRejectsMissingExtraOrWrongFields() throws Exception {
        JSONObject contract = new JSONObject(new String(Files.readAllBytes(Paths.get("src/main/assets/arrows-analytics-contract.json")), java.nio.charset.StandardCharsets.UTF_8));
        assertEquals(38, contract.length());
        Iterator<String> events = contract.keys();
        while (events.hasNext()) {
            String event = events.next(); JSONObject fields = contract.getJSONObject(event), params = new JSONObject();
            Iterator<String> keys = fields.keys();
            while (keys.hasNext()) { String key = keys.next(), type = fields.getString(key); params.put(key, "string".equals(type) ? "sample" : "number".equals(type) ? 1 : true); }
            assertTrue(event, AnalyticsContract.valid(contract, event, params));
            params.put("unexpected", "value"); assertFalse(event, AnalyticsContract.valid(contract, event, params)); params.remove("unexpected");
            Iterator<String> checks = fields.keys();
            while (checks.hasNext()) { String key = checks.next();
                Object original = params.remove(key); assertFalse(event, AnalyticsContract.valid(contract, event, params));
                params.put(key, JSONObject.NULL); assertFalse(event, AnalyticsContract.valid(contract, event, params));
                params.put(key, original);
            }
        }
        assertFalse(AnalyticsContract.valid(contract, "unknown", new JSONObject()));
    }
    @Test public void finiteNumbersAndBoundedStringsMatchTheJavascriptTransport() throws Exception {
        JSONObject contract = new JSONObject("{\"x\":{\"n\":\"number\",\"s\":\"string\"}}");
        JSONObject p = new JSONObject().put("n", 1).put("s", "x".repeat(160));
        assertTrue(AnalyticsContract.valid(contract,"x",p));p.put("s","x".repeat(161));assertFalse(AnalyticsContract.valid(contract,"x",p));
        p.put("s","x");p.put("n","1");assertFalse(AnalyticsContract.valid(contract,"x",p));
    }
}
