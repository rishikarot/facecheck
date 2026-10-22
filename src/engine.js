/** FaceCheck Engine v1.2 — local-only face detection / matching / guided-motion prototype.
 * Not official authentication. No PAD certification; can be fooled by replay to camera.
 */
export const DEFAULT_POLICY = Object.freeze({
  actions: ['blink','turn','pitch','smile'], count: 3, retries: 3,
  matchDistance: 0.48, reviewDistance: 0.60,
  actionTimeoutMs: 15000, calibrationTimeoutMs: 18000,
});
export const ACTIONS = ['blink','turn','pitch','smile','hold'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const now=()=>performance.now();
function abort(message){throw new Error(message)}
function shade(cats,name){return cats?.find(c=>c.categoryName===name)?.score ?? NaN;}
function randOrder(a){let b=[...a];const bytes=new Uint32Array(Math.max(1,b.length));crypto.getRandomValues(bytes);for(let i=b.length-1;i>0;i--){const j=bytes[i]%(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}
function getBox(landmarks){const xs=landmarks.map(x=>x.x),ys=landmarks.map(x=>x.y);const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);return {x:(left+right)/2,y:(top+bottom)/2,w:right-left,h:bottom-top};}
function average(rows,field){return rows.reduce((s,r)=>s+r[field],0)/Math.max(1,rows.length);}
function safeImageInput(file){if(!(file instanceof Blob))abort('Choose a JPEG, PNG, or WebP photo.');if(!['image/jpeg','image/png','image/webp'].includes(file.type))abort('Only JPEG, PNG and WebP images are supported.');if(file.size>12e6)abort('Please use an image smaller than 12 MB.');return file;}
async function fileToCanvas(file,maxDimension=1400){safeImageInput(file);const img=await createImageBitmap(file);try {if(img.width<90||img.height<90)abort('This image is too small. Use a clearer face photo.');const scale=Math.min(1,maxDimension/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.floor(img.width*scale));c.height=Math.max(1,Math.floor(img.height*scale));c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,c.width,c.height);return c;}finally{img.close();}}
async function frameToCanvas(video){if(!video.videoWidth)abort('Camera is not ready');const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d').drawImage(video,0,0);return c;}
export function normalizePolicy(policy={}){
  const p={...DEFAULT_POLICY,...policy};
  p.actions=[...new Set((Array.isArray(p.actions)?p.actions:DEFAULT_POLICY.actions).filter(x=>ACTIONS.includes(x)&&x!=='hold'))];
  if(p.actions.length===0)abort('Select at least one liveness action.');
  p.count=clamp(Number(p.count)||3,1,p.actions.length);
  p.retries=clamp(Number.isFinite(Number(p.retries))?Number(p.retries):3,0,5);
  p.matchDistance=clamp(Number(p.matchDistance)||.48,.30,.70);
  p.reviewDistance=clamp(Number(p.reviewDistance)||.60,p.matchDistance+.02,.80);
  return p;
}
/** Pure group ranking rules, separate from ML. Never force a top-ranked face to be a match.
 * The returned similarity index is illustrative, not the probability of identity.
 */
export function rankGroupCandidates(candidates,{matchDistance=.48,reviewDistance=.60,ambiguityMargin=.08,minFacePixels=65}={}){
  const scored=(candidates||[]).map((c,i)=>({
    index:i+1,
    box:{x:c.box.x,y:c.box.y,width:c.box.width,height:c.box.height},
    distance:c.distance,
    similarityIndex:clamp(Math.round((1.30-c.distance)*100),0,100),
    detectorConfidence:c.confidence,
    facePixels:Math.min(c.box.width,c.box.height),
    quality:c.quality||null
  })).filter(c=>Number.isFinite(c.distance)).sort((a,b)=>a.distance-b.distance);
  if(!scored.length)return {result:'no_faces',best:null,candidates:[],gap:null,explanation:'No face detected. Move closer or use a clearer photo.'};
  const [best,second]=scored;
  const gap=second?second.distance-best.distance:null;
  const tooSmall=best.facePixels<minFacePixels;
  const ambiguous=second&&gap<ambiguityMargin;
  let result='no_match';
  if(best.distance<=matchDistance&&!tooSmall&&!ambiguous)result='possible_match';
  else if(best.distance<=reviewDistance)result='review';
  const explanation=result==='possible_match'?'A likely matching face was located. Please confirm visually before taking any action.'
    :result==='review'?(tooSmall?'The closest face is small or unclear. Move closer for a more reliable match.':ambiguous?'Two people look similarly close to the reference. Please review.':'The closest face is borderline. A clearer image or individual check is needed.')
    :'No sufficiently similar face was found in this image.';
  return {result,best:best||null,candidates:scored,gap:gap==null?null:Math.round(gap*1000)/1000,explanation};
}
export class FaceCheckEngine{
  constructor(opts={}){this.baseUrl=new URL(opts.baseUrl||'./assets/',document.baseURI);this.policy=normalizePolicy(opts.policy);this.faceApi=null;this.mp=null;this.mpPromise=null;this.facePromise=null;this.challenge=null;this.reference=null;this.lastData=null;}
  async loadScript(path,check){if(check())return;await new Promise((resolve,reject)=>{let s=document.createElement('script');s.src=new URL(path,this.baseUrl).href;s.onload=()=>check()?resolve():reject(new Error('Local library did not initialize: '+path));s.onerror=()=>reject(new Error('Offline model file unavailable: '+new URL(path,this.baseUrl).pathname+'. Please verify the GitHub Pages Actions deployment, not branch deployment.'));document.head.appendChild(s);});}
  async faceModels(){if(this.facePromise)return this.facePromise;this.facePromise=(async()=>{
    await this.loadScript('vendor/face-api.min.js',()=>!!window.faceapi);
    const api=window.faceapi,base=new URL('models/',this.baseUrl).href;
    await Promise.all([api.nets.ssdMobilenetv1.loadFromUri(base),api.nets.faceLandmark68Net.loadFromUri(base),api.nets.faceRecognitionNet.loadFromUri(base)]);
    this.faceApi=api;
  })().catch(e=>{this.facePromise=null;throw e});return this.facePromise;}
  async landmarkModel(){if(this.mpPromise)return this.mpPromise;this.mpPromise=(async()=>{
    const sdk=await import(new URL('vendor/mediapipe/vision_bundle.mjs',this.baseUrl).href);
    const visionSDK=sdk.FaceLandmarker?sdk:sdk.default;
    if(!visionSDK?.FilesetResolver||!visionSDK?.FaceLandmarker)abort('Face landmarker is unavailable. Check the GitHub build.');
    const fileset=await visionSDK.FilesetResolver.forVisionTasks(new URL('vendor/mediapipe/wasm/',this.baseUrl).href);
    this.mp=await visionSDK.FaceLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:new URL('models/face_landmarker.task',this.baseUrl).href,delegate:'CPU'},runningMode:'VIDEO',numFaces:2,outputFaceBlendshapes:true,minFaceDetectionConfidence:0.45,minFacePresenceConfidence:0.45,minTrackingConfidence:0.4});
    return this.mp;
  })().catch(e=>{this.mpPromise=null;throw e});return this.mpPromise;}
  async faceDescriptor(canvas){await this.faceModels();const api=this.faceApi;
    let input=canvas;if(Math.min(canvas.width,canvas.height)<360){input=document.createElement('canvas');const factor=Math.min(3,Math.ceil(450/Math.min(canvas.width,canvas.height)));input.width=canvas.width*factor;input.height=canvas.height*factor;input.getContext('2d').drawImage(canvas,0,0,input.width,input.height);}
    const detections=await api.detectAllFaces(input,new api.SsdMobilenetv1Options({minConfidence:.35,maxResults:3})).withFaceLandmarks().withFaceDescriptors();
    if(detections.length!==1)abort(detections.length===0?'I could not find a clear face. Use a well-lit, front-facing photo.':'Please use a photo containing only one person.');
    const face=detections[0]; const confidence=face.detection.score;
    return {descriptor:face.descriptor,confidence,box:face.detection.box};
  }
  /** Find a reference face within a GROUP photo or a captured CAMERA frame.
   * No liveness claim; no identity/attendance authorization. The caller must confirm.
   * Only the original reference may contain exactly one face.
   */
  async prepareImage(input,maxDimension=1800){
    if(input instanceof HTMLCanvasElement)return input;
    return fileToCanvas(input,maxDimension);
  }
  async findReferenceInGroup(input,{maxFaces=10,source='image',matchDistance=this.policy.matchDistance,
    reviewDistance=this.policy.reviewDistance,ambiguityMargin=.08,minFacePixels=65}={}){
    if(!this.reference)abort('Please add your reference selfie/photo first.');
    const image=await this.prepareImage(input,1800);
    if(image.width<160||image.height<160)abort('Group photo is too small. Use a clearer image.');
    await this.faceModels();
    const api=this.faceApi;
    const count=clamp(Math.floor(Number(maxFaces)||10),2,15);
    const detections=await api.detectAllFaces(image,new api.SsdMobilenetv1Options({minConfidence:.30,maxResults:count})).withFaceLandmarks().withFaceDescriptors();
    const measured=detections.map(face=>({
      distance:api.euclideanDistance(this.reference.descriptor,face.descriptor),
      confidence:face.detection.score,
      box:face.detection.box
    }));
    const ranking=rankGroupCandidates(measured,{matchDistance,reviewDistance,ambiguityMargin,minFacePixels});
    return {type:source==='camera'?'group_camera_similarity':'group_photo_similarity',
      ...ranking,detectedFaces:detections.length,imageWidth:image.width,imageHeight:image.height,
      liveness:'not_performed',verifiedIdentity:false,attendanceAuthorized:false,
      notice:'Reference-to-group similarity only. No person has passed liveness. Do not mark attendance automatically.'};
  }
  async setReference(input){const canvas=input instanceof HTMLCanvasElement?input:await fileToCanvas(input);const face=await this.faceDescriptor(canvas);this.reference={...face,canvas};return {confidence:face.confidence,preview:canvas.toDataURL('image/jpeg',.85)};}
  async compare(input,{liveProof=null,referenceLabel='user-supplied reference'}={}){
    if(!this.reference)abort('First add a reference face.');
    const canvas=input instanceof HTMLCanvasElement?input:await fileToCanvas(input);
    const target=await this.faceDescriptor(canvas), d=this.faceApi.euclideanDistance(this.reference.descriptor,target.descriptor);
    const result=d<=this.policy.matchDistance?'similar':d<=this.policy.reviewDistance?'review':'different';
    // For visual orientation only, NOT a biometric probability or measured accuracy.
    const index=clamp(Math.round((1.30-d)*100),0,100);
    return {type:liveProof?'live_face_match':'photo_similarity_test',result,similarityIndex:index,distance:Math.round(d*1000)/1000,
      liveness:liveProof?'prototype_passed':'not_performed',actions:liveProof?.actions||[],referenceSource:referenceLabel,
      verifiedIdentity:false,notice:liveProof?'Live motion checks are prototype-only; not certified presentation-attack detection.':'Two images compared without liveness. This does not verify a person is present.'};
  }
  newChallenge(){const p=this.policy;const ordered=[...randOrder(p.actions).slice(0,p.count),'hold'];this.challenge={ordered,idx:0,started:now(),stepStart:now(),baseline:[],base:null,previous:null,closedPhase:'await_close',eyeCloseAt:0,closedCount:0,openCount:0,holdAt:null,motionAt:null,successes:[],missing:0,lastFrame:-1};return ordered;}
  processVideo(video){const st=this.challenge;if(!st)abort('Start a challenge first.');if(!this.mp)abort('Live landmark model not initialized.');if(!video.videoWidth||video.readyState<2)return {status:'align',message:'Opening your camera…'};
    const t=now();if(t-st.started>90000)abort('The session ended. Try again.');
    // MediaPipe timestamps must be strictly increasing.
    const timestamp=Math.max(t,st.lastFrame+.1);st.lastFrame=timestamp;
    const output=this.mp.detectForVideo(video,timestamp);
    if(output.faceLandmarks?.length!==1){st.missing++;if(st.missing>12)abort(output.faceLandmarks?.length>1?'Only one person should be in the camera.':'I lost your face. Move back inside the guide.');return {status:'align',message:'Center one face in the oval.'};}
    const pts=output.faceLandmarks[0],cats=output.faceBlendshapes?.[0]?.categories||[],box=getBox(pts);st.missing=0;
    if(box.w<.23)return {status:'align',message:'Move a little closer to the camera.'};
    if(box.w>.83)return {status:'align',message:'Move slightly back so your whole face fits.'};
    if(Math.abs(box.x-.5)>.22||Math.abs(box.y-.49)>.26)return {status:'align',message:'Center your face inside the oval.'};
    const features={box,blinkL:shade(cats,'eyeBlinkLeft'),blinkR:shade(cats,'eyeBlinkRight'),smile:(shade(cats,'mouthSmileLeft')+shade(cats,'mouthSmileRight'))/2,
      yaw:(pts[1].x-(pts[33].x+pts[263].x)/2)/Math.max(.01,Math.abs(pts[263].x-pts[33].x)),
      pitch:(pts[1].y-(pts[168].y+pts[152].y)/2)/Math.max(.01,Math.abs(pts[152].y-pts[168].y))};
    if(st.previous && Math.hypot(box.x-st.previous.box.x,box.y-st.previous.box.y)>.27)abort('Face tracking was interrupted. Start a fresh attempt.');st.previous=features;
    if(!st.base){if(Number.isFinite(features.blinkL)&&Number.isFinite(features.blinkR)&&features.blinkL<.5&&features.blinkR<.5){st.baseline.push(features);}if(st.baseline.length>=7){st.base={yaw:average(st.baseline,'yaw'),pitch:average(st.baseline,'pitch'),smile:average(st.baseline,'smile'),blinkL:average(st.baseline,'blinkL'),blinkR:average(st.baseline,'blinkR')};st.stepStart=t;}
      return {status:'align',message:'Look straight ahead, keep your eyes open and hold still.'};}
    const action=st.ordered[st.idx];let done=false, hint='Follow the little face guide.';
    if(t-st.stepStart> (action==='blink'?20000:this.policy.actionTimeoutMs))abort('This step took too long. You can retry with the camera still open.');
    if(action==='blink'){
      const closeL=Math.max(.48,st.base.blinkL+.24),closeR=Math.max(.48,st.base.blinkR+.24),openL=Math.min(.39,st.base.blinkL+.14),openR=Math.min(.39,st.base.blinkR+.14);
      const closed=features.blinkL>closeL&&features.blinkR>closeR,opened=features.blinkL<openL&&features.blinkR<openR;
      if(st.closedPhase==='await_close'){if(closed){st.closedCount++;if(st.closedCount>=2){st.closedPhase='await_open';st.eyeCloseAt=t;}}else st.closedCount=0;hint=st.closedPhase==='await_open'?'Eyes closed! Now open them.':'Close both eyes gently for a moment.';}
      else {if(opened){st.openCount++;if(st.openCount>=2&&t-st.eyeCloseAt>=100)done=true;}else st.openCount=0;hint='Great! Now reopen both eyes.';if(t-st.eyeCloseAt>3500){st.closedPhase='await_close';st.closedCount=0;st.openCount=0;}}
    }else if(action==='turn'){done=Math.abs(features.yaw-st.base.yaw)>.16;hint='Turn your head slowly left or right.';}
    else if(action==='pitch'){done=Math.abs(features.pitch-st.base.pitch)>.10;hint='Tilt your head up or down, keeping your eyes visible.';}
    else if(action==='smile'){done=features.smile>Math.max(.5,st.base.smile+.27);hint='Give me a natural smile!';}
    else if(action==='hold'){const stable=Math.abs(features.yaw-st.base.yaw)<.11&&Math.abs(features.pitch-st.base.pitch)<.08;if(stable){st.holdAt??=t;done=t-st.holdAt>900;}else st.holdAt=null;hint='Look straight ahead and hold still for a moment.';}
    if(done){st.successes.push(action);st.idx++;st.stepStart=t;st.closedPhase='await_close';st.closedCount=0;st.openCount=0;st.holdAt=null;
      if(st.idx===st.ordered.length)return {status:'complete',action,completed:[...st.successes],message:'Wonderful! All checks completed.'};
      return {status:'passed',action,next:st.ordered[st.idx],completed:[...st.successes],message:'Nice work! Next step…'};
    }
    return {status:'challenge',action,completed:[...st.successes],index:st.idx,total:st.ordered.length,message:hint};
  }
  async captureFrame(video){return frameToCanvas(video);}
  destroy(){try{this.mp?.close()}catch{}this.mp=null;this.mpPromise=null;this.reference=null;this.challenge=null;}
}
