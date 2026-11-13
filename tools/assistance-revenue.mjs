/** Offline custom ILRD export only. Never sum SDK automatic revenue with it.
 * Input: [{event,params,at}], at = export occurrence time in milliseconds. */
export function exportEnvironment(p={}){
  if(p.qa===true)return 'test';
  if(p.environment_version!==1)return 'unknown';
  if(!['release','debug','playtest'].includes(p.build_environment)||!['live','test','disabled'].includes(p.ad_environment)||!['production','debug','off'].includes(p.analytics_environment))return 'unknown';
  if(p.build_environment==='release'&&p.ad_environment==='live'&&p.analytics_environment==='production')return 'live';
  if(['playtest','debug'].includes(p.build_environment)||p.ad_environment==='test'||p.ad_environment==='disabled'||p.analytics_environment==='off'||p.analytics_environment==='debug')return 'test';
  return 'unknown';
}
export function revenueCohorts(rows,asOf){
  const assignments=new Map(),sessions=new Map(),impressions=new Map();let duplicates=0,unknown=0,missingJoin=0,immature=0;
  const environmentRows={live:0,test:0,unknown:0},sdk=new Map(),values=new Map(),health=new Map();let diagnosticSnapshots=0;
  for(const r of rows){const p=r.params??{},env=exportEnvironment(p);environmentRows[env]++;
    if(r.event==='ad_event'&&p.phase==='impression'&&p.request_id)sdk.set(`${env}:${p.request_id}`,{env,p});
    if(r.event==='ad_impression_value'&&p.event_id)values.set(`${env}:${p.event_id}`,{env,p});
    if(r.event==='analytics_health'&&p.transport_id&&Number.isInteger(p.sequence)){
      diagnosticSnapshots++;const key=`${env}:${p.transport_id}`,prior=health.get(key);if(!prior||p.sequence>prior.sequence)health.set(key,p);
    }
    // QA=false is only a UI hint. Old/missing provenance is deliberately unknown.
    if(env!=='live')continue;
    if(r.event==='assistance_assignment'&&!assignments.has(p.assignment_id))assignments.set(p.assignment_id,p);
    if(r.event==='ad_session')sessions.set(p.request_id,p);
    if(r.event==='ad_impression_value'){if(impressions.has(p.event_id))duplicates++;else impressions.set(p.event_id,r);}
  }
  const mature=new Map(),byInstall=new Map();
  for(const [id,p]of assignments){if(asOf-p.eligible_at<7*86400000){immature++;continue;}const prior=byInstall.get(p.install_id);if(prior&&prior.variant!==p.variant)throw Error('Cross-variant install: exclude QA/invalid assignment');byInstall.set(p.install_id,p);mature.set(id,p);}
  const cohorts=new Map();
  for(const p of byInstall.values()){if(!cohorts.has(p.variant))cohorts.set(p.variant,{variant:p.variant,installs:0,revenue:{},impressions:0});cohorts.get(p.variant).installs++;}
  let joined=0;
  for(const r of impressions.values()){
    const p=r.params,s=sessions.get(p.request_id);if(!s){missingJoin++;continue;}
    const a=mature.get(s.assignment_id);if(!a){if(!assignments.has(s.assignment_id))missingJoin++;continue;}
    if(s.install_id&&s.install_id!==a.install_id||s.variant&&s.variant!==a.variant){missingJoin++;continue;}
    if(r.at<a.eligible_at||r.at>=a.eligible_at+7*86400000)continue;
    const c=cohorts.get(a.variant);c.impressions++;joined++;
    if(!p.known||!p.currency||p.precision==='unknown'||!/^\d+(\.\d{1,12})?$/.test(p.amount)){unknown++;continue;}
    // Exact fixed decimal accumulation, independent currencies, no FX guesses.
    const [whole,fraction='']=p.amount.split('.'),value=BigInt(whole)*10n**12n+BigInt(fraction.padEnd(12,'0'));
    c.revenue[p.currency]=(c.revenue[p.currency]??0n)+value;
  }
  const observed={};
  for(const env of ['live','test','unknown']){
    const callbacks=[...sdk.values()].filter(x=>x.env===env),facts=[...values.values()].filter(x=>x.env===env),requests=new Set(facts.map(x=>x.p.request_id));
    observed[env]={sdkImpressions:callbacks.length,monetaryFacts:facts.length,callbacksWithMonetary:callbacks.filter(x=>requests.has(x.p.request_id)).length,missingMonetary:callbacks.filter(x=>!requests.has(x.p.request_id)).length,monetaryWithoutCallback:facts.filter(x=>!sdk.has(`${env}:${x.p.request_id}`)).length};
  }
  const reportedLosses={};
  for(const env of ['live','test','unknown']){
    const snapshots=[...health.entries()].filter(([key])=>key.startsWith(env+':')).map(([,p])=>p);
    reportedLosses[env]={transports:snapshots.length,...Object.fromEntries(['dropped','overflow','invalid','sync_failure','async_failure','native_rejected','flush_failure','diagnostics_failed'].map(key=>[key,snapshots.length?snapshots.reduce((n,p)=>n+(Number.isFinite(p[key])?p[key]:0),0):null]))};
  }
  return {cohorts:[...cohorts.values()].map(c=>({...c,revenue:Object.fromEntries(Object.entries(c.revenue).map(([currency,v])=>[currency,{amount:(Number(v)/1e12).toString(),perAssignedInstall:Number(v)/1e12/c.installs}]))})),duplicates,unknown,missingJoin,immature,environmentRows,coverage:{observed,joinedMatureLive:joined,diagnosticSnapshots,reportedLosses,completeness:'unknown',note:'Observed export only; an absent callback, monetary fact or diagnostic may itself have been lost. SDK acceptance is not dashboard delivery.'},canonical:'ad_impression_value/sdk-ilrd',liveVerified:false};
}
