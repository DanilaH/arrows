#!/usr/bin/env python3
"""Install the exact production artifact offline; inspect Android UI without a debug bridge."""
import hashlib,json,os,re,subprocess,sys,time
import xml.etree.ElementTree as ET
from pathlib import Path

apk=Path(sys.argv[1]);out=Path('.test-output/store-runtime');out.mkdir(parents=True,exist_ok=True)
package='com.danilah.arrows'
class UiNotReady(Exception):pass
def adb(*args):return subprocess.check_output(['adb',*args],stderr=subprocess.STDOUT)
def shell(*args):return adb('shell',*args).decode(errors='replace').strip()
def snapshot(name):
    shell('uiautomator','dump','/sdcard/arrows-window.xml')
    raw=adb('exec-out','cat','/sdcard/arrows-window.xml');(out/(name+'.xml')).write_bytes(raw)
    if not raw.lstrip().startswith(b'<?xml'):raise UiNotReady('Android has not published its hierarchy yet')
    return ET.fromstring(raw)
def find(tree,labels):
    return next((n for n in tree.iter('node') if any(n.get(k,'').strip() in labels for k in ['text','content-desc']) and n.get('enabled')=='true'),None)
def wait_node(labels,name):
    deadline=time.monotonic()+45
    while time.monotonic()<deadline:
        try:tree=snapshot(name)
        except UiNotReady:
            time.sleep(1);continue
        except subprocess.CalledProcessError as error:
            # Android can reclaim the standalone dump process during cold boot;
            # retry that exact failure within the same bounded readiness wait.
            if error.returncode not in [137,-9]:raise
            print('Android reclaimed UI dump process; waiting for cold start',flush=True)
            time.sleep(1);continue
        node=find(tree,labels)
        if node is not None:return tree,node
        time.sleep(.5)
    raise AssertionError('Expected production control: '+','.join(sorted(labels)))
def tap(node):
    x1,y1,x2,y2=map(int,re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',node.get('bounds')).groups())
    shell('input','tap',str((x1+x2)//2),str((y1+y2)//2))
def screenshot(name):(out/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
def no_debug(tree):
    text=' '.join(n.get(k,'') for n in tree.iter('node') for k in ['text','content-desc']).lower()
    for marker in ['assistance playtest','тестирование помощи','copy startup json','startup diagnostics','first-error accent','локальная qa','лаборатория','laboratory']:
        assert marker not in text,marker

# AOSP userdebug images force WebView inspection on and ignore an app's false
# setting. Use the Play Store user image to test production behavior instead.
assert shell('getprop','ro.build.type')=='user'
assert shell('getprop','ro.debuggable')=='0'
shell('cmd','connectivity','airplane-mode','enable');shell('svc','wifi','disable');shell('svc','data','disable')
assert shell('settings','get','global','airplane_mode_on')=='1'
assert 'Success' in adb('install','-r',str(apk)).decode()
adb('logcat','-c');shell('am','start','-W','-n',package+'/.MainActivity')
home,play=wait_node({'Играть','Play'},'home');no_debug(home);screenshot('home')
# Fresh theme-choice Home intentionally has no navigation/settings yet.
tap(play)
board,settings=wait_node({'Настройки','Settings'},'board');no_debug(board);screenshot('board');tap(settings)
tree,close=wait_node({'Закрыть','Close'},'settings');no_debug(tree);screenshot('settings');tap(close)
tree,_=wait_node({'На главную','Home'},'board-return');no_debug(tree)
pid=shell('pidof',package);assert re.fullmatch(r'\d+',pid)
assert 'webview_devtools_remote_'+pid not in shell('cat','/proc/net/unix')
crashes=adb('logcat','-d','-s','AndroidRuntime:E').decode(errors='replace')
assert 'FATAL EXCEPTION' not in crashes
report={'source':os.environ['ARROWS_RELEASE_SOURCE'],'qaSource':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'apkSha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'package':package,'androidApi':shell('getprop','ro.build.version.sdk'),'installed':True,'offline':True,'screens':['home','settings','board'],'debugControlsAbsent':True,'webViewDebugSocketAbsent':True,'fatalExceptions':False,'provenance':'Exact production-signed APK installed on Android35 emulator, airplane mode before launch, real Android accessibility/input/screenshots. No WebView debug bridge, injected JS, seeded progress or live ad requests. Physical phone/live fill/dashboard acceptance separate.'}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
