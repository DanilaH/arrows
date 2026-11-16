"""Inspect the signed CI APK and SDK proof, then expose its exact web bytes.

QA dependency: pip install --target .test-output/apk-python androguard
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

args = argparse.ArgumentParser()
args.add_argument('--source', required=True)
args.add_argument('--workflow', required=True, type=int)
options = args.parse_args()
assert re.fullmatch('[a-f0-9]{40}', options.source)
root = Path('.test-output/cascade-primary-031')
with zipfile.ZipFile(root / 'playtest.zip') as archive:
    apks = [n for n in archive.namelist() if n.endswith('.apk')]
    assert len(apks) == 1
    path = root / 'Arrows-0.31.0-playtest.apk'
    path.write_bytes(archive.read(apks[0]))
verify = root / 'verify'
verify.mkdir(exist_ok=True)
for name in ['verification', 'native-tests']:
    destination = verify / name
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir()
    with zipfile.ZipFile(root / f'{name}.zip') as archive:
        archive.extractall(destination)
def proof(name):
    files = list((verify / 'verification').rglob(name))
    assert len(files) == 1
    return files[0].read_text()

sha = hashlib.sha256(path.read_bytes()).hexdigest()
assert proof('apk.sha256').split()[0] == sha
signing = proof('signing.txt')
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in signing
certificate = re.search(r'Signer #1 certificate SHA-256 digest: ([a-fA-F0-9:]+)', signing)[1].replace(':', '').lower()
previous = json.loads(Path('docs/evidence/content-rollout-030/build-verification.json').read_text())
assert certificate == previous['signature']['certificateSha256']
apk = APK(str(path))
assert apk.get_package() == 'com.danilah.arrows.playtest'
assert apk.get_androidversion_name() == '0.31.0'
assert apk.get_androidversion_code() == '44'
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
assert fields['ANALYTICS_API_KEY'] == '', 'Analytics must be disabled'
web = root / 'web'
if web.exists():
    shutil.rmtree(web)
web.mkdir()
payload = {}
with zipfile.ZipFile(path) as archive:
    for name in archive.namelist():
        if name.startswith('assets/public/') and not name.endswith('/'):
            relative = name.removeprefix('assets/public/')
            assert '..' not in Path(relative).parts
            file = web / relative
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(archive.read(name))
            payload[relative] = hashlib.sha256(file.read_bytes()).hexdigest()
for name in ['cordova.js', 'cordova_plugins.js']:
    assert (web / name).read_bytes() == b''
matched = []
for file in Path('dist').rglob('*'):
    if file.is_file():
        relative = str(file.relative_to('dist'))
        assert file.read_bytes() == (web / relative).read_bytes(), relative
        matched.append(relative)
old = json.loads(Path('docs/evidence/content-rollout-030/capture-manifest.json').read_text())
before = []
for file in (root / 'before-web').rglob('*'):
    if file.is_file():
        relative = str(file.relative_to(root / 'before-web'))
        assert hashlib.sha256(file.read_bytes()).hexdigest() == old['payload'][relative]
        before.append(relative)
rows = [ET.parse(p).getroot() for p in (verify / 'native-tests').rglob('*.xml')]
native = {k: sum(int(r.attrib.get(k, 0)) for r in rows) for k in ['tests', 'failures', 'errors', 'skipped']}
assert native == {'tests': 19, 'failures': 0, 'errors': 0, 'skipped': 0}
result = {'source': options.source, 'workflow': options.workflow, 'package': apk.get_package(),
          'versionName': apk.get_androidversion_name(), 'versionCode': 44,
          'bytes': path.stat().st_size, 'apkSha256': sha,
          'signature': {'officialSdkV2Verified': True, 'certificateSha256': certificate, 'sameAs030': True},
          'config': {'AD_MODE': 'test', 'REWARDED_AD_UNIT_ID': fields['REWARDED_AD_UNIT_ID'],
                     'INTERSTITIAL_AD_UNIT_ID': fields['INTERSTITIAL_AD_UNIT_ID'], 'analyticsKeyEmpty': True},
          'nativeTests': native, 'matchedWebFiles': matched, 'allPublicFiles': len(payload),
          'beforeSource': '2e1cfeb3809727d20312cfdd729370f82b7fad94', 'beforeMatchedPreviousApkFiles': before}
(root / 'build-verification.json').write_text(json.dumps(result, indent=2) + '\n')
manifest = {'source': options.source, 'version': '0.31.0/code44',
            'beforeSource': result['beforeSource'], 'beforeMatchedPreviousApkFiles': before,
            'method': 'Actual final signed-APK web in Chromium390x844/DPR1.5. Before reconstructed web byte-matches previous signed0.30APK. Prepared progress and controlled reward transport, no physical-phone/SDK footage.',
            'payload': payload, 'localDistMatched': matched, 'clips': []}
(root / 'capture-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k not in ['matchedWebFiles', 'beforeMatchedPreviousApkFiles']}, indent=2))
print('Web matched:', len(matched), 'before matched:', len(before))
