import {FaceCheckEngine,ACTIONS,normalizePolicy} from './engine.js';
const $=(parent,id)=>parent.querySelector(`[data-fc="${id}"]`);
const ICONS={blink:'eye',turn:'arrows',pitch:'vertical',smile:'smile',hold:'focus'};
const LABELS={blink:'Blink',turn:'Turn',pitch:'Look',smile:'Smile',hold:'Stay still'};
const FULL_LABELS={blink:'Blink your eyes',turn:'Turn your head',pitch:'Look up or down',smile:'Give me a smile',hold:'Stay still'};
const SVG={
 eye:'<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/>',
 arrows:'<path d="M4 12h16M8 8l-4 4 4 4m8-8 4 4-4 4"/>',
 vertical:'<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
 smile:'<circle cx="12" cy="12" r="9"/><path d="M7.5 14.5Q12 19 16.5 14.5M8 9h.01M16 9h.01"/>',
 focus:'<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><circle cx="12" cy="12" r="3"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 camera:'<rect x="2" y="6" width="20" height="15" rx="3"/><circle cx="12" cy="13.5" r="4"/><path d="M8 6 9 3h6l1 3"/>',
 upload:'<path d="M12 16V3m-4 4 4-4 4 4M4 17v4h16v-4"/>',
 refresh:'<path d="M20 6v5h-5M4 18v-5h5M5.5 9a7 7 0 0 1 12-2L20 11M4 13l2.5 4a7 7 0 0 0 12-2"/>',
 shield:'<path d="m12 2 9 4v6c0 6-4 9-9 10-5-1-9-4-9-10V6z"/><path d="m8 12 3 3 5-6"/>'
};
function icon(id,size=16){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[id]}</svg>`;}
function ghost(){return `<div class="fc-ghost" data-fc="ghost" data-action="blink" aria-hidden="true"><div class="fc-ghost-title">FOLLOW ME <span class="fc-spark">✦</span></div><svg class="fc-ghost-svg" viewBox="0 0 120 120"><g class="fc-ghost-head"><path d="M26 59C26 29 40 14 60 14s34 15 34 45-14 47-34 47S26 89 26 59Z" fill="#b6eee8" fill-opacity=".23" stroke="#f1fffc" stroke-width="2.5"/><path d="M39 49q9-6 17 0m8 0q8-6 17 0" stroke="#d8fffb" stroke-width="2" fill="none"/><g class="fc-open-eyes"><ellipse cx="48" cy="59" rx="8" ry="5.5" stroke="#fff" fill="none" stroke-width="2.5"/><ellipse cx="74" cy="59" rx="8" ry="5.5" stroke="#fff" fill="none" stroke-width="2.5"/><circle cx="48" cy="59" r="2.5" fill="#fff"/><circle cx="74" cy="59" r="2.5"/></g><g class="fc-shut-eyes"><path d="M40 58q8 6 16 0m10 0q8 6 16 0" fill="none" stroke="#fff" stroke-width="3.3" stroke-linecap="round"/></g><path d="M61 61l-4 12q4 4 8 0" fill="none" stroke="#defcf8" stroke-width="2"/><path class="fc-mouth-neutral" d="M49 85q12 5 24 0" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path class="fc-mouth-smile" d="M43 82q17 24 34 0" fill="none" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/></g><g class="fc-arrows-x" fill="none" stroke="#c5fff1" stroke-width="3" stroke-linecap="round"><path d="M3 57h16m-8-7-8 7 8 7m106-7h-16m8-7 8 7-8 7"/></g><g class="fc-arrows-y" fill="none" stroke="#c5fff1" stroke-width="3" stroke-linecap="round"><path d="M60 2v13m-7-6 7-7 7 7m-7 109v-12m-7 5 7 7 7-7"/></g><g class="fc-hold-ring" fill="none" stroke="#a9ffdc" stroke-width="1.8"><circle cx="60" cy="61" r="55" stroke-dasharray="4 5"/></g></svg></div>`}
function cardStep(k,status='pending'){return `<span class="fc-chip ${status}" data-action="${k}"><span class="fc-chip-icon">${status==='passed'?icon('check',15):icon(ICONS[k],15)}</span><span>${LABELS[k]}</span></span>`;}
const mark=(status)=>status==='ok'?'good':status==='bad'?'bad':'';
export class FaceCheckWidget extends EventTarget{
  constructor({container,baseUrl,policy,showReferencePicker=true,onResult,onProgress}={}){
    super();this.el=typeof container==='string'?document.querySelector(container):container;
    if(!this.el)throw Error('FaceCheck container not found');
    this.engine=new FaceCheckEngine({baseUrl,policy});this.policy=this.engine.policy;
    this.showReferencePicker=showReferencePicker;this.onResult=onResult;this.onProgress=onProgress;
    this.mode='live';this.camera=null;this.referenceCamera=null;this.cameraMode=null;this.raf=0;this.run=0;this.retry=0;this.state='idle';this.actionOrder=[];this.finished=[];this.lastHint='';this.lastAction='';this.latestResult=null;
    this.render();this.bind();
  }
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));if(type==='result')this.onResult?.(detail);if(type==='progress')this.onProgress?.(detail);}
  n(id){return $(this.el,id);}
  render(){this.el.classList.add('facecheck-root');this.el.innerHTML=`
  <section class="fc-layout" aria-label="FaceCheck demo">
   <div class="fc-intro"><div class="fc-logo"><span class="fc-logo-mark">◉</span><div><strong>FaceCheck</strong><small>Face matching & guided liveness</small></div></div><span class="fc-version">SDK 1.1.0</span></div>
   <div class="fc-how"><span><b>1</b> Add reference</span><span><b>2</b> Choose test</span><span><b>3</b> Get result</span></div>
   <section class="fc-health" data-fc="healthPanel" aria-live="polite"><div class="fc-health-heading"><strong data-fc="healthHeading">Checking offline face model…</strong><button type="button" class="fc-btn fc-mini-btn" data-fc="healthRetry">Check again</button></div><p data-fc="healthDetails">The face model files must be installed on this website before recognition can run.</p><div class="fc-health-actions"><button type="button" class="fc-btn fc-mini-btn" data-fc="clearCache">Clear app cache & reload</button><a data-fc="manifestLink" href="./assets-manifest.json" target="_blank" rel="noopener">View installation manifest</a></div></section>
   <section class="fc-card" ${this.showReferencePicker?'':'hidden'}><div class="fc-section"><div><h2>Reference face</h2><p>Use a clear face photo, or take one now.</p></div><span class="fc-mini">Step 1</span></div>
    <div class="fc-reference"><div class="fc-photo" data-fc="referenceFrame"><div class="fc-ph-placeholder">${icon('camera',24)}<span>No photo yet</span></div><img data-fc="referenceImage" alt="Reference portrait" hidden></div>
      <div class="fc-reference-side"><b data-fc="referenceLabel">Add a reference</b><p>Face matching compares against this image. It doesn't establish legal identity.</p><div class="fc-actions"><label class="fc-btn fc-solid">${icon('upload')} Upload photo<input type="file" data-fc="referenceFile" accept="image/jpeg,image/png,image/webp" hidden></label><button data-fc="takeRef" type="button" class="fc-btn">${icon('camera')} Take selfie</button></div></div></div>
    <div class="fc-ref-capture" data-fc="referenceCameraPanel" hidden aria-label="Reference selfie camera">
      <div class="fc-ref-capture-header"><strong>${icon('camera')} Take your reference selfie</strong><span>Step 1 · Camera</span></div>
      <p>Look into the camera and keep your whole face inside the guide. Then tap <b>Use this selfie</b>.</p>
      <div class="fc-ref-video-wrap"><video data-fc="referenceVideo" autoplay playsinline muted aria-label="Live reference selfie preview"></video><div class="fc-ref-oval" aria-hidden="true"></div><span class="fc-ref-overlay">Face the camera · good lighting</span></div>
      <div class="fc-ref-controls"><button type="button" class="fc-btn fc-solid" data-fc="captureReference">${icon('camera')} Use this selfie</button><button type="button" class="fc-btn" data-fc="cancelReference">Cancel</button></div>
      <p class="fc-ref-help" data-fc="referenceCameraStatus" role="status">Your picture stays on this device. This is a reference photo, not a liveness check.</p>
    </div>
   </section>
   <section class="fc-card"><div class="fc-section"><div><h2>Choose a check</h2><p>One simple step to see how closely two faces match.</p></div><span class="fc-mini">Step 2</span></div>
    <div class="fc-mode-grid"><button class="fc-mode selected" data-fc="liveMode"><div class="fc-mode-ico">${icon('shield',20)}</div><b>Live face check</b><small>Camera + random motions + face match</small></button><button class="fc-mode" data-fc="photoMode"><div class="fc-mode-ico">${icon('upload',20)}</div><b>Compare two photos</b><small>Similarity test only, not live verification</small></button></div>
    <div data-fc="liveConfig" class="fc-config"><details><summary>Challenge preferences <span>Optional</span></summary><div class="fc-settings"><p>Three randomized movements, followed by holding still. Enabled actions apply to this demo only.</p><div class="fc-config-chips">${['blink','turn','pitch','smile'].map(a=>`<label><input type="checkbox" data-action-toggle="${a}" checked> ${LABELS[a]}</label>`).join('')}</div><p class="fc-config-hint">Full-security policies must be enforced by the hosting application, not the user interface.</p></div></details></div>
    <div data-fc="photoInputArea" hidden class="fc-photo-upload"><label class="fc-btn fc-solid fc-wide">${icon('upload')} Choose comparison photo<input data-fc="compareFile" type="file" accept="image/jpeg,image/png,image/webp" hidden></label><p>Uploads are allowed for a <b>similarity test</b>. No liveness claim will be made.</p></div>
    <button data-fc="startLive" class="fc-btn fc-solid fc-wide fc-go">${icon('camera')} Start guided camera check</button>
    <p class="fc-status" data-fc="status" role="status">Choose a reference face to begin.</p>
    <div data-fc="cameraPanel" class="fc-camera-panel" hidden>
     <div class="fc-camera-wrap"><video data-fc="video" autoplay muted playsinline></video>
       <div class="fc-camera-instruction"><span class="fc-pulse"></span><div><b data-fc="overlayHeading">Position your face</b><small data-fc="overlaySub">Stay inside the oval.</small></div></div>
       <div class="fc-portrait-oval"></div>
       ${ghost()}
       <div class="fc-counter" data-fc="counter">Getting ready</div>
     </div>
     <div class="fc-guide"><span class="fc-guide-avatar">✦</span><div class="fc-guide-text"><b data-fc="coachHeading">Hello there!</b><p data-fc="coachText">I'll guide you through the check. Just follow the little face above.</p></div></div>
     <div class="fc-chip-row" data-fc="chips" aria-label="Challenge progress"></div>
     <div class="fc-camera-actions"><button class="fc-btn" data-fc="cancel">Close camera</button><button class="fc-btn fc-solid" data-fc="retry" hidden>${icon('refresh')} Try again</button></div>
     <p class="fc-retry-text" data-fc="retryText"></p>
    </div>
   </section>
   <section class="fc-result" data-fc="resultBox" hidden aria-live="polite"><div class="fc-result-symbol" data-fc="resultIcon">✓</div><div><h2 data-fc="resultTitle">Ready</h2><p data-fc="resultInfo">—</p><div class="fc-result-metrics" data-fc="metrics"></div></div></section>
   <details class="fc-tech"><summary>Privacy, model status & integration</summary><p>Models run in this browser. No images are sent to a server by this demo. Initial loading requires the published model assets. Photo comparison is not identity verification. Motion gestures are not certified anti-spoofing and can be fooled by video replay or injected camera feeds.</p><div class="fc-tech-meta" data-fc="technical">Local assets: loading on demand</div></details>
  </section>`;}
  bind(){this.n('referenceFile').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)this.setReference(f).catch(e=>this.error(e));e.target.value='';});
    this.n('compareFile').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)this.comparePhotos(f).catch(e=>this.error(e));e.target.value='';});
    this.n('takeRef').addEventListener('click',()=>this.openReferenceCamera().catch(e=>this.error(e)));
    this.n('captureReference').addEventListener('click',()=>this.captureReference().catch(e=>this.referenceError(e)));
    this.n('cancelReference').addEventListener('click',()=>this.stopReferenceCamera());
    this.n('healthRetry').addEventListener('click',()=>this.checkInstallation());
    this.n('clearCache').addEventListener('click',()=>this.clearAppCache());
    this.n('liveMode').addEventListener('click',()=>this.setMode('live'));
    this.n('photoMode').addEventListener('click',()=>this.setMode('photo'));
    this.n('startLive').addEventListener('click',()=>this.startLiveVerification().catch(e=>this.error(e)));
    this.n('cancel').addEventListener('click',()=>this.stopCamera());
    this.visibilityHandler=()=>{if(document.hidden&&(this.camera||this.referenceCamera)){this.stopCamera();this.stopReferenceCamera();this.status('Camera was closed because you left the page. Start again for privacy.');}};
    document.addEventListener('visibilitychange',this.visibilityHandler);
    this.checkInstallation().catch(()=>{});
  }
  async setReference(input){this.status('Checking the reference face…');const data=await this.engine.setReference(input);this.n('referenceImage').src=data.preview;this.n('referenceImage').hidden=false;this.n('referenceFrame').querySelector('.fc-ph-placeholder').hidden=true;this.n('referenceLabel').textContent='Reference face is ready';this.status('Reference is ready. Choose a live check or compare two photos.','good');this.n('resultBox').hidden=true;this.stopReferenceCamera();this.emit('reference',{status:'ready',quality:{detectionConfidence:Math.round(data.confidence*100)}});return data;}
  setMode(mode){if(!['live','photo'].includes(mode))return;this.stopCamera();this.stopReferenceCamera();this.mode=mode;this.n('liveMode').classList.toggle('selected',mode==='live');this.n('photoMode').classList.toggle('selected',mode==='photo');this.n('startLive').hidden=mode==='photo';this.n('photoInputArea').hidden=mode!=='photo';this.n('liveConfig').hidden=mode==='photo';this.n('resultBox').hidden=true;this.status(mode==='live'?'Live mode needs the camera and movements.':'Photo mode compares two saved images only — not live verification.');}
  status(message,type=''){const node=this.n('status');node.textContent=message;node.dataset.status=type;}
  error(e){this.status(e.message||String(e),'bad');this.emit('error',{message:e.message||String(e)});}
  async comparePhotos(file){if(!this.engine.reference)throw Error('Please add your reference photo first.');this.status('Comparing the two photos on your device…');const r=await this.engine.compare(file);this.showResult(r);return r;}
  async openCamera(){this.stopReferenceCamera();if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires HTTPS (or localhost) and permission.');const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:960},height:{ideal:1280},frameRate:{ideal:24}}});
    this.camera=stream;this.n('video').srcObject=stream;await this.n('video').play();this.n('cameraPanel').hidden=false;this.n('startLive').hidden=true;this.n('takeRef').disabled=true;return stream;}
  async openReferenceCamera(){
    this.stopCamera();this.stopReferenceCamera();
    if(!navigator.mediaDevices?.getUserMedia)throw Error('The camera needs HTTPS or localhost. You can still upload a photo instead.');
    const panel=this.n('referenceCameraPanel'),camera=this.n('referenceVideo');
    this.n('takeRef').disabled=true;
    panel.hidden=false;this.n('referenceCameraStatus').textContent='Opening your front camera…';
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'user'},width:{ideal:720},height:{ideal:960},frameRate:{ideal:24}}});
      this.referenceCamera=stream;camera.srcObject=stream;await camera.play();
      this.n('referenceCameraStatus').textContent='Looking good? Tap “Use this selfie”. You can retry without leaving this area.';
      panel.scrollIntoView?.({behavior:'smooth',block:'nearest'});
    }catch(e){this.stopReferenceCamera();throw Error('Could not open the front camera. Please allow camera access or upload a photo. '+e.message);}
  }
  referenceError(e){const message=e?.message||String(e);this.n('referenceCameraStatus').textContent='I couldn’t use that selfie. '+message+' Try moving back or improving the light, then take it again.';this.status('Reference selfie not accepted yet — camera remains open.','bad');this.n('captureReference').disabled=false;this.emit('error',{message});}
  async captureReference(){
    const video=this.n('referenceVideo');if(!this.referenceCamera?.getVideoTracks().some(t=>t.readyState==='live'))throw Error('The camera session ended. Reopen it to take a selfie.');
    const btn=this.n('captureReference');btn.disabled=true;
    this.n('referenceCameraStatus').textContent='Checking your selfie locally…';
    try{
      const photo=await this.engine.captureFrame(video);
      const result=await this.setReference(photo);
      this.status('Selfie captured! Your reference is ready. Now choose a check.','good');
      return result;
    }catch(e){this.referenceError(e);return null;}
    finally{btn.disabled=false;}
  }
  stopReferenceCamera(){
    if(this.referenceCamera)this.referenceCamera.getTracks().forEach(t=>t.stop());
    this.referenceCamera=null;
    if(this.n('referenceVideo'))this.n('referenceVideo').srcObject=null;
    if(this.n('referenceCameraPanel'))this.n('referenceCameraPanel').hidden=true;
    if(this.n('takeRef'))this.n('takeRef').disabled=false;
  }
  async checkInstallation(){
    const heading=this.n('healthHeading'),detail=this.n('healthDetails');
    heading.textContent='Checking offline face model…';
    const root=this.engine.baseUrl;
    const files=['vendor/face-api.min.js','models/ssd_mobilenetv1_model-weights_manifest.json','models/face_landmark_68_model-weights_manifest.json','models/face_recognition_model-weights_manifest.json','vendor/mediapipe/vision_bundle.mjs','models/face_landmarker.task'];
    const expectedManifest=new URL('../assets-manifest.json',root);
    try{
      const manifestResponse=await fetch(expectedManifest,{cache:'no-store'});
      if(!manifestResponse.ok)throw Error('Deployment manifest not found (HTTP '+manifestResponse.status+'). Your Pages site may be publishing source files instead of the GitHub Actions build.');
      const manifest=await manifestResponse.json();
      if(manifest.built!==true||manifest.sdk!=='1.1.0')throw Error('Outdated or incomplete deployment manifest. Run “Publish FaceCheck SDK demo” and ensure Pages Source is GitHub Actions.');
      const issues=[];
      for(const path of files){
        const url=new URL(path,root);
        try{
          const r=await fetch(url,{method:'GET',cache:'no-store'});
          const size=Number(r.headers.get('content-length')||0);
          if(!r.ok||(!size&&r.headers.get('content-type')?.includes('text/html'))||size&&size<120)issues.push(path+': HTTP '+r.status);
          await r.body?.cancel();
        }catch(e){issues.push(path+': '+e.message)}
      }
      if(issues.length)throw Error('Missing offline files: '+issues.join(', '));
      this.n('healthPanel').dataset.health='ready';heading.textContent='Offline face models installed';detail.textContent='All core face and liveness model paths are reachable from this GitHub Pages site.';
    }catch(e){this.n('healthPanel').dataset.health='missing';heading.textContent='Setup incomplete — face models unavailable';detail.textContent=e.message+' · Fix: Settings → Pages → GitHub Actions; run the deployment workflow. The source ZIP does not contain binary AI models.';}
  }
  async clearAppCache(){
    if(!confirm('Remove only FaceCheck cached files and reload? This does not delete your GitHub files.'))return;
    this.stopCamera();this.stopReferenceCamera();
    if('serviceWorker' in navigator)for(const reg of await navigator.serviceWorker.getRegistrations()){if(reg.scope.startsWith(new URL('./',location.href).href))await reg.unregister();}
    if('caches' in window)for(const key of await caches.keys()){if(key.startsWith('facecheck-sdk-'))await caches.delete(key);}
    location.reload();
  }
  selectedActions(){return [...this.el.querySelectorAll('[data-action-toggle]:checked')].map(x=>x.getAttribute('data-action-toggle'));}
  async startLiveVerification(){this.stopReferenceCamera();if(!this.engine.reference)throw Error('Add a reference photo first.');this.stopCamera();const actions=this.selectedActions();if(actions.length<2)throw Error('Keep at least two movement checks enabled for this demo.');this.engine.policy=normalizePolicy({...this.policy,actions,count:Math.min(3,actions.length)});this.cameraMode='live';this.retry=0;this.n('resultBox').hidden=true;
    this.status('Opening the front camera and loading local face models…');await this.openCamera();const cameraToken=this.run;
    try {await this.engine.landmarkModel();if(!this.camera||this.cameraMode!=='live'||this.run!==cameraToken)return;this.n('technical').textContent='Offline MediaPipe face landmarker loaded';this.beginChallenge();}
    catch(e){this.stopCamera();throw e;}}
  beginChallenge(){this.cameraMode='live';this.state='running';this.engine.newChallenge();this.actionOrder=[...this.engine.challenge.ordered];this.finished=[];this.lastAction='';this.lastHint='';this.n('retry').hidden=true;this.n('retry').onclick=null;this.n('retryText').textContent=`${Math.max(0,this.policy.retries-this.retry)} retries remaining • video stays open if a check is missed`;
    this.setCoach('Hi! Look straight ahead','Keep your face inside the oval. Once ready, follow the tiny animated face.','Let me see your face','Look towards the camera');this.drawChips();this.status('Camera is live. Follow the guide.');this.loop(++this.run);}
  drawChips(){this.n('chips').innerHTML=this.actionOrder.map(a=>cardStep(a,this.finished.includes(a)?'passed':this.actionOrder[this.finished.length]===a?'active':'pending')).join('');this.n('counter').textContent=`${this.finished.length} / ${this.actionOrder.length} checks`;}
  setCoach(title,body,topTitle=title,topSub=body,action='hold'){this.n('coachHeading').textContent=title;this.n('coachText').textContent=body;this.n('overlayHeading').textContent=topTitle;this.n('overlaySub').textContent=topSub;this.n('ghost').dataset.action=action;}
  loop(token){if(token!==this.run||!this.camera||this.cameraMode!=='live'||this.state!=='running')return;const v=this.n('video');let message;
    try {message=this.engine.processVideo(v);}catch(e){this.pause(e.message);return;}
    if(message?.status==='complete') {this.finished=[...message.completed];this.drawChips();this.setCoach('Wonderful! You did it ✨','All movements passed. Now comparing with the reference…','All checks completed','Face check finished','hold');this.finishLive().catch(e=>this.error(e));return;}
    if(message?.status==='passed'){this.finished=[...message.completed];this.drawChips();this.setCoach('Lovely — that worked!','Next movement, please.','Nice work! ✓','Next action in a moment',message.next);this.emit('progress',{completed:[...this.finished],total:this.actionOrder.length});}
    else if(message?.status==='challenge'){const a=message.action;const hint=message.message;if(this.lastAction!==a||this.lastHint!==hint){this.setCoach(this.headline(a),hint,this.headline(a),hint,a);this.lastAction=a;this.lastHint=hint;}}
    else if(message?.status==='align'){if(message.message!==this.lastHint){this.setCoach('Almost there',message.message,'Center your face',message.message,'hold');this.lastHint=message.message;}}
    this.raf=requestAnimationFrame(()=>this.loop(token));}
  headline(a){return {blink:'Blink gently',turn:'Turn your head',pitch:'Look up or down',smile:'Give me a smile',hold:'Stay still a moment'}[a]||'Follow the guide';}
  pause(reason){this.state='paused';this.run++;cancelAnimationFrame(this.raf);this.n('retry').hidden=false;this.n('retry').innerHTML=`${icon('refresh')} ${this.retry>=this.policy.retries?'Start a fresh check':'Try again'}`;
    this.n('retry').onclick=()=>this.retryChallenge();this.setCoach('Almost! Let’s try again',this.friendlyError(reason),'Check paused','Your camera stays on','hold');this.status('Challenge paused. No face match has been performed.','bad');this.n('retryText').textContent=`${Math.max(0,this.policy.retries-this.retry)} retries left. Every retry starts a fresh randomized challenge.`;this.emit('failure',{reason,kind:'liveness',retryable:true});}
  friendlyError(reason){if(/lost|one face|inside|center|clear/i.test(reason))return 'Move a little back so your full face is inside the oval, then retry.';if(/too long/i.test(reason))return 'That action was tricky to catch. Try it a little more slowly.';if(/more than one/i.test(reason))return 'Only one person should be visible. Try again when you are alone.';return 'Try facing a light source and following the little animated face.';}
  retryChallenge(){if(this.cameraMode!=='live'||!this.camera)return;if(this.retry>=this.policy.retries){this.retry=0;this.status('Starting a fresh challenge. Please look at the camera.');this.beginChallenge();return;}this.retry++;this.beginChallenge();}
  async finishLive(){this.state='matching';this.run++;cancelAnimationFrame(this.raf);const frame=await this.engine.captureFrame(this.n('video'));const proof={actions:[...this.finished]};
    // Keep the camera open until the frame is captured; no arbitrary second-photo fallback.
    this.stopCamera();const result=await this.engine.compare(frame,{liveProof:proof,referenceLabel:'uploaded or captured reference'});this.showResult(result);}
  showResult(r){this.latestResult=r;this.n('resultBox').hidden=false;const status=r.result==='similar'?'similar':r.result==='review'?'review':'different';const live=r.type==='live_face_match';this.n('resultBox').dataset.result=status;
    this.n('resultIcon').textContent=status==='similar'?'✓':status==='review'?'!':'×';
    this.n('resultTitle').textContent=status==='similar'?(live?'Faces look similar':'Photos look similar'):status==='review'?'Needs a clearer comparison':'Faces appear different';
    this.n('resultInfo').textContent=live?'Prototype motion challenge completed. This is not certified identity verification.':'Photo-to-photo comparison only. No live person was verified.';
    this.n('metrics').textContent=`Similarity index ${r.similarityIndex}% (not probability) · Face distance ${r.distance} · ${live?'Live challenge passed':'No liveness check'}`;
    this.status('Comparison completed locally.');this.emit('result',r);}
  stopCamera(){this.run++;cancelAnimationFrame(this.raf);if(this.camera)this.camera.getTracks().forEach(t=>t.stop());this.camera=null;this.cameraMode=null;this.state='idle';if(this.n('video'))this.n('video').srcObject=null;if(this.n('retry')){this.n('retry').onclick=null;this.n('retry').hidden=true;}if(this.n('cameraPanel'))this.n('cameraPanel').hidden=true;if(this.n('startLive'))this.n('startLive').hidden=this.mode==='photo';if(this.n('takeRef'))this.n('takeRef').disabled=false;}
  destroy(){this.stopCamera();this.stopReferenceCamera();document.removeEventListener('visibilitychange',this.visibilityHandler);this.engine.destroy();this.el.replaceChildren();}
}
