package com.danilah.arrows;
import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;
public class ImpressionValueTest {
    @Test public void retainsExactAmountCurrencyAndPrecision() throws Exception {
        JSONObject v=ImpressionValue.parse("{\"revenue\":\"0.0012300\",\"currency\":\"USD\",\"precision\":\"estimated\"}");
        assertTrue(v.getBoolean("known")); assertEquals("0.0012300",v.getString("amount")); assertEquals("USD",v.getString("currency")); assertEquals("estimated",v.getString("precision"));
    }
    @Test public void unknownIsNotZeroAndDifferentCurrenciesAreNotConverted() throws Exception {
        assertFalse(ImpressionValue.parse(null).getBoolean("known"));assertEquals("",ImpressionValue.parse("{}").getString("amount"));
        assertTrue(ImpressionValue.parse("{\"revenue\":\"0\",\"currency\":\"RUB\",\"precision\":\"publisher_defined\"}").getBoolean("known"));
        assertFalse(ImpressionValue.parse("{\"revenue\":\"NaN\",\"currency\":\"USD\"}").getBoolean("known"));
    }
}
