"""Independent input geometry using version-checked cached browser viewport evidence. No human error distribution."""
import json,math,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/audit'))
from campaign_gameplay import graph
levels={l['id']:l for l in json.loads((ROOT/'src/content/campaign.json').read_text())}
evidence=json.loads((ROOT/'docs/verification/GAMEPLAY_BROWSER_AUDIT_2026-11-11.json').read_text())
import hashlib
assert evidence['contentSha256']==hashlib.sha256((ROOT/'src/content/campaign.json').read_bytes()).hexdigest(), 'stale content evidence'
for path,expected in evidence['viewSourceHashes'].items():assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==expected, 'stale viewport evidence: '+path
observations=evidence['observations']
scales={o['level']:o['camera']['scale']for o in observations}
def distance(p,path,scale):
 best=math.inf
 for a,b in zip(path,path[1:]):
  x1,y1=a['x']*scale,a['y']*scale;x2,y2=b['x']*scale,b['y']*scale
  x=max(min(x1,x2),min(max(x1,x2),p[0]));y=max(min(y1,y2),min(max(y1,y2),p[1]));best=min(best,math.hypot(x-p[0],y-p[1]))
 return best
out=[]
for id in ['c01','c06','c18','c20','c45','c60','c75','c100','c120']:
 l=levels[id];deps,_,heads=graph(l)
 for label,scale in [('390-measured',scales[id]),('320-measured' if id=='c20' else '320-width-bound',scales['c20-narrow-after12'] if id=='c20' else min(18 if l['width']<=13 and l['height']<=13 else 30,280/(l['width']+1))),('zoomed-visible-target',20)]:
  rows=[];roots=[i for i,d in enumerate(deps)if not d]
  for r in [0,2,4,6]:
   counts={k:0 for k in ['intended','ambiguous_or_miss','other_free','other_blocked']}
   for target in roots:
    h=heads[target]
    for theta in [j*math.pi/8 for j in range(16)]:
     p=(h[0]*scale+r*math.cos(theta),h[1]*scale+r*math.sin(theta));near=sorted((distance(p,a['path'],scale),i)for i,a in enumerate(l['arrows']));near=[(d,i)for d,i in near if d<=11]
     picked=None if not near or len(near)>1 and near[1][0]-near[0][0]<1.5 else near[0][1]
     key='ambiguous_or_miss'if picked is None else 'intended'if picked==target else 'other_blocked'if deps[picked]else'other_free';counts[key]+=1
   rows.append({'radiusPx':r,'n':len(roots)*16,'counts':counts})
  out.append({'level':id,'view':label,'scale':scale,'initialFreeTargets':len(roots),'rows':rows})
(ROOT/'docs/verification/GAMEPLAY_INPUT_AUDIT_2026-11-11.json').write_text(json.dumps({'method':'Independent segment-distance arithmetic; current 11px hit radius and 1.5px ambiguity gap; 16 evenly spaced angular offsets per initially legal head. No human motor-error distribution is assumed. Zoomed view is conditional on the chosen head being visible, not a claim that all heads fit simultaneously. 320 value is a width-bound approximation unless measured in browser.','rows':out},indent=2))
for q in out:
 if q['level']in['c01','c06','c20','c120']:
  print(q['level'],q['view'],round(q['scale'],2),[(r['radiusPx'],r['counts'])for r in q['rows'] if r['radiusPx']in[0,4]])
