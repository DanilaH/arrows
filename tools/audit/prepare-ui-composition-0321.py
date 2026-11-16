"""Extract only the verified signed 0.32.1 APK's web payload for the UI audit."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("apk", type=Path)
args = parser.parse_args()
proof = json.loads((root / "docs/evidence/portrait-0321/verification.json").read_text())
expected = json.loads((root / "docs/evidence/ui-ux-032/capture-manifest.json").read_text())["payload"]
digest = hashlib.sha256(args.apk.read_bytes()).hexdigest()
assert digest == proof["apkSha256"], "This audit is archived for the exact signed 0.32.1 APK."
out = root / ".test-output/ui-composition-0321"
with ZipFile(args.apk) as archive:
    files = {n.removeprefix("assets/public/"): archive.read(n) for n in archive.namelist()
             if n.startswith("assets/public/") and not n.endswith("/")}
assert {n: hashlib.sha256(b).hexdigest() for n, b in files.items()} == expected
for name, data in files.items():
    target = out / "web" / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
source = {
    "head": "21736b58e2ddd7e9ff9fe50a64e35ba64a064230",
    "application": proof["source"], "apkSha256": digest,
    "version": "0.32.1/code46", "payload": expected,
    "environment": "Real signed APK web in Chromium, portrait, DPR1.5; seeded progress and controlled native transport; not a phone",
}
(out / "source.json").write_text(json.dumps(source, indent=2) + "\n")
print(f"Verified and extracted all {len(files)} signed-APK web files.")
