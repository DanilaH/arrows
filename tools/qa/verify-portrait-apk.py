"""Verify the actual signed0.32.1 APK and the portrait manifest policy.

QA dependency: pip install --target .test-output/apk-python androguard
Input: .test-output/portrait-0321/{playtest,verification,native-tests}.zip
"""
import argparse
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path('.test-output/apk-python').resolve()))
from loguru import logger
logger.remove()
from androguard.core.apk import APK
from androguard.core.dex import DEX

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--workflow', type=int, required=True)
args = parser.parse_args()
assert re.fullmatch('[a-f0-9]{40}', args.source)
root = Path('.test-output/portrait-0321')
with zipfile.ZipFile(root / 'playtest.zip') as archive:
    names = [n for n in archive.namelist() if n.endswith('.apk')]
    assert len(names) == 1
    path = root / 'Arrows-0.32.1-playtest.apk'
    path.write_bytes(archive.read(names[0]))
proof = {}
with zipfile.ZipFile(root / 'verification.zip') as archive:
    for n in archive.namelist():
        if not n.endswith('/'):
            proof[Path(n).name] = archive.read(n).decode()
sha = hashlib.sha256(path.read_bytes()).hexdigest()
assert proof['apk.sha256'].split()[0] == sha
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in proof['signing.txt']
cert = re.search(r'Signer #1 certificate SHA-256 digest: ([a-fA-F0-9:]+)', proof['signing.txt'])[1].replace(':', '').lower()
before = json.loads(Path('docs/evidence/ui-ux-032/build-verification.json').read_text())
assert cert == before['signature']['certificateSha256']
apk = APK(str(path))
assert apk.get_package() == 'com.danilah.arrows.playtest'
assert apk.get_androidversion_name() == '0.32.1'
assert apk.get_androidversion_code() == '46'
ns = '{http://schemas.android.com/apk/res/android}'
manifest = apk.get_android_manifest_xml()
application = manifest.find('application')
main = next(a for a in application.findall('activity') if a.get(ns+'name') == 'com.danilah.arrows.MainActivity')
assert main.get(ns+'screenOrientation') in ['portrait', '1', '0x1', '0x00000001']
assert application.get(ns+'appCategory') in ['game', '0', '0x0', '0x00000000']
fields = {}
for data in apk.get_all_dex():
    for cls in DEX(data).get_classes():
        if cls.get_name() == 'Lcom/danilah/arrows/BuildConfig;':
            for field in cls.get_fields():
                if field.get_init_value() is not None:
                    fields[field.get_name()] = field.get_init_value().get_value()
assert fields['AD_MODE'] == 'test'
assert fields['REWARDED_AD_UNIT_ID'] == 'demo-rewarded-yandex'
assert fields['INTERSTITIAL_AD_UNIT_ID'] == 'demo-interstitial-yandex'
assert fields['ANALYTICS_API_KEY'] == ''
payload = {}
with zipfile.ZipFile(path) as archive:
    for n in archive.namelist():
        if n.startswith('assets/public/') and not n.endswith('/'):
            payload[n.removeprefix('assets/public/')] = hashlib.sha256(archive.read(n)).hexdigest()
old = json.loads(Path('docs/evidence/ui-ux-032/capture-manifest.json').read_text())['payload']
assert payload == old, 'A portrait-only native change must preserve the tested web payload'
with zipfile.ZipFile(root / 'native-tests.zip') as archive:
    tests = [ET.fromstring(archive.read(n)) for n in archive.namelist() if n.endswith('.xml')]
totals = {k: sum(int(t.get(k, 0)) for t in tests) for k in ['tests', 'failures', 'errors', 'skipped']}
assert totals == {'tests': 19, 'failures': 0, 'errors': 0, 'skipped': 0}
result = {'source': args.source, 'workflow': args.workflow, 'package': apk.get_package(), 'versionName': '0.32.1', 'versionCode': 46,
          'bytes': path.stat().st_size, 'apkSha256': sha, 'officialV2Verified': True, 'certificateSha256': cert, 'sameCertificateAs032': True,
          'mainActivityOrientation': 'portrait', 'appCategory': 'game', 'targetSdk': apk.get_target_sdk_version(),
          'ads': 'test / Yandex demo rewarded+interstitial', 'analyticsKeyEmpty': True,
          'publicWebFiles': len(payload), 'webByteIdenticalTo032': True, 'nativeTests': totals,
          'runtimeRotationLaunchResumePhone': 'NOT RUN; packaged manifest verified, not physical or emulator behavior'}
(root / 'verification.json').write_text(json.dumps(result, indent=2)+'\n')
for name, body in proof.items():
    (root / name).write_text(body)
print(json.dumps(result, indent=2))
