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
