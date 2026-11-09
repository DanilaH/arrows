package com.danilah.arrows;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.IOException;
import java.util.LinkedHashMap;

/** SDK-independent receipt queue. Native owners share one memory buffer/lock. */
final class RewardJournalCore {
    interface Disk { String read() throws Exception; void write(String raw) throws Exception; void delete() throws Exception; }
    static final class Memory { final LinkedHashMap<String, JSONObject> unconfirmed = new LinkedHashMap<>(); }
    private final Disk disk;
    private final Memory memory;
    RewardJournalCore(Disk disk, Memory memory) { this.disk = disk; this.memory = memory; }
    private static JSONObject receipt(JSONObject value) throws Exception {
        if (!(value.opt("schema") instanceof Number) || ((Number)value.opt("schema")).doubleValue() != 1) throw new IOException("Invalid receipt schema");
        for (String key : new String[]{"id", "attempt"}) if (!(value.opt(key) instanceof String) || !value.getString(key).matches("[a-zA-Z0-9_-]{1,100}")) throw new IOException("Invalid receipt identity");
        String mode = value.optString("mode"), placement = value.optString("placement");
        if (!(mode.equals("campaign") || mode.equals("daily")) || !(placement.equals("hint") || placement.equals("lives"))) throw new IOException("Invalid receipt destination");
        return new JSONObject().put("schema", 1).put("id", value.getString("id")).put("attempt", value.getString("attempt")).put("mode", mode).put("placement", placement);
    }
    private static void merge(LinkedHashMap<String, JSONObject> rows, JSONObject value) throws Exception {
        JSONObject next = receipt(value), old = rows.get(next.getString("id"));
        if (old != null && (!old.getString("attempt").equals(next.getString("attempt")) || !old.getString("mode").equals(next.getString("mode")) || !old.getString("placement").equals(next.getString("placement")))) throw new IOException("Conflicting receipt identity");
        rows.put(next.getString("id"), next);
    }
    private LinkedHashMap<String, JSONObject> read() throws Exception {
        LinkedHashMap<String, JSONObject> rows = new LinkedHashMap<>(); String raw = disk.read();
        if (raw == null) return rows;
        JSONObject root = new JSONObject(raw);
        if (root.has("schema")) { merge(rows, root); return rows; }
        if (!(root.opt("version") instanceof Number) || ((Number)root.opt("version")).doubleValue() != 2) throw new IOException("Unsupported receipt journal");
        JSONArray values = root.getJSONArray("receipts");
        for (int i = 0; i < values.length(); i++) merge(rows, values.getJSONObject(i));
        return rows;
    }
    private JSONArray array(LinkedHashMap<String, JSONObject> rows) throws Exception {
        JSONArray result = new JSONArray(); for (JSONObject row : rows.values()) result.put(new JSONObject(row.toString())); return result;
    }
    private void save(LinkedHashMap<String, JSONObject> rows) throws Exception {
        if (rows.isEmpty()) { disk.delete(); if (disk.read() != null) throw new IOException("Receipt deletion failed"); return; }
        String raw = new JSONObject().put("version", 2).put("receipts", array(rows)).toString();
        disk.write(raw); if (!raw.equals(disk.read())) throw new IOException("Receipt verification failed");
    }
    private LinkedHashMap<String, JSONObject> reconcile() throws Exception {
        LinkedHashMap<String, JSONObject> rows = read();
        if (!memory.unconfirmed.isEmpty()) {
            for (JSONObject pending : memory.unconfirmed.values()) merge(rows, pending);
            save(rows); memory.unconfirmed.clear();
        }
        return rows;
    }
    JSONArray pending() throws Exception { synchronized (memory) { return array(reconcile()); } }
    void record(JSONObject value) throws Exception { synchronized (memory) {
        merge(memory.unconfirmed, value); // retain before touching a potentially failing disk
        reconcile();
    } }
    void acknowledge(String id) throws Exception { synchronized (memory) {
        LinkedHashMap<String, JSONObject> rows = reconcile();
        if (rows.isEmpty()) return;
        if (rows.remove(id) == null) throw new IOException("Receipt mismatch");
        save(rows);
    } }
}
