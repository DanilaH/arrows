package com.danilah.arrows;

import android.content.Context;
import android.util.AtomicFile;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

/** AtomicFile adapter. Shared memory/lock survives overlapping Activity owners. */
final class RewardJournal {
    private static final RewardJournalCore.Memory MEMORY = new RewardJournalCore.Memory();
    private final RewardJournalCore core;
    RewardJournal(Context context) {
        AtomicFile file = new AtomicFile(new File(context.getNoBackupFilesDir(), "arrows-earned-v1.json"));
        core = new RewardJournalCore(new RewardJournalCore.Disk() {
            public String read() throws Exception {
                try { return new String(file.readFully(), StandardCharsets.UTF_8); }
                catch (FileNotFoundException absent) { if (file.getBaseFile().exists() || new File(file.getBaseFile() + ".bak").exists()) throw absent; return null; }
            }
            public void write(String raw) throws Exception {
                FileOutputStream out = null;
                try { out = file.startWrite(); out.write(raw.getBytes(StandardCharsets.UTF_8)); file.finishWrite(out); out = null; }
                catch (Exception error) { if (out != null) file.failWrite(out); throw error; }
            }
            public void delete() { file.delete(); }
        }, MEMORY);
    }
    JSONArray pending() throws Exception { return core.pending(); }
    void record(JSONObject value) throws Exception { core.record(value); }
    void acknowledge(String id) throws Exception { core.acknowledge(id); }
}
