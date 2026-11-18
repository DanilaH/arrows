"""Inspect the exact0.39.2 playtest, compatible signer and native/web payload."""
import hashlib,json,re,sys,zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
sys.path.insert(0,str(Path('.test-output/apk-python').resolve()))
from loguru import logger
logger.remove()
from androguard.core.apk import APK
from androguard.core.dex import DEX
root=Path('.test-output/banner0392')
source=sys.argv[1]
assert re.fullmatch('[a-f0-9]{40}',source)
apk_path=Path('../deliverables/Arrows-0.39.2.apk')
with zipfile.ZipFile(root/'playtest.zip') as z:
    entries=[n for n in z.namelist() if n.endswith('.apk')]
    assert len(entries)==1
    apk_path.write_bytes(z.read(entries[0]))
with zipfile.ZipFile(root/'verification.zip') as z:
    proof={Path(n).name:z.read(n).decode() for n in z.namelist() if not n.endswith('/')}
digest=hashlib.sha256(apk_path.read_bytes()).hexdigest()
assert proof['apk.sha256'].split()[0]==digest
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in proof['signing.txt']
cert=re.search(r'Signer #1 certificate SHA-256 digest: ([a-fA-F0-9:]+)',proof['signing.txt'])[1].replace(':','').lower()
previous=json.loads(Path('.test-output/banner039/build-verification.json').read_text())
assert cert==previous['certificateSha256']
apk=APK(str(apk_path))
assert apk.get_package()=='com.danilah.arrows.playtest'
assert apk.get_androidversion_name()=='0.39.2' and apk.get_androidversion_code()=='58'
ns='{http://schemas.android.com/apk/res/android}'
application=apk.get_android_manifest_xml().find('application')
main=next(a for a in application.findall('activity') if a.get(ns+'name')=='com.danilah.arrows.MainActivity')
assert main.get(ns+'screenOrientation') in ['portrait','1','0x1','0x00000001']
old_apk=APK('../deliverables/Arrows-0.39.0.apk')
assert set(apk.get_permissions())==set(old_apk.get_permissions())
fields={};native_methods={}
for data in apk.get_all_dex():
    for cls in DEX(data).get_classes():
        if cls.get_name()=='Lcom/danilah/arrows/BuildConfig;':
            fields={f.get_name():f.get_init_value().get_value() for f in cls.get_fields() if f.get_init_value() is not None}
        if cls.get_name()=='Lcom/danilah/arrows/ArrowsBannerPlugin;':native_methods={m.get_name() for m in cls.get_methods()}
assert {'measure','apply','destroy'}.issubset(native_methods)
for name,value in {'AD_MODE':'test','REWARDED_AD_UNIT_ID':'demo-rewarded-yandex','INTERSTITIAL_AD_UNIT_ID':'demo-interstitial-yandex','BANNER_AD_UNIT_ID':'demo-banner-yandex','ANALYTICS_API_KEY':''}.items():assert fields[name]==value
payload={}
with zipfile.ZipFile(apk_path) as z:
    for name in z.namelist():
        if name.startswith('assets/public/') and not name.endswith('/'):
            relative=name.removeprefix('assets/public/');data=z.read(name)
            assert '..' not in Path(relative).parts
            local=Path('native/android/app/src/main/assets/public')/relative
            assert local.read_bytes()==data,relative
            target=root/'web'/relative;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
            payload[relative]=hashlib.sha256(data).hexdigest()
    schema=z.read('assets/arrows-analytics-contract.json')
assert schema==Path('src/platform/analytics-contract.json').read_bytes()
with zipfile.ZipFile(root/'native-tests.zip') as z:
    tests=[ET.fromstring(z.read(n)) for n in z.namelist() if n.endswith('.xml')]
totals={k:sum(int(t.get(k,0)) for t in tests) for k in ['tests','failures','errors','skipped']}
assert totals=={'tests':31,'failures':0,'errors':0,'skipped':0},totals
report={'source':source,'version':'0.39.2','versionCode':58,'package':apk.get_package(),'apkSha256':digest,'apkBytes':apk_path.stat().st_size,'certificateSha256':cert,'v2':True,'permissionsUnchanged':True,'jvm':totals,'webFiles':payload,'contractSha256':hashlib.sha256(schema).hexdigest(),'testAds':True,'analytics':'OFF'}
(root/'build-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='webFiles'},indent=2))
