"""Build the small synchronous PCM bank from Kenney originals. Offline only.
Usage: python tools/audio/build-bank.py /path/to/assets-sfx-ui
Source mirror revision and SHA-256s are recorded in the generated manifest.
Requires ffmpeg and numpy; never runs in the application or normal build.
"""
import base64, hashlib, json, subprocess, sys
from pathlib import Path
import numpy as np
root=Path(sys.argv[1]); rate=22050
recipes={
 'tap':('ui-audio','click2',.9,1800,.13),
 'remove':('interface-sounds','drop_003',1,1800,.19),
 'air':('interface-sounds','scroll_003',1,1200,.12),
 'error':('interface-sounds','bong_001',.82,1500,.18),
 'hint':('interface-sounds','confirmation_001',1,1800,.32),
 'life':('interface-sounds','confirmation_004',.92,1800,.56),
 'win':('interface-sounds','confirmation_004',1,2100,.58),
 'glint':('interface-sounds','glass_001',.78,1800,.38),
}
clips={}; provenance={}; waves={}
for name,(pack,file,speed,cutoff,length) in recipes.items():
 source=root/'assets/kenney'/pack/'Audio'/(file+'.ogg')
 pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-af',f'asetrate=44100*{speed},aresample={rate},highpass=f=100,lowpass=f={cutoff}:p=2','-ac','1','-ar',str(rate),'-f','f32le','-'])
 a=np.frombuffer(pcm,dtype='<f4').copy(); nonzero=np.flatnonzero(abs(a)>.001)
 if len(nonzero):a=a[max(0,int(nonzero[0]) - 22):]
 n=min(len(a),round(length*rate));a=a[:n];a-=a.mean()
 attack=min(round(.004*rate),n);release=min(round(.035*rate),n)
 a[:attack]*=np.linspace(0,1,attack);a[-release:]*=np.linspace(1,0,release)
 a*=.18/max(float(np.max(abs(a))),.001);waves[name]=a
 provenance[name]={'pack':pack,'file':file+'.ogg','originalSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'speed':speed,'highpassHz':100,'lowpassHz':cutoff,'maxSeconds':length,'fadeInMs':4,'fadeOutMs':35}
# A restrained extra glass accent identifies flawless without an arcade tune.
a=np.zeros(round(.74*rate),dtype=np.float32);a[:len(waves['win'])]+=waves['win']*.8
offset=round(.18*rate);g=waves['glint'];a[offset:offset+len(g)]+=g*.32
a*=.18/max(float(np.max(abs(a))),.001);waves['perfect']=a;provenance['perfect']={'mix':'win × .8 + glint × .32 at180ms; peak .18'}
for name,a in waves.items():
 pcm=np.rint(a*32767).astype('<i2').tobytes();clips[name]=base64.b64encode(pcm).decode();provenance[name]['derivedPcmSha256']=hashlib.sha256(pcm).hexdigest();provenance[name]['frames']=len(a)
Path('src/platform/soundBank.json').write_text(json.dumps({'sampleRate':rate,'clips':clips},separators=(',',':'))+'\n')
Path('tools/audio/manifest.json').write_text(json.dumps({'author':'Kenney','license':'CC0-1.0','sources':['https://kenney.nl/assets/ui-audio','https://kenney.nl/assets/interface-sounds'],'retrievedFrom':'https://github.com/GeorgeQLe/assets-sfx-ui','mirrorRevision':'760afd035e8fc3cd7fb5bc58d49a967649875e3e','format':'mono PCM16LE, base64,22050Hz','ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0],'clips':provenance},indent=2)+'\n')
print('Bank:',sum(len(v) for v in clips.values()),'base64 bytes')
