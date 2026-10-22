/* FaceCheck SDK 1.1: static same-origin cache ONLY. No user photos/frames. */
const CACHE='facecheck-sdk-v1.1-static';
const STATIC=['./','./index.html','./main.js','./styles/facecheck.css','./src/index.js','./src/widget.js','./src/engine.js','./assets-manifest.json',
'./assets/vendor/face-api.min.js','./assets/vendor/mediapipe/vision_bundle.mjs',
'./assets/vendor/mediapipe/wasm/vision_wasm_internal.js','./assets/vendor/mediapipe/wasm/vision_wasm_internal.wasm',
'./assets/vendor/mediapipe/wasm/vision_wasm_nosimd_internal.js','./assets/vendor/mediapipe/wasm/vision_wasm_nosimd_internal.wasm',
'./assets/models/face_landmarker.task',
'./assets/models/ssd_mobilenetv1_model-weights_manifest.json','./assets/models/ssd_mobilenetv1_model-shard1','./assets/models/ssd_mobilenetv1_model-shard2',
'./assets/models/face_landmark_68_model-weights_manifest.json','./assets/models/face_landmark_68_model-shard1',
'./assets/models/face_recognition_model-weights_manifest.json','./assets/models/face_recognition_model-shard1','./assets/models/face_recognition_model-shard2'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(let i=0;i<STATIC.length;i+=4){await Promise.all(STATIC.slice(i,i+4).map(async path=>{const url=new URL(path,self.registration.scope);const r=await fetch(new Request(url,{cache:'reload'}));if(!r.ok)throw Error('Offline asset missing: '+path);await cache.put(url,r);}));}await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('facecheck-sdk-')&&k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==location.origin||!url.pathname.startsWith(new URL('./',self.registration.scope).pathname))return;event.respondWith((async()=>{const hit=await caches.match(event.request);if(hit)return hit;try{return await fetch(event.request)}catch{if(event.request.mode==='navigate'){const page=await caches.match(new URL('./index.html',self.registration.scope));if(page)return page;}return new Response('Offline file unavailable',{status:503})}})())});
