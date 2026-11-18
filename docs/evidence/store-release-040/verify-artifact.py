import hashlib,io,json,re,zipfile
from pathlib import Path
from PIL import Image
from loguru import logger
logger.remove()
from androguard.core.apk import APK
from cryptography import x509
from cryptography.hazmat.primitives import hashes

root=Path('.test-output/store040');path=Path('../deliverables/Arrows-0.40.0-store.apk')
official=json.loads(next((root/'verification').rglob('verification.json')).read_text())
digest=hashlib.sha256(path.read_bytes()).hexdigest();assert digest==official['sha256']
assert official['kind']=='release' and official['productionSigner'] and official['source']=='71cca6020cf67daf0f96486c075fd987a10a2a0f'
assert official['v2'] and official['zipalign16k'] and not official['debuggable']
apk=APK(str(path));assert apk.get_package()=='com.danilah.arrows'
assert apk.get_androidversion_name()=='0.40.0' and apk.get_androidversion_code()=='59'
certs=apk.get_certificates_der_v2();assert len(certs)==1
cert=x509.load_der_x509_certificate(certs[0]).fingerprint(hashes.SHA256()).hex()
assert cert==official['certificateSha256']==json.loads(Path('docs/production-signing.json').read_text())['certificateSha256']
manifest=apk.get_android_manifest_xml();ns='{http://schemas.android.com/apk/res/android}'
app=manifest.find('application');assert app.get(ns+'debuggable','false')=='false';assert manifest.find('instrumentation') is None
main=next(x for x in app.findall('activity') if x.get(ns+'name')=='com.danilah.arrows.MainActivity')
assert main.get(ns+'screenOrientation') in ['portrait','1','0x1','0x00000001']
assert {'android.permission.POST_NOTIFICATIONS','android.permission.RECEIVE_BOOT_COMPLETED'}.issubset(apk.get_permissions())
def pixels(data):
 im=Image.open(io.BytesIO(data)).convert('RGBA');rgba=bytearray(im.tobytes())
 # AAPT clears invisible RGB under fully transparent pixels; compare rendered pixels.
 for i in range(0,len(rgba),4):
  if rgba[i+3]==0:rgba[i:i+3]=b'\0\0\0'
 return im.size,hashlib.sha256(rgba).hexdigest()
art={n:pixels(Path('assets/brand/'+n).read_bytes()) for n in ['store-icon.png','launcher-round.png','launcher-foreground.png']}
found=set();web={}
with zipfile.ZipFile(path) as z:
 config=json.loads(z.read('assets/capacitor.config.json'));assert config['android']['webContentsDebuggingEnabled'] is False and config['loggingBehavior']=='debug'
 dex=b''.join(z.read(n) for n in z.namelist() if re.fullmatch(r'classes\d*\.dex',n))
 for marker in [b'LauncherIconTest',b'BannerRuntimeTest']:assert marker not in dex
 live=set(re.findall(rb'R-M-\d+-\d+',dex));assert len(live)>=3
 for n in z.namelist():
  if n.endswith('.png'):
   try:p=pixels(z.read(n))
   except Exception:continue
   found.update(name for name,value in art.items() if value==p)
  if n.startswith('assets/public/') and not n.endswith('/'):
   name=n.removeprefix('assets/public/');data=z.read(n)
   assert name in ['cordova.js','cordova_plugins.js'] or (Path('dist')/name).read_bytes()==data
   web[name]=hashlib.sha256(data).hexdigest()
   if name.endswith('.js'):
    for marker in ['a1-cue-qa-mode','arrows.qa.a1-error-cue.v1','a1-first-error-v1','help-qa-variant','target-lab-open','content-pilot-open','Copy startup JSON']:assert marker.encode() not in data,marker
   target=root/'web'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 assert not {'target-lab.html','content-pilot.html'}&set(web)
 assert b'debug-root' not in z.read('assets/public/index.html')
 assert z.read('assets/arrows-analytics-contract.json')==Path('src/platform/analytics-contract.json').read_bytes()
assert found==set(art),found
tests=[]
import xml.etree.ElementTree as ET
for p in (root/'verification').rglob('TEST-*.xml'):tests.append(ET.parse(p).getroot())
counts={k:sum(int(t.get(k,0)) for t in tests) for k in ['tests','failures','errors','skipped']}
assert counts=={'tests':31,'failures':0,'errors':0,'skipped':0},counts
report={'source':official['source'],'apkSha256':digest,'bytes':path.stat().st_size,'version':'0.40.0','versionCode':59,'package':apk.get_package(),'certificateSha256':cert,'productionSigned':True,'officialV2AndZipalign16k':True,'debuggable':False,'webViewDebugging':False,'liveAdUnitsInDex':len(live),'nativeBrandPixelMatches':sorted(found),'jvm':counts,'webFiles':web,'qaAndLabAbsent':True,'physicalPhone':'NOT RUN','liveServicesAcceptance':'NOT RUN'}
(root/'build-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='webFiles'},indent=2))
