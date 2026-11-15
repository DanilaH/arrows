import type {ProgressStore,SaveChange} from '../progression/save';
import {assignmentId,assistanceExperiment,type HelpOffer,type HelpRight,type HelpPlacement} from '../progression/helpLedger';
import type {HelpVariant} from '../domain/assistance';
import type {createAds,AdContext} from '../platform/ads';
import type {createAnalytics} from '../platform/analytics';
import {copy,type GameLanguage} from '../app/language';

/** One current-state cache and visibility episode; no frame/tween/reward authority. */
export function createHelpOffers(progress:ProgressStore,ads:ReturnType<typeof createAds>,analytics:ReturnType<typeof createAnalytics>,language:()=>GameLanguage,visibleCandidates:()=>ReadonlySet<string>=()=>new Set()){
  const cache=new Map<string,{key:string;value:{offer:HelpOffer|null;reserve:HelpRight|null}}>();
  type Episode={id:string;offerId:string;attempt:string;choices:Set<string>};
  const episodes=new Map<HelpPlacement,Episode>();let currentPlacement:HelpPlacement='hint',enrolling=false;
  const context=(attempt:string,chosen?:HelpVariant):AdContext=>{
    const ledger=progress.state.helpLedger,variant=chosen??ledger.assignments[attempt]??ledger.nextVariant;
    return {assignmentId:assignmentId(ledger,variant),variant,experimentId:assistanceExperiment(variant),installId:ledger.installId,qa:ads.rewardedState.playtest};
  };
  const snapshot=(attempt:string,placement:HelpPlacement='hint')=>{
    const saved=progress.findAttempt(attempt)?.saved,l=progress.state.helpLedger;
    const visible=placement==='cascade'?new Set<string>():visibleCandidates();
    const key=JSON.stringify([attempt,placement,saved?.board,[...visible].sort(),l.assignments[attempt],l.candidateEnabled,Object.values(l.rights).map(r=>[r.id,r.status,r.owner?.attempt])]);
    let entry=cache.get(placement);if(entry?.key!==key){entry={key,value:{offer:progress.helpOffer(attempt,placement,visible),reserve:progress.savedHelp(attempt)}};cache.set(placement,entry);}
    return entry!.value;
  };
  const visible=(show:boolean,attempt:string,placement:HelpPlacement='hint'):void=>{
    if(placement!=='cascade'){currentPlacement=placement;episodes.delete(placement==='hint'?'lives':'hint');}
    if(!show){episodes.delete(placement);return;}
    const {offer,reserve}=snapshot(attempt,placement),effect=reserve??offer;if(!effect){episodes.delete(placement);return;}
    const offerId=reserve?`reserve-${reserve.id}`:offer!.id;
    let episode=episodes.get(placement);if(episode?.offerId===offerId&&episode.attempt===attempt)return;
    episode={id:crypto.randomUUID(),offerId,attempt,choices:new Set()};episodes.set(placement,episode);
    const c=context(attempt),source=reserve?'reserve':'advertisement';
    analytics.track('assistance_offer',{event_id:episode.id,offer_id:offerId,attempt,variant:c.variant,effect:effect.kind,amount:effect.amount,readiness:ads.rewardedState.phase,source});
    if(!enrolling&&!progress.state.helpLedger.enrollments[c.assignmentId]){
      enrolling=true;void progress.enrollHelp(attempt,c.qa).catch(()=>undefined).finally(()=>{enrolling=false;});
    }
  };
  return {
    context,snapshot,visible,
    captureChoice(placement:HelpPlacement=currentPlacement){return episodes.get(placement)??null;},
    choice(choice:string,requestId='',captured=episodes.get(currentPlacement)??null,sourceAttempt=captured?.attempt):void{if(captured&&captured.attempt===sourceAttempt&&!captured.choices.has(choice)){captured.choices.add(choice);analytics.track('assistance_choice',{event_id:`${captured.id}-${choice}`,offer_id:captured.offerId,attempt:captured.attempt,choice,request_id:requestId});}},
    reveal(attempt:string,phase:'reveal_started'|'reveal_ready'):void{
      const right=progress.currentHelp(attempt);if(!right)return;const request=right.requestId?progress.state.helpLedger.requests[right.requestId]:null;
      analytics.track('assistance_fact',{event_id:`${right.id}-${phase}`,phase,entitlement_id:right.id,request_id:right.requestId??'',source_attempt:right.originalOwner.attempt,attempt,effect:right.kind,variant:request?.variant??'legacy-unknown',manual:0,native:0,bonus:0,use_origin:'none',component:right.bundle?`lives_${right.bundle.lives}_single_${right.bundle.single}`:'standalone'});
    },
    livesLabel(attempt:string):{text:string;detail:string;reserved:boolean}{
      const ru=language()==='ru',{offer,reserve}=snapshot(attempt,'lives'),effect=reserve??offer;
      if(reserve)return {text:ru?'Использовать сохранённое':'Use saved continue',detail:effect?.kind==='continue-single-v1'&&effect.bundle&&'single' in effect.bundle&&effect.bundle.single==='pending'?(ru?'Три жизни и полезная подсказка уже сохранены. Без видео.':'Three lives and a useful hint are saved. No video.'):(ru?'Три жизни уже сохранены. Видео не требуется.':'Three saved lives are available. No video needed.'),reserved:true};
      const detail=offer?.kind==='continue-single-v1'?offer.bundle?.hint==='retain'?(ru?'Три жизни, помощь сохранится.':'Three lives; your help is retained.'):(ru?'Три жизни и одна полезная подсказка.':'Three lives and one useful hint.'):(ru?'Посмотрите видео, чтобы вернуть три жизни.':'Watch a video to restore three lives.');
      return {text:ru?'Смотреть видео':'Watch video',detail,reserved:false};
    },
    label(attempt:string):{text:string;detail:string;reserved:boolean;kind:string}{
      const ru=language()==='ru',{offer,reserve}=snapshot(attempt),effect=reserve??offer;
      if(!effect)return {text:copy[language()].hint,detail:'',reserved:false,kind:'none'};
      if(reserve&&effect.kind==='continue-single-v1'&&'bundle' in effect&&effect.bundle&&'lives' in effect.bundle&&effect.bundle.lives==='applied')return {text:ru?'Использовать подсказку':'Use saved hint',detail:ru?'Один полезный ход · без видео':'One useful move · no video',reserved:true,kind:effect.kind};
      if(reserve&&effect.kind==='route-v1')return {text:ru?'Продолжить маршрут':'Resume route',detail:ru?`До ${effect.amount} ${effect.amount===1?'шага':'шагов'} · без видео`:`Up to ${effect.amount} steps · no video`,reserved:true,kind:effect.kind};
      if(effect.kind==='route-v1')return {text:ru?`Маршрут · ${effect.amount} шага · видео`:`Route · ${effect.amount} steps · video`,detail:ru?'Все стрелки убираете вы':'Every action is yours',reserved:false,kind:effect.kind};
      if(reserve)return {text:ru?'Использовать сохранённую помощь':'Use saved help',detail:effect.kind==='cascade-v1'?`${ru?'Автоматически ещё':'Automatically'} ${effect.amount}`:ru?'Без нового видео':'No new video',reserved:true,kind:effect.kind};
      return {text:effect.kind==='cascade-v1'?`${ru?'Каскад':'Cascade'} +${effect.amount} · ${ru?'видео':'video'}`:copy[language()].hint,detail:effect.kind==='cascade-v1'?ru?`Одна пусковая и ещё ${effect.amount} стрелки автоматически`:`One trigger and ${effect.amount} automatic arrows`:ru?'Один полезный ход':'One useful move',reserved:false,kind:effect.kind};
    },
    facts(change:SaveChange):void{
      for(const f of change.helpFacts??[]){
        if(f.phase==='assignment'){
          const l=progress.state.helpLedger,e=l.enrollments[f.id];if(e)analytics.track('assistance_assignment',{event_id:f.id,assignment_id:f.id,install_id:l.installId,experiment_id:assistanceExperiment(e.variant),variant:e.variant,eligible_at:e.at,qa:e.qa});
          continue;
        }
        const ledger=progress.state.helpLedger,request=ledger.requests[f.request],right=ledger.rights[f.entitlement];
        if(f.phase==='request'&&request)analytics.track('assistance_request',{request_id:request.requestId,offer_id:request.id,assignment_id:request.assignmentId,install_id:ledger.installId,variant:request.variant,effect:request.kind,effect_version:1,amount:request.amount,attempt:request.owner.attempt,mode:request.owner.mode,content_version:request.owner.contentVersion,fallback:request.fallback,at:request.createdAt,qa:ads.rewardedState.playtest});
        const root=right?.plan?.root,op=right?.operation,useOrigin=!['use','progress'].includes(f.phase)?'none':right?.kind==='route-v1'?op?.manual.length?'manual':op?.native.length?'native':'none':root&&op?.manual.includes(root)?'manual':root&&op?.native.includes(root)?'native':'bonus';
        analytics.track('assistance_fact',{event_id:f.id,phase:f.phase,entitlement_id:f.entitlement,request_id:f.request,source_attempt:f.sourceAttempt,attempt:f.attempt,effect:f.kind,variant:request?.variant??(f.variant||'legacy-unknown'),manual:f.manual,native:f.native,bonus:f.bonus,use_origin:useOrigin,component:right?.bundle?`lives_${right.bundle.lives}_single_${right.bundle.single}${right.bundle.retainedAtOffer?'_retained':''}`:'standalone'});
      }
      for(const f of change.continueFacts??[])analytics.track('continue_outcome',{event_id:f.id,entitlement_id:f.entitlement,attempt:f.attempt,outcome:f.outcome,active_ms:f.activeMs});
      for(const f of change.followupFacts??[])analytics.track('assistance_followup',{event_id:f.id,entitlement_id:f.entitlement,attempt:f.attempt,outcome:f.outcome,active_ms:f.activeMs});
    },
    renderQA():HTMLElement|null{
      if(!ads.rewardedState.playtest)return null;
      const ru=language()==='ru',section=document.createElement('section');section.className='settings-section help-qa';section.id='help-qa';
      const title=document.createElement('h3');title.textContent=ru?'Тестирование помощи':'Assistance playtest';section.append(title);
      const label=document.createElement('label');label.className='language-setting';label.htmlFor='help-qa-variant';label.textContent=ru?'Для новых попыток':'For new attempts';
      const select=document.createElement('select');select.id='help-qa-variant';
      for(const [value,name]of [['combined-v1',ru?'Обычная игра · подсказка и каскад':'Normal game · hint and cascade'],['legacy',ru?'Лаб · исходная подсказка':'Lab · legacy single'],['single-v2',ru?'Лаб · A1 · полезный ход':'Lab · A1 · useful single'],['cascade-v1',ru?'Лаб · A2 · каскад':'Lab · A2 · cascade'],['route-v1',ru?'Лаб · A3 · маршрут до цели':'Lab · A3 · route to target'],['continue-single-v1',ru?'Лаб · A4 · продолжение с подсказкой':'Lab · A4 · continue with a single']]){const option=document.createElement('option');option.value=value!;option.textContent=name!;select.append(option);}
      select.value=progress.state.helpLedger.nextVariant;select.disabled=!progress.available||progress.uncertain;
      select.addEventListener('change',()=>{select.disabled=true;void progress.setNextHelpVariant(select.value as HelpVariant).catch(()=>{select.value=progress.state.helpLedger.nextVariant;}).finally(()=>{select.disabled=progress.uncertain||!progress.available;});});label.append(select);section.append(label);
      const detail=document.createElement('p');detail.textContent=ru?'Применится после «Заново» или на следующем уровне. Полученная помощь сохранится.':'Applies after Restart or on the next level. Earned help is preserved.';section.append(detail);
      const toggle=document.createElement('button');toggle.type='button';toggle.id='help-qa-enabled';toggle.className='sound-preview';toggle.textContent=ru?'Новые каскады: включены':'New cascades: enabled';
      const update=()=>{toggle.setAttribute('aria-pressed',String(progress.state.helpLedger.candidateEnabled));toggle.textContent=ru?`Каскад и лабораторная помощь: ${progress.state.helpLedger.candidateEnabled?'включены':'выключены'}`:`Cascade and lab help: ${progress.state.helpLedger.candidateEnabled?'enabled':'disabled'}`;};
      update();toggle.addEventListener('click',()=>{toggle.disabled=true;void progress.setHelpCandidateEnabled(!progress.state.helpLedger.candidateEnabled).catch(()=>undefined).finally(()=>{toggle.disabled=progress.uncertain||!progress.available;update();});});section.append(toggle);
      const lab=document.createElement('button');lab.type='button';lab.id='target-lab-open';lab.className='sound-preview';lab.textContent=ru?'B1 · Освободи цель · лаборатория':'B1 · Free the target · lab';lab.addEventListener('click',()=>{location.href='./target-lab.html';});section.append(lab);
      const contentPilot=document.createElement('button');contentPilot.type='button';contentPilot.id='content-pilot-open';contentPilot.className='sound-preview';contentPilot.textContent=ru?'Пилот сложности · 20 уровней + 7 дэйликов':'Challenge pilot · 20 levels + 7 dailies';contentPilot.addEventListener('click',()=>{contentPilot.disabled=true;void progress.flush().then(()=>{location.href='./content-pilot.html';}).catch(()=>{contentPilot.disabled=false;});});section.append(contentPilot);
      return section;
    },
    destroy():void{episodes.clear();cache.clear();}
  };
}
