/** Isolated browser QA adapter. Inject before the UNMODIFIED production bundle.
 * Never imported by src or copied to Android assets. This is not a video SDK. */
export function controlledNative({save,settings,preserve=false,reminders=null,banner=null}) {
  const listeners=new Map(),events=[],pulses=[];let serial=0,pending=[],request=null,resolveShow=null,loadPhase='ready',writeDelay=0,retryAt=0,readyUntil=performance.now()+300000;
  const reminderCalls=[],reminderState={enabled:true,allowed:false,requested:false,pending:'',...reminders};
  const bannerCalls=[];let bannerRevision=-1,bannerVisible=false,bannerHold=null,bannerHeld=null;
  const bannerGeometry=()=>{const scale=banner?.scale??3;return{configured:banner?.configured!==false,webView:{x:banner?.x??0,y:banner?.y??0,width:banner?.width??innerWidth*scale,height:banner?.heightNative??innerHeight*scale},root:{width:banner?.rootWidth??innerWidth*scale,height:banner?.rootHeight??innerHeight*scale},safeInsets:{left:0,top:0,right:0,bottom:0,...banner?.safeInsets},parentPadding:{left:0,top:0},adHeight:banner?.adHeight??150};};
  const emit=(plugin,name,value)=>{for(const l of listeners.values())if(l.plugin===plugin&&l.name===name)l.callback(value);};
  const readiness=()=>({configured:true,phase:loadPhase,ready:loadPhase==='ready',preloadId:'controlled-qa',loadedAt:1,expiresInMs:Math.max(0,readyUntil-performance.now()),retryInMs:Math.max(0,retryAt-performance.now()),playtest:true});
  if(!preserve||!localStorage.getItem('arrows.progress.v1'))localStorage.setItem('arrows.progress.v1',JSON.stringify(save));if(settings)localStorage.setItem('arrows.settings.v1',JSON.stringify(settings));
  const methods={ArrowsStorage:['get','set','remove','list'],ArrowsAnalytics:['report','flush'],ArrowsAds:['prepareRewarded','prepareInterstitial','status','show','pending','acknowledge','cancelPending'],ArrowsFeedback:['pulse','cancel'],App:['getState','minimizeApp'],SystemBars:['setStyle']};
  if(banner)methods.ArrowsBanner=['measure','apply','destroy'];
  if(reminders)methods.ArrowsDaily=['status','sync','request','openSettings','consume'];
  window.androidBridge={};window.Capacitor={PluginHeaders:Object.entries(methods).map(([name,names])=>({name,methods:[...names.map(name=>({name,rtype:'promise'})),{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'promise'}]})),
    nativeCallback(plugin,method,options,callback){const id=String(++serial);listeners.set(id,{plugin,name:options.eventName,callback});return id;},
    async nativePromise(plugin,method,o={}){
      if(method==='removeListener'){listeners.delete(o.callbackId);return;}
      if(plugin==='ArrowsStorage'){if(method==='list')return{keys:Object.keys(localStorage).filter(k=>k.startsWith(o.prefix))};if(method==='get')return{value:localStorage.getItem(o.key)};if(method==='set'){if(o.key==='arrows.progress.v1'&&writeDelay){const delay=writeDelay;writeDelay=0;await new Promise(r=>setTimeout(r,delay));}localStorage.setItem(o.key,o.value);}if(method==='remove')localStorage.removeItem(o.key);return;}
      if(plugin==='ArrowsAnalytics'){if(method==='report')events.push({...o,at:Date.now()});return{accepted:false,disabled:true};}
      if(plugin==='ArrowsFeedback'){pulses.push({method,...o,at:performance.now()});return;}
      if(plugin==='ArrowsBanner'&&banner){bannerCalls.push({method,...o});if(method==='measure'){const g=bannerGeometry(),r={...g,token:JSON.stringify(g)};if(bannerHold){const hold=bannerHold;bannerHold=null;await hold;}return r;}if(method==='apply'){if(o.revision<bannerRevision)return{accepted:false};bannerRevision=o.revision;const accepted=!o.visible||o.token===JSON.stringify(bannerGeometry());bannerVisible=accepted&&o.visible;return{accepted};}if(method==='destroy')bannerVisible=false;return;}
      if(plugin==='ArrowsDaily'&&reminders){reminderCalls.push({method,...o});if(method==='request'){reminderState.requested=true;reminderState.allowed=true;}if(method==='consume'&&o.nonce===reminderState.pending)reminderState.pending='';return{...reminderState};}
      if(plugin==='App')return{isActive:true};if(plugin==='SystemBars')return;
      if(plugin==='ArrowsAds'){
        if(method==='status')return{rewardedState:readiness()};if(method==='prepareRewarded')return readiness();
        if(method==='pending')return{receipts:pending};if(method==='acknowledge'){pending=pending.filter(r=>r.id!==o.id);return;}
        if(method==='cancelPending'){resolveShow?.({shown:false,outcome:'cancelled'});resolveShow=null;return;}
        if(method==='show'){request=o;return new Promise(r=>resolveShow=r);}return;
      }
    }
  };
  const Original=window.AudioContext;let audioContext,destination,recorder,recordingContext,chunks=[];
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(target,...args){if(audioContext&&target===audioContext.destination)connect.call(this,destination);return connect.call(this,target,...args);};
  window.AudioContext=class extends Original{constructor(...args){super(...args);audioContext=this;destination=this.createMediaStreamDestination();}};
  window.assistanceQA={
    deferProgressWrite(ms){writeDelay=ms;},
    back(){emit('App','backButton',{canGoBack:true});},
    snapshot:()=>({request,events,pulses,pending,readiness:readiness(),reminders:{...reminderState},reminderCalls,banner:{visible:bannerVisible,calls:bannerCalls,geometry:banner?bannerGeometry():null}}),
    bannerResize(value){Object.assign(banner,value);bannerVisible=false;emit('ArrowsBanner','bannerEvent',{phase:'geometry'});},
    bannerHoldMeasure(){bannerHold=new Promise(r=>{bannerHeld=r;});},
    bannerReleaseMeasure(){bannerHeld?.();bannerHeld=null;},
    dailyTap(nonce){reminderState.pending=nonce;emit('ArrowsDaily','dailyEntry',{});},
    late(receipt){pending.push(receipt);emit('ArrowsAds','adEvent',{kind:'rewarded',phase:'receipt_pending',requestId:receipt.id,attempt:receipt.attempt,mode:receipt.mode,placement:receipt.placement});},
    earned(){if(!request)throw Error('No explicit saved ad request');const receipt={schema:2,intentVersion:1,id:request.requestId,requestId:request.requestId,attempt:request.attempt,mode:request.mode,placement:request.placement};pending.push(receipt);emit('ArrowsAds','adEvent',{...request,phase:'earned'});},
    shown(){emit('ArrowsAds','adEvent',{...request,phase:'show'});},
    dismiss(){resolveShow?.({shown:true,outcome:'dismissed',earned:true});resolveShow=null;},
    background(value){emit('App','appStateChange',{isActive:!value});},
    loading(){loadPhase='loading';emit('ArrowsAds','adEvent',{kind:'rewarded',phase:'preload_start',readiness:readiness()});},
    backoff(ms=30000){loadPhase='backoff';retryAt=performance.now()+ms;emit('ArrowsAds','adEvent',{kind:'rewarded',phase:'load_error',readiness:readiness()});},
    lateReady(){readyUntil=performance.now()+300000;loadPhase='ready';emit('ArrowsAds','adEvent',{kind:'rewarded',phase:'preload_ready',readiness:readiness()});},
    readinessPhase(phase,ms=300000){loadPhase=phase;if(phase==='backoff')retryAt=performance.now()+ms;readyUntil=performance.now()+ms;emit('ArrowsAds','adEvent',{kind:'rewarded',phase:phase==='ready'?'preload_ready':'preload_start',readiness:readiness()});},
    async startAudio(){chunks=[];recordingContext=new Original();await recordingContext.resume();const sink=recordingContext.createMediaStreamDestination();recordingContext.createMediaStreamSource(destination.stream).connect(sink);recorder=new MediaRecorder(sink.stream,{mimeType:'audio/webm;codecs=opus'});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();},
    stopAudio(){return new Promise(r=>{recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());await recordingContext.close();r(Array.from(bytes));};recorder.stop();});}
  };
  addEventListener('DOMContentLoaded',()=>{const label=document.createElement('div');label.id='qa-recording-source';label.textContent='CURRENT APK WEB PAYLOAD · SEEDED QA · CONTROLLED AD TRANSPORT';label.style.cssText='position:fixed;bottom:1px;left:0;right:0;z-index:999;pointer-events:none;text-align:center;font:8px sans-serif;color:#8291a8;background:#1e1e2c';document.body.append(label);});
}
