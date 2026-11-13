/** Offline custom ILRD export only. Never sum SDK automatic revenue with it.
 * Input: [{event,params,at}], at = export occurrence time in milliseconds. */
export function revenueCohorts(rows,asOf){
  const assignments=new Map(),sessions=new Map(),impressions=new Map();let duplicates=0,unknown=0,missingJoin=0,immature=0;
  for(const r of rows){const p=r.params;
    if(r.event==='assistance_assignment'&&!p.qa&&!assignments.has(p.assignment_id))assignments.set(p.assignment_id,p);
    if(r.event==='ad_session')sessions.set(p.request_id,p);
    if(r.event==='ad_impression_value'){if(impressions.has(p.event_id))duplicates++;else impressions.set(p.event_id,r);}
  }
  const mature=new Map(),byInstall=new Map();
  for(const [id,p]of assignments){if(asOf-p.eligible_at<7*86400000){immature++;continue;}const prior=byInstall.get(p.install_id);if(prior&&prior.variant!==p.variant)throw Error('Cross-variant install: exclude QA/invalid assignment');byInstall.set(p.install_id,p);mature.set(id,p);}
  const cohorts=new Map();
  for(const p of byInstall.values()){if(!cohorts.has(p.variant))cohorts.set(p.variant,{variant:p.variant,installs:0,revenue:{},impressions:0});cohorts.get(p.variant).installs++;}
  for(const r of impressions.values()){
    const p=r.params,s=sessions.get(p.request_id);if(!s){missingJoin++;continue;}if(s.qa)continue;
    const a=mature.get(s.assignment_id);if(!a){if(!assignments.has(s.assignment_id))missingJoin++;continue;}
    if(r.at<a.eligible_at||r.at>=a.eligible_at+7*86400000)continue;
    const c=cohorts.get(a.variant);c.impressions++;
    if(!p.known||!p.currency||p.precision==='unknown'||!/^\d+(\.\d{1,12})?$/.test(p.amount)){unknown++;continue;}
    // Exact fixed decimal accumulation, independent currencies, no FX guesses.
    const [whole,fraction='']=p.amount.split('.'),value=BigInt(whole)*10n**12n+BigInt(fraction.padEnd(12,'0'));
    c.revenue[p.currency]=(c.revenue[p.currency]??0n)+value;
  }
  return {cohorts:[...cohorts.values()].map(c=>({...c,revenue:Object.fromEntries(Object.entries(c.revenue).map(([currency,v])=>[currency,{amount:(Number(v)/1e12).toString(),perAssignedInstall:Number(v)/1e12/c.installs}]))})),duplicates,unknown,missingJoin,immature,canonical:'ad_impression_value/sdk-ilrd',liveVerified:false};
}
