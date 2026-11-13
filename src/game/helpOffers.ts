import type {ProgressStore,SaveChange} from '../progression/save';
import {assignmentId,type HelpOffer,type HelpRight} from '../progression/helpLedger';
import type {HelpVariant} from '../domain/assistance';
import type {createAds,AdContext} from '../platform/ads';
import type {createAnalytics} from '../platform/analytics';
import {copy,type GameLanguage} from '../app/language';

/** One current-state cache and visibility episode; no frame/tween/reward authority. */
export function createHelpOffers(progress:ProgressStore,ads:ReturnType<typeof createAds>,analytics:ReturnType<typeof createAnalytics>,language:()=>GameLanguage){
  let cacheKey='',cached:{offer:HelpOffer|null;reserve:HelpRight|null}={offer:null,reserve:null},episode:{id:string;offerId:string;attempt:string;choices:Set<string>}|null=null,enrolling=false;
  const context=(attempt:string,chosen?:HelpVariant):AdContext=>{
    const ledger=progress.state.helpLedger,variant=chosen??ledger.assignments[attempt]??ledger.nextVariant;
    return {assignmentId:assignmentId(ledger,variant),variant,experimentId:'assistance-v1',installId:ledger.installId,qa:ads.rewardedState.playtest};
  };
  const snapshot=(attempt:string,placement:'hint'|'lives'='hint')=>{
    const saved=progress.findAttempt(attempt)?.saved,l=progress.state.helpLedger;
    const key=JSON.stringify([attempt,placement,saved?.board,l.assignments[attempt],l.candidateEnabled,Object.values(l.rights).map(r=>[r.id,r.status,r.owner?.attempt])]);
    if(key!==cacheKey){cacheKey=key;cached={offer:progress.helpOffer(attempt,placement),reserve:progress.savedHelp(attempt)};}
    return cached;
  };
  const visible=(show:boolean,attempt:string,placement:'hint'|'lives'='hint'):void=>{
    if(!show){episode=null;return;}
    const {offer,reserve}=snapshot(attempt,placement),effect=reserve??offer;if(!effect){episode=null;return;}
    const offerId=reserve?`reserve-${reserve.id}`:offer!.id;
    if(episode?.offerId===offerId&&episode.attempt===attempt)return;
    episode={id:crypto.randomUUID(),offerId,attempt,choices:new Set()};
    const c=context(attempt),source=reserve?'reserve':'advertisement';
    analytics.track('assistance_offer',{event_id:episode.id,offer_id:offerId,attempt,variant:c.variant,effect:effect.kind,amount:effect.amount,readiness:ads.rewardedState.phase,source});
    if(!enrolling&&!progress.state.helpLedger.enrollments[c.assignmentId]){
      enrolling=true;void progress.enrollHelp(attempt,c.qa).catch(()=>undefined).finally(()=>{enrolling=false;});
    }
  };
  return {
    context,snapshot,visible,
    choice(choice:string,requestId=''):void{if(episode&&!episode.choices.has(choice)){episode.choices.add(choice);analytics.track('assistance_choice',{event_id:`${episode.id}-${choice}`,offer_id:episode.offerId,attempt:episode.attempt,choice,request_id:requestId});}},
    reveal(attempt:string,phase:'reveal_started'|'reveal_ready'):void{
      const right=progress.currentHelp(attempt);if(!right)return;const request=right.requestId?progress.state.helpLedger.requests[right.requestId]:null;
      analytics.track('assistance_fact',{event_id:`${right.id}-${phase}`,phase,entitlement_id:right.id,request_id:right.requestId??'',source_attempt:right.originalOwner.attempt,attempt,effect:right.kind,variant:request?.variant??'legacy-unknown',manual:0,native:0,bonus:0,use_origin:'none'});
    },
    label(attempt:string):{text:string;detail:string;reserved:boolean;kind:string}{
      const ru=language()==='ru',{offer,reserve}=snapshot(attempt),effect=reserve??offer;
      if(!effect)return {text:copy[language()].hint,detail:'',reserved:false,kind:'none'};
      if(reserve)return {text:ru?'Использовать сохранённую помощь':'Use saved help',detail:effect.kind==='cascade-v1'?`${ru?'Автоматически ещё':'Automatically'} ${effect.amount}`:ru?'Без нового видео':'No new video',reserved:true,kind:effect.kind};
      return {text:effect.kind==='cascade-v1'?`${ru?'Каскад':'Cascade'} +${effect.amount} · ${ru?'видео':'video'}`:`${copy[language()].hint} ×1`,detail:effect.kind==='cascade-v1'?ru?`Одна пусковая и ещё ${effect.amount} стрелки автоматически`:`One trigger and ${effect.amount} automatic arrows`:ru?'Один полезный ход':'One useful move',reserved:false,kind:effect.kind};
    },
    facts(change:SaveChange):void{
      for(const f of change.helpFacts??[]){
        if(f.phase==='assignment'){
          const l=progress.state.helpLedger,e=l.enrollments[f.id];if(e)analytics.track('assistance_assignment',{event_id:f.id,assignment_id:f.id,install_id:l.installId,experiment_id:'assistance-v1',variant:e.variant,eligible_at:e.at,qa:e.qa});
          continue;
        }
        const ledger=progress.state.helpLedger,request=ledger.requests[f.request],right=ledger.rights[f.entitlement];
        if(f.phase==='request'&&request)analytics.track('assistance_request',{request_id:request.requestId,offer_id:request.id,assignment_id:request.assignmentId,install_id:ledger.installId,variant:request.variant,effect:request.kind,effect_version:1,amount:request.amount,attempt:request.owner.attempt,mode:request.owner.mode,content_version:request.owner.contentVersion,fallback:request.fallback,at:request.createdAt,qa:ads.rewardedState.playtest});
        const root=right?.plan?.root,op=right?.operation,useOrigin=f.phase!=='use'?'none':root&&op?.manual.includes(root)?'manual':root&&op?.native.includes(root)?'native':'bonus';
        analytics.track('assistance_fact',{event_id:f.id,phase:f.phase,entitlement_id:f.entitlement,request_id:f.request,source_attempt:f.sourceAttempt,attempt:f.attempt,effect:f.kind,variant:request?.variant??(f.variant||'legacy-unknown'),manual:f.manual,native:f.native,bonus:f.bonus,use_origin:useOrigin});
      }
      for(const f of change.continueFacts??[])analytics.track('continue_outcome',{event_id:f.id,entitlement_id:f.entitlement,attempt:f.attempt,outcome:f.outcome,active_ms:f.activeMs});
    },
    renderQA():HTMLElement|null{
      if(!ads.rewardedState.playtest)return null;
      const ru=language()==='ru',section=document.createElement('section');section.className='settings-section help-qa';section.id='help-qa';
      const title=document.createElement('h3');title.textContent=ru?'Тестирование помощи':'Assistance playtest';section.append(title);
      const label=document.createElement('label');label.className='language-setting';label.htmlFor='help-qa-variant';label.textContent=ru?'Для новых попыток':'For new attempts';
      const select=document.createElement('select');select.id='help-qa-variant';
      for(const [value,name]of [['legacy',ru?'Исходная подсказка':'Legacy single'],['single-v2',ru?'A1 · полезный ход':'A1 · useful single'],['cascade-v1',ru?'A2 · каскад':'A2 · cascade']]){const option=document.createElement('option');option.value=value!;option.textContent=name!;select.append(option);}
      select.value=progress.state.helpLedger.nextVariant;select.disabled=!progress.available||progress.uncertain;
      select.addEventListener('change',()=>{select.disabled=true;void progress.setNextHelpVariant(select.value as HelpVariant).catch(()=>{select.value=progress.state.helpLedger.nextVariant;}).finally(()=>{select.disabled=progress.uncertain||!progress.available;});});label.append(select);section.append(label);
      const detail=document.createElement('p');detail.textContent=ru?'Применится после «Заново» или на следующем уровне. Полученная помощь сохранится.':'Applies after Restart or on the next level. Earned help is preserved.';section.append(detail);
      const toggle=document.createElement('button');toggle.type='button';toggle.id='help-qa-enabled';toggle.className='sound-preview';toggle.textContent=ru?'Новые каскады: включены':'New cascades: enabled';
      const update=()=>{toggle.setAttribute('aria-pressed',String(progress.state.helpLedger.candidateEnabled));toggle.textContent=ru?`Новые каскады: ${progress.state.helpLedger.candidateEnabled?'включены':'выключены'}`:`New cascades: ${progress.state.helpLedger.candidateEnabled?'enabled':'disabled'}`;};
      update();toggle.addEventListener('click',()=>{toggle.disabled=true;void progress.setHelpCandidateEnabled(!progress.state.helpLedger.candidateEnabled).catch(()=>undefined).finally(()=>{toggle.disabled=progress.uncertain||!progress.available;update();});});section.append(toggle);
      return section;
    },
    destroy():void{episode=null;cacheKey='';cached={offer:null,reserve:null};}
  };
}
