/** Isolated browser QA adapter. Inject before the UNMODIFIED production bundle.
 * Never imported by src or copied to Android assets. This is not a video SDK. */
export function controlledNative({save,settings}) {
  const listeners=new Map(),events=[],pulses=[];let serial=0,pending=[],request=null,resolveShow=null,loadPhase='ready';
  const emit=(plugin,name,value)=>{for(const l of listeners.values())if(l.plugin===plugin&&l.name===name)l.callback(value);};
  const readiness=()=>({configured:true,phase:loadPhase,ready:loadPhase==='ready',preloadId:'controlled-qa',loadedAt:1,expiresInMs:300000,retryInMs:0,playtest:true});
  localStorage.setItem('arrows.progress.v1',JSON.stringify(save));if(settings)localStorage.setItem('arrows.settings.v1',JSON.stringify(settings));
  const methods={ArrowsStorage:['get','set','remove'],ArrowsAnalytics:['report','flush'],ArrowsAds:['prepareRewarded','prepareInterstitial','status','show','pending','acknowledge','cancelPending'],ArrowsFeedback:['pulse','cancel'],App:['getState','minimizeApp'],SystemBars:['setStyle']};
  window.androidBridge={};window.Capacitor={PluginHeaders:Object.entries(methods).map(([name,names])=>({name,methods:[...names.map(name=>({name,rtype:'promise'})),{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'promise'}]})),
    nativeCallback(plugin,method,options,callback){const id=String(++serial);listeners.set(id,{plugin,name:options.eventName,callback});return id;},
    async nativePromise(plugin,method,o={}){
      if(method==='removeListener'){listeners.delete(o.callbackId);return;}
      if(plugin==='ArrowsStorage'){if(method==='get')return{value:localStorage.getItem(o.key)};if(method==='set')localStorage.setItem(o.key,o.value);if(method==='remove')localStorage.removeItem(o.key);return;}
      if(plugin==='ArrowsAnalytics'){if(method==='report')events.push({...o,at:Date.now()});return{accepted:false,disabled:true};}
      if(plugin==='ArrowsFeedback'){pulses.push({method,...o,at:performance.now()});return;}
      if(plugin==='App')return{isActive:true};if(plugin==='SystemBars')return;
      if(plugin==='ArrowsAds'){
        if(method==='status')return{rewardedState:readiness()};if(method==='prepareRewarded')return readiness();
        if(method==='pending')return{receipts:pending};if(method==='acknowledge'){pending=pending.filter(r=>r.id!==o.id);return;}
        if(method==='cancelPending'){resolveShow?.({shown:false,outcome:'cancelled'});resolveShow=null;return;}
        if(method==='show'){request=o;return new Promise(r=>resolveShow=r);}return;
      }
    }
  };
  const Original=window.AudioContext;let audioContext,destination,recorder,chunks=[];
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(target,...args){if(audioContext&&target===audioContext.destination)connect.call(this,destination);return connect.call(this,target,...args);};
  window.AudioContext=class extends Original{constructor(...args){super(...args);audioContext=this;destination=this.createMediaStreamDestination();}};
  window.assistanceQA={
    snapshot:()=>({request,events,pulses,pending,readiness:readiness()}),
    earned(){if(!request)throw Error('No explicit saved ad request');const receipt={schema:2,intentVersion:1,id:request.requestId,requestId:request.requestId,attempt:request.attempt,mode:request.mode,placement:request.placement};pending.push(receipt);emit('ArrowsAds','adEvent',{...request,phase:'earned'});},
    shown(){emit('ArrowsAds','adEvent',{...request,phase:'show'});},
    dismiss(){resolveShow?.({shown:true,outcome:'dismissed',earned:true});resolveShow=null;},
    background(value){emit('App','appStateChange',{isActive:!value});},
    loading(){loadPhase='loading';emit('ArrowsAds','adEvent',{kind:'rewarded',phase:'preload_start',readiness:readiness()});},
    lateReady(){loadPhase='ready';emit('ArrowsAds','adEvent',{kind:'rewarded',phase:'preload_ready',readiness:readiness()});},
    async startAudio(){await audioContext?.resume();chunks=[];recorder=new MediaRecorder(destination.stream,{mimeType:'audio/webm;codecs=opus'});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();},
    stopAudio(){return new Promise(r=>{recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());r(Array.from(bytes));};recorder.stop();});}
  };
  addEventListener('DOMContentLoaded',()=>{const label=document.createElement('div');label.id='qa-recording-source';label.textContent='CURRENT APK WEB PAYLOAD · SEEDED QA · CONTROLLED AD TRANSPORT';label.style.cssText='position:fixed;bottom:1px;left:0;right:0;z-index:999;pointer-events:none;text-align:center;font:8px sans-serif;color:#8291a8;background:#1e1e2c';document.body.append(label);});
}
