"""Read-only campaign audit. Independent cell-walking graph, no game/solver imports.

Bots have exact legality knowledge and no input/recognition mistakes. Their traces
measure structural differences, not human difficulty, enjoyment or retention.
"""
from __future__ import annotations
import argparse, collections, hashlib, json, math, random, statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def graph(level):
    owners = {}; heads = []; paths = []
    for i, arrow in enumerate(level['arrows']):
        cells = set(); path = arrow['path']; paths.append(path); heads.append((path[-1]['x'], path[-1]['y']))
        for a, b in zip(path, path[1:]):
            assert (a['x'] == b['x']) != (a['y'] == b['y']), (level['id'], 'non-axis segment')
            sx = (b['x'] > a['x']) - (b['x'] < a['x']); sy = (b['y'] > a['y']) - (b['y'] < a['y'])
            cells.update((a['x'] + k*sx, a['y'] + k*sy) for k in range(abs(b['x']-a['x'])+abs(b['y']-a['y'])+1))
        for c in cells:
            assert c not in owners, (level['id'], 'overlap', c)
            owners[c] = i
    deps = []; ordered = []
    for i, path in enumerate(paths):
        h, p = path[-1], path[-2]; dx = (h['x'] > p['x']) - (h['x'] < p['x']); dy = (h['y'] > p['y']) - (h['y'] < p['y'])
        x, y = h['x']+dx, h['y']+dy; ray = []
        while 0 <= x < level['width'] and 0 <= y < level['height']:
            owner = owners.get((x, y))
            if owner is not None and owner != i and owner not in ray: ray.append(owner)
            x += dx; y += dy
        deps.append(set(ray)); ordered.append(ray)
    return deps, ordered, heads


def structural(deps):
    n = len(deps); seen = {}; visiting = set(); closure = {}
    def visit(i):
        if i in seen: return seen[i]
        assert i not in visiting, 'cycle'; visiting.add(i)
        depth = 1 + max([visit(j) for j in deps[i]] or [0]); visiting.remove(i); seen[i] = depth
        closure[i] = set(deps[i]) | set().union(*(closure[j] for j in deps[i])) if deps[i] else set()
        return depth
    for i in range(n): visit(i)
    reduced = [set(b for b in deps[i] if not any(b in closure[c] for c in deps[i] if c != b)) for i in range(n)]
    users = [set() for _ in deps]
    for i, bs in enumerate(reduced):
        for b in bs: users[b].add(i)
    todo = set(range(n)); components = []
    while todo:
        q = [todo.pop()]; size = 0
        while q:
            i = q.pop(); size += 1
            for j in reduced[i] | users[i]:
                if j in todo: todo.remove(j); q.append(j)
        components.append(size)
    return {'arrows': n, 'edges': sum(map(len, deps)), 'reducedEdges': sum(map(len, reduced)),
            'depth': max(seen.values()), 'initialFree': sum(not d for d in deps),
            'components': len(components), 'largestComponent': max(components),
            'rootsFraction': sum(not d for d in deps)/n,
            'joinFraction': sum(len(d)>1 for d in reduced)/n,
            'forkFraction': sum(len(u)>1 for u in users)/n,
            'simpleChainNodeFraction': sum(len(reduced[i])==1 and len(users[i])==1 for i in range(n))/n,
            'maxReducedFanout': max(map(len, users)), 'maxReducedFanin': max(map(len, reduced)),
            'meanReducedDegree': sum(map(len, reduced))/n}


