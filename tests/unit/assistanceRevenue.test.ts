import {it,expect} from 'vitest';
// @ts-expect-error Deliberately executable offline JS tool.
import {revenueCohorts} from '../../tools/assistance-revenue.mjs';
const live={environment_version:1,build_environment:'release',ad_environment:'live',analytics_environment:'production'};
it('joins the one monetary stream to all mature assigned installs, not viewers',()=>{
  const assignment=(id:string,variant='single-v2',qa=false)=>({event:'assistance_assignment',params:{assignment_id:id,install_id:id,variant,qa,eligible_at:1000},at:1000});
  const session=(id:string)=>({event:'ad_session',params:{request_id:id,assignment_id:'a',qa:false},at:2000});
  const impression=(id:string,amount='0.25',currency='RUB',known=true)=>({event:'ad_impression_value',params:{event_id:id,request_id:id,amount,currency,known,precision:known?'estimated':'unknown'},at:3000});
  const result=revenueCohorts([assignment('a'),assignment('b'),assignment('qa','cascade-v1',true),session('one'),impression('one'),impression('one'),session('two'),impression('two','','',false),impression('orphan')].map(r=>({...r,params:{...live,...r.params}})),8*86400000);
  expect(result.cohorts).toEqual([{variant:'single-v2',installs:2,revenue:{RUB:{amount:'0.25',perAssignedInstall:.125}},impressions:2}]);
  expect(result).toMatchObject({duplicates:1,unknown:1,missingJoin:1,liveVerified:false});
});
it('keeps a legitimate combined-policy upgrade out of the historical experiment cohort',()=>{
 const row=(event:string,params:object)=>({event,at:3000,params:{...live,...params}});
 const rows=['assistance-v1','assistance-combined-v1'].flatMap((experiment,i)=>[row('assistance_assignment',{assignment_id:`a${i}`,install_id:'same-install',variant:i?'combined-v1':'single-v2',eligible_at:1000,qa:false,experiment_id:experiment}),row('ad_session',{request_id:`r${i}`,assignment_id:`a${i}`,experiment_id:experiment}),row('ad_impression_value',{event_id:`v${i}`,request_id:`r${i}`,amount:'0.25',currency:'RUB',known:true,precision:'estimated'})]);
 expect(revenueCohorts(rows,8*86400000).cohorts).toMatchObject([{variant:'single-v2',installs:1,impressions:1}]);expect(revenueCohorts(rows,8*86400000,'assistance-combined-v1').cohorts).toMatchObject([{variant:'combined-v1',installs:1,impressions:1}]);
});
