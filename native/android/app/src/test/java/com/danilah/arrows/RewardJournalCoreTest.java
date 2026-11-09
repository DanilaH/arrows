package com.danilah.arrows;

import org.junit.Test;
import org.json.JSONObject;
import static org.junit.Assert.*;

public class RewardJournalCoreTest {
    private static final class Disk implements RewardJournalCore.Disk {
        String raw; boolean failWrite, failAfterWrite, failDelete;
        public String read() { return raw; }
        public void write(String value) throws Exception { if (failWrite) throw new Exception("disk unavailable"); raw = value; if (failAfterWrite) throw new Exception("lost result"); }
        public void delete() { if (!failDelete) raw = null; }
    }
    private JSONObject receipt(String id) throws Exception { return new JSONObject().put("schema", 1).put("id", id).put("attempt", "original-attempt").put("mode", "daily").put("placement", "hint"); }
    @Test public void migratesLegacyAndPreservesAnotherLateAwardOnExactAck() throws Exception {
        Disk disk = new Disk(); disk.raw = receipt("old").toString();
        RewardJournalCore queue = new RewardJournalCore(disk, new RewardJournalCore.Memory());
        queue.record(receipt("late")); queue.acknowledge("old");
        assertEquals("late", queue.pending().getJSONObject(0).getString("id"));
        queue.acknowledge("late"); assertEquals(0, queue.pending().length());
    }
    @Test public void sharesUnconfirmedCallbacksAcrossOwnersAndDeduplicatesAmbiguousWrites() throws Exception {
        Disk disk = new Disk(); RewardJournalCore.Memory memory = new RewardJournalCore.Memory();
        RewardJournalCore first = new RewardJournalCore(disk, memory); disk.failAfterWrite = true;
        assertThrows(Exception.class, () -> first.record(receipt("earned")));
        disk.failAfterWrite = false; RewardJournalCore second = new RewardJournalCore(disk, memory);
        second.record(receipt("newer")); assertEquals(2, second.pending().length());
        second.record(receipt("earned")); assertEquals(2, second.pending().length());
    }
    @Test public void retainsAllEarnedCallbacksWhenStorageFailsBeforeWriting() throws Exception {
        Disk disk = new Disk(); disk.failWrite = true; RewardJournalCore.Memory memory = new RewardJournalCore.Memory();
        RewardJournalCore queue = new RewardJournalCore(disk, memory);
        assertThrows(Exception.class, () -> queue.record(receipt("one"))); assertThrows(Exception.class, () -> queue.record(receipt("two")));
        disk.failWrite = false; assertEquals(2, new RewardJournalCore(disk, memory).pending().length());
    }
    @Test public void rejectsWrongAcknowledgementAndRetainsFailedDeletionForRetry() throws Exception {
        Disk disk = new Disk(); RewardJournalCore queue = new RewardJournalCore(disk, new RewardJournalCore.Memory()); queue.record(receipt("right"));
        assertThrows(Exception.class, () -> queue.acknowledge("wrong")); assertEquals(1, queue.pending().length());
        disk.failDelete = true; assertThrows(Exception.class, () -> queue.acknowledge("right")); assertEquals(1, queue.pending().length());
        disk.failDelete = false; queue.acknowledge("right"); queue.acknowledge("right");
    }
    @Test public void neverOverwritesCorruptDiskAndRetainsCallbackForRecovery() throws Exception {
        Disk disk = new Disk(); disk.raw = "corrupt"; RewardJournalCore queue = new RewardJournalCore(disk, new RewardJournalCore.Memory());
        assertThrows(Exception.class, () -> queue.record(receipt("retained"))); assertEquals("corrupt", disk.raw);
        disk.raw = null; assertEquals("retained", queue.pending().getJSONObject(0).getString("id"));
    }
}