def simulate(deps, ordered, heads, policy, seed=0):
    n = len(deps); remaining = set(range(n)); removed = set(); rng = random.Random(seed)
    raster = sorted(remaining, key=lambda i: (heads[i][1], heads[i][0], i)); cursor = 0
    last = (statistics.mean(x for x,y in heads), statistics.mean(y for x,y in heads)); stack = []
    trace = []; checks = 0; max_stack = 0; tail = None; longest = run = 0
    def dist(i): return math.dist(last, heads[i])
    while remaining:
        free = {i for i in remaining if not deps[i] & remaining}; assert free
        if tail is None and not any(deps[i] & remaining for i in remaining): tail = len(remaining)
        if policy == 'raster':
            for _ in raster:
                i = raster[cursor]; cursor = (cursor+1)%n
                if i not in remaining: continue
                checks += 1
                if i in free: break
            else: raise AssertionError('raster no move')
        elif policy == 'follow_blocker':
            while stack and stack[-1] not in remaining: stack.pop()
            if not stack: stack = [min(remaining, key=lambda j:(dist(j),j))]
            while stack[-1] not in free:
                i = stack[-1]; stack.append(next(j for j in ordered[i] if j in remaining)); checks += 1
                assert len(stack) <= n
            max_stack = max(max_stack, len(stack)); i = stack.pop(); checks += 1
        elif policy == 'nearest_free':
            i = min(free,key=lambda j:(dist(j),j))
        elif policy == 'max_unlock':
            i = min(free,key=lambda j:(-sum(deps[k]&remaining == {j} for k in remaining-free),dist(j),j))
        elif policy == 'first_free': i = min(free)
        elif policy == 'random_free': i = rng.choice(sorted(free))
        else: raise ValueError(policy)
        assert i in free
        hint = min(free); hint_gain = sum(deps[k]&remaining == {hint} for k in remaining-free)
        removed.add(i); remaining.remove(i)
        after = {j for j in remaining if not deps[j] & remaining}; new = after - (free-{i})
        assert free-{i} <= after, 'legal move must be monotone'
        run = run+1 if not new else 0
        if len(trace) < math.ceil(n*.75): longest = max(longest,run)
        trace.append({'arrow': i, 'frontier': len(free), 'remaining':len(remaining)+1, 'newFree':len(new),
                      'travelCells': round(dist(i),3), 'hintNewFree': hint_gain,
                      'bestNewFree':max([sum(deps[k] & (remaining|{i}) == {j} for k in (remaining|{i})-free) for j in free] or [0])})
        last = heads[i]
    gains=[s['newFree'] for s in trace]
    assert sum(gains)==n-sum(not d for d in deps), 'every non-root becomes free exactly once'
    return {'moves':n,'zeroUnlockFraction':gains.count(0)/n,'oneUnlockFraction':gains.count(1)/n,
            'multiUnlockFraction':sum(g>=2 for g in gains)/n,'maxNewFree':max(gains),
            'allFreeTail':tail or 0,'allFreeTailFraction':(tail or 0)/n,
            'longestZeroUnlockRunFirst75Pct':longest,'candidateChecks':checks or None,'maxFollowStack':max_stack or None,
            'travelCells':round(sum(s['travelCells']for s in trace),2),
            'firstHalfFreeFraction':statistics.mean(s['frontier']/s['remaining'] for s in trace[:math.ceil(n/2)]),
            'hintZeroWhileBetterFraction':sum(s['hintNewFree']==0 and s['bestNewFree']>0 for s in trace)/n,
            'phaseMeanFrontier': [round(statistics.mean([s['frontier']/s['remaining']for k,s in enumerate(trace) if min(3,k*4//n)==phase]),4) if any(min(3,k*4//n)==phase for k in range(n)) else None for phase in range(4)],
            'trace':trace}


def audit(source, random_seeds):
    data=json.loads(source.read_text()); old=json.loads((ROOT/'docs/verification/CAMPAIGN_SELECTION_V4.json').read_text())
    meta={f'c{v["number"]:02}':v for v in old['levels']}; levels=[]
    for level in data:
        deps,ordered,heads=graph(level); s=structural(deps); m=meta.get(level['id'],{})
        bots={p:simulate(deps,ordered,heads,p) for p in ['raster','follow_blocker','nearest_free','max_unlock','first_free']}
        random_runs=[simulate(deps,ordered,heads,'random_free',seed)for seed in range(random_seeds)]
        random_summary={k:{'min':min(r[k] for r in random_runs),'median':statistics.median(r[k] for r in random_runs),'max':max(r[k] for r in random_runs)} for k in ['zeroUnlockFraction','multiUnlockFraction','allFreeTail','allFreeTailFraction','firstHalfFreeFraction']}
        levels.append({'id':level['id'],'width':level['width'],'height':level['height'],'difficulty':level['difficulty'],'family':m.get('family','authored-opening'),'pace':m.get('pace','tutorial'),'structural':s,'bots':bots,'random':random_summary})
    return {'schema':1,'source':'src/content/campaign.json','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'researchCommit':'60af6eeab4532e7f165c8d46665688a457b171fa','appCommit':'6348333d01bcc17bca059025583ce472a71dca06',
            'method':'Independent cell occupancy/rays; DAG/reduction; five exact-legality order policies plus seeded random-free orders. No runtime/generator imports or content writes.',
            'limits':['No human participants, subjective ratings or retention measurement.','Bots know exact legality and make no recognition or touch errors. max_unlock is an omniscient upper-bound comparator.','Counts/depth/structural signatures are not human difficulty or enjoyment.','All legal orders need exactly one accepted removal per arrow; order policies can change search/travel/frontier rhythm, never move count.'],
            'randomSeedsPerLevel':random_seeds,'levels':levels}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'docs/verification/GAMEPLAY_AUDIT_2026-11-11.json');p.add_argument('--random-seeds',type=int,default=20);p.add_argument('--traces-output',type=Path,default=ROOT/'.test-output/gameplay-audit-traces.json');args=p.parse_args()
    assert args.random_seeds>0
    result=audit(ROOT/'src/content/campaign.json',args.random_seeds)
    traces={l['id']:{policy:bot.pop('trace') for policy,bot in l['bots'].items()} for l in result['levels']}
    args.traces_output.parent.mkdir(parents=True,exist_ok=True);args.traces_output.write_text(json.dumps(traces,indent=2)+'\n')
    result['traceOutput']='Generated separately with --traces-output; default .test-output/gameplay-audit-traces.json (not a production asset).'
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(f'Validated {len(result["levels"])} levels; {len(result["levels"])*(5+args.random_seeds)} complete traces; no runtime/content writes.')
    for l in result['levels']:
        if l['id'] in ['c01','c03','c05','c06','c12','c18','c19','c20','c21','c25','c30','c45','c50','c60','c75','c80','c95','c100','c115','c119','c120']:
            s=l['structural'];b=l['bots']['raster'];print(l['id'],l['family'],l['pace'],'N',s['arrows'],'depth',s['depth'],'joins',round(s['joinFraction'],2),'forks',round(s['forkFraction'],2),'scan',b['candidateChecks'],'multi',round(b['multiUnlockFraction'],2),'tail',b['allFreeTail'],'hintZeroBetter',round(b['hintZeroWhileBetterFraction'],2))
