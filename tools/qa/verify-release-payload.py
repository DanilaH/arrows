#!/usr/bin/env python3
"""Official Android tools + exact ZIP payload checks. Never a device/SDK claim."""
import argparse, hashlib, json, os, re, subprocess, tempfile, zipfile
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('apk', type=Path)
p.add_argument('--kind', choices=['release', 'releasecheck'], required=True)
p.add_argument('--out', type=Path, required=True)
a = p.parse_args()
a.out.mkdir(parents=True, exist_ok=True)
sdk = Path(os.environ['ANDROID_HOME']) / 'build-tools' / '36.0.0'
def run(name, *args):
    return subprocess.check_output([str(sdk / name), *map(str,args)], text=True, errors='replace', stderr=subprocess.STDOUT)
sign = run('apksigner', 'verify', '--verbose', '--print-certs', a.apk)
cert = re.search(r'Signer #1 certificate SHA-256 digest: ([a-fA-F0-9:]+)', sign)[1].replace(':','').lower()
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in sign
if a.kind == 'release': assert cert == os.environ['ARROWS_RELEASE_CERT_SHA256'].lower()
alignment = run('zipalign', '-c', '-P', '16', '4', a.apk)
manifest = run('aapt', 'dump', 'badging', a.apk)
tree = run('aapt', 'dump', 'xmltree', a.apk, 'AndroidManifest.xml')
package = 'com.danilah.arrows' + ('.releasecheck' if a.kind == 'releasecheck' else '')
assert f"package: name='{package}'" in manifest
assert "versionCode='53'" in manifest and "versionName='0.37.1'" in manifest
assert 'application-debuggable' not in manifest
assert re.search(r'android:screenOrientation[^\n]*\(type 0x10\)0x1(?:\s|$)', tree)
files = {}
with zipfile.ZipFile(a.apk) as z:
    public = {n.removeprefix('assets/public/'): n for n in z.namelist() if n.startswith('assets/public/') and not n.endswith('/')}
    assert 'target-lab.html' not in public and 'content-pilot.html' not in public
    assert json.loads(z.read(public['arrows-build.json']))['channel'] == 'release'
    assert z.read('assets/arrows-analytics-contract.json') == Path('src/platform/analytics-contract.json').read_bytes()
    for path in Path('dist').rglob('*'):
        if path.is_file():
            relative = path.relative_to('dist').as_posix()
            assert relative in public and z.read(public[relative]) == path.read_bytes(), relative
            files[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    assert set(public)-set(files) <= {'cordova.js','cordova_plugins.js'}
    # Official dexdump inspects the optimizer's output, not pre-R8 class files.
    dex=[]; dex_bytes=[]
    with tempfile.TemporaryDirectory() as t:
        for name in z.namelist():
            if re.fullmatch(r'classes\d*\.dex', name):
                path=Path(t)/name;data=z.read(name);dex_bytes.append(data);path.write_bytes(data);dex.append(run('dexdump',path))
    output='\n'.join(dex)
    for cls, methods in {
        'ArrowsAdsPlugin':['show','pending','acknowledge','status','prepareRewarded'],
        'ArrowsAnalyticsPlugin':['report','flush','status'],
        'ArrowsStoragePlugin':['get','set','remove','list'],
        'ArrowsFeedbackPlugin':['pulse','cancel'],
    }.items():
        blocks=[b for b in re.split(r'(?=Class #\d+)',output) if re.search(r"Class descriptor\s*:\s*'Lcom/danilah/arrows/"+cls+";'",b)]
        assert blocks, cls
        for method in methods: assert any(re.search(r"name\s*:\s*'"+method+"'",b) for b in blocks), (cls,method)
    expected={'AD_MODE':'test','REWARDED_AD_UNIT_ID':'demo-rewarded-yandex','INTERSTITIAL_AD_UNIT_ID':'demo-interstitial-yandex','ANALYTICS_API_KEY':''} if a.kind=='releasecheck' else {'AD_MODE':'live','REWARDED_AD_UNIT_ID':os.environ['YANDEX_REWARDED_AD_UNIT_ID'],'INTERSTITIAL_AD_UNIT_ID':os.environ['YANDEX_INTERSTITIAL_AD_UNIT_ID'],'ANALYTICS_API_KEY':os.environ['APPMETRICA_API_KEY']}
    config=Path('native/android/app/build/generated/source/buildConfig')/('releaseCheck' if a.kind=='releasecheck' else 'release')/'com/danilah/arrows/BuildConfig.java'
    config_text=config.read_text()
    for field,value in expected.items():
        assert f'{field} = {json.dumps(value)};' in config_text, field
        if field in ['REWARDED_AD_UNIT_ID','INTERSTITIAL_AD_UNIT_ID','ANALYTICS_API_KEY'] and value: assert any(value.encode() in data for data in dex_bytes), field
mapping=Path('native/android/app/build/outputs/mapping')/('releaseCheck' if a.kind=='releasecheck' else 'release')/'mapping.txt'
assert mapping.is_file() and mapping.stat().st_size>1000
for name,body in [('signing.txt',sign),('badging.txt',manifest),('manifest-tree.txt',tree),('alignment.txt',alignment)]: (a.out/name).write_text(body)
report={'kind':a.kind,'package':package,'version':'0.37.1','versionCode':53,'bytes':a.apk.stat().st_size,'sha256':hashlib.sha256(a.apk.read_bytes()).hexdigest(),'certificateSha256':cert,'v2':True,'debuggable':False,'zipalign16k':True,'shrunkMapping':{'bytes':mapping.stat().st_size,'sha256':hashlib.sha256(mapping.read_bytes()).hexdigest()},'webPayload':files,'contractSha256':hashlib.sha256(Path('src/platform/analytics-contract.json').read_bytes()).hexdigest(),'source':os.environ.get('GITHUB_SHA','local'),'physicalRuntime':'NOT RUN','services':'NOT RUN','productionSigner':a.kind=='release'}
(a.out/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='webPayload'},indent=2))
