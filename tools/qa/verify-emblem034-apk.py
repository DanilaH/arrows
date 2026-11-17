"""Verify the actual signed0.34 APK, update identity/config and capture payload.

Inputs: .test-output/home-emblem/{playtest,verification,native-tests}.zip
QA dependency: .test-output/apk-python/androguard (not part of the game).
"""
import argparse
import hashlib
import json
import re
import shutil
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
parser.add_argument('--application', required=True)
parser.add_argument('--workflow', required=True, type=int)
args = parser.parse_args()
assert re.fullmatch('[a-f0-9]{40}', args.source)
assert re.fullmatch('[a-f0-9]{40}', args.application)
root = Path('.test-output/home-emblem')
with zipfile.ZipFile(root / 'playtest.zip') as archive:
    names = [n for n in archive.namelist() if n.endswith('.apk')]
    assert len(names) == 1
    apk_path = root / 'Arrows-0.34.0-playtest.apk'
    apk_path.write_bytes(archive.read(names[0]))
with zipfile.ZipFile(root / 'verification.zip') as archive:
    proof = {Path(n).name: archive.read(n).decode() for n in archive.namelist() if not n.endswith('/')}
digest = hashlib.sha256(apk_path.read_bytes()).hexdigest()
assert digest == proof['apk.sha256'].split()[0]
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in proof['signing.txt']
cert = re.search(r'Signer #1 certificate SHA-256 digest: ([a-fA-F0-9:]+)', proof['signing.txt'])[1].replace(':', '').lower()
old = json.loads(Path('docs/evidence/ui-composition-033/verification.json').read_text())
assert cert == old['certificateSha256']
apk = APK(str(apk_path))
assert apk.get_package() == old['package'] == 'com.danilah.arrows.playtest'
assert apk.get_androidversion_name() == '0.34.0'
assert apk.get_androidversion_code() == '48'
ns = '{http://schemas.android.com/apk/res/android}'
application = apk.get_android_manifest_xml().find('application')
main = next(a for a in application.findall('activity') if a.get(ns+'name') == 'com.danilah.arrows.MainActivity')
assert main.get(ns+'screenOrientation') in ['portrait','1','0x1','0x00000001']
assert application.get(ns+'appCategory') in ['game','0','0x0','0x00000000']
assert 'screenOrientation' in proof['manifest-tree.txt'] and 'appCategory' in proof['manifest-tree.txt']
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
web = root / 'web'
if web.exists():
    assert not web.is_symlink() and web.resolve().is_relative_to(root.resolve())
    shutil.rmtree(web)  # Owned, reproducible APK extraction; never keep old hashed chunks.
web.mkdir(exist_ok=True)
with zipfile.ZipFile(apk_path) as archive:
    for name in archive.namelist():
        if not name.startswith('assets/public/') or name.endswith('/'):
            continue
        relative = name.removeprefix('assets/public/')
        assert not Path(relative).is_absolute() and '..' not in Path(relative).parts
        data = archive.read(name)
        target = web / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        payload[relative] = hashlib.sha256(data).hexdigest()
assert len(payload) == 28
assert set(str(p.relative_to(web)) for p in web.rglob('*') if p.is_file()) == set(payload), 'Stale extracted files must not enter the capture'
for name in ['cordova.js','cordova_plugins.js']:
    assert (web / name).read_bytes() == b''
matched = []
for local in Path('dist').rglob('*'):
    if local.is_file():
        relative = str(local.relative_to('dist'))
        assert hashlib.sha256(local.read_bytes()).hexdigest() == payload[relative], relative
        matched.append(relative)
before = json.loads(Path('docs/evidence/ui-composition-033/recordings.json').read_text())['payload']
stable = [n for n in payload if n.startswith(('audio/','fonts/','ui/')) or n in ['brand-mark.svg','favicon.svg']]
for name in stable:
    assert payload[name] == before[name], name
with zipfile.ZipFile(root / 'native-tests.zip') as archive:
    tests = [ET.fromstring(archive.read(n)) for n in archive.namelist() if n.endswith('.xml')]
totals = {k: sum(int(t.get(k,0)) for t in tests) for k in ['tests','failures','errors','skipped']}
assert totals == {'tests':19,'failures':0,'errors':0,'skipped':0}
result = {'source':args.source,'application':args.application,'workflow':args.workflow,
          'package':apk.get_package(),'versionName':'0.34.0','versionCode':48,'bytes':apk_path.stat().st_size,'apkSha256':digest,
          'certificateSha256':cert,'officialSdkV2Verified':True,'sameCertificateAs033':True,
          'mainActivityOrientation':'portrait','appCategory':'game','ads':'Yandex demo rewarded/interstitial','analyticsKeyEmpty':True,
          'publicWebFiles':len(payload),'matchedLocalDistFiles':matched,'unchangedArtworkAudioFonts':stable,'nativeTests':totals,
          'physicalInstallUpdateRotationHapticsFps':'NOT RUN','realSdkMoneyAppMetrica':'NOT RUN'}
(root / 'build-verification.json').write_text(json.dumps(result,indent=2)+'\n')
for name,body in proof.items():
    (root / name).write_text(body)
manifest={'source':args.source,'application':result['application'],'version':'0.34.0/code48','apkSha256':digest,'payload':payload,
          'method':'Actual signed APK web in Chromium; prepared QA/controlled native transport; portrait; not Android/SDK footage','clips':[]}
(root / 'capture-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if not isinstance(v,list)},indent=2))
