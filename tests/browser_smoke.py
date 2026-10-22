"""Browser UX test with injected mock camera + model (NOT real biometric inference)."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]

async def main():
  async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=await browser.new_page(viewport={'width':390,'height':844})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    html=(ROOT/'index.html').read_text()
    html=html.replace('<head>', '<head><base href="https://facecheck.invalid/">').replace('<script type="module" src="./main.js"></script>','')
    await page.set_content(html)
    await page.add_style_tag(content=(ROOT/'styles/facecheck.css').read_text())
    engine=(ROOT/'src/engine.js').read_text().replace('export const ','const ').replace('export function ','function ').replace('export class ','class ')
    await page.evaluate('''source => { (0,eval)(source+';globalThis.FaceCheckEngine=FaceCheckEngine;globalThis.normalizePolicy=normalizePolicy;globalThis.ACTIONS=ACTIONS;'); }''',engine)
    widget=(ROOT/'src/widget.js').read_text().replace("import {FaceCheckEngine,ACTIONS,normalizePolicy} from './engine.js';",'').replace('export class FaceCheckWidget','class FaceCheckWidget')
    await page.evaluate('''source => { (0,eval)(source+';globalThis.FaceCheckWidget=FaceCheckWidget;'); }''',widget)
    await page.evaluate('''() => {
      window.HTMLMediaElement.prototype.play=function(){return Promise.resolve()};
      Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{configurable:true,get(){return this._mockSrc||null},set(v){this._mockSrc=v}});
      Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async ()=> ({getTracks:()=>[{stop:()=>{}}], getVideoTracks:()=>[{readyState:'live',stop:()=>{}}]})}});
      Object.defineProperty(HTMLVideoElement.prototype,'videoWidth',{configurable:true,get(){return 320}});
      Object.defineProperty(HTMLVideoElement.prototype,'videoHeight',{configurable:true,get(){return 420}});
      window.faceCheckDemo=new FaceCheckWidget({container:'#facecheck',baseUrl:'https://facecheck.invalid/assets/'});
    }''')
    await page.locator('[data-fc="takeRef"]').click()
    assert await page.locator('[data-fc="referenceCameraPanel"]').is_visible(),'Reference camera not shown inline'
    assert await page.locator('[data-fc="cameraPanel"]').is_hidden(),'Main liveness camera should stay hidden'
    assert await page.locator('[data-fc="referenceVideo"]').is_visible()
    await page.screenshot(path='/mnt/data/FaceCheck_v1_1_inline_camera_demo.png',full_page=True)
    await page.locator('[data-fc="cancelReference"]').click()
    assert await page.locator('[data-fc="referenceCameraPanel"]').is_hidden()
    assert await page.locator('[data-fc="takeRef"]').is_enabled()
    await page.locator('[data-fc="takeRef"]').click()
    await page.evaluate('''() => {
       const w=window.faceCheckDemo;
       w.engine.captureFrame=async ()=>{const c=document.createElement('canvas');c.width=320;c.height=420;c.getContext('2d').fillRect(0,0,320,420);return c};
       w.engine.setReference=async (canvas)=>{w.engine.reference={descriptor:[.1,.2]};return {confidence:.93,preview:canvas.toDataURL('image/png')}};
     }''')
    await page.locator('[data-fc="captureReference"]').click()
    await page.wait_for_timeout(60)
    assert await page.locator('[data-fc="referenceCameraPanel"]').is_hidden(),'Reference camera should close after valid capture'
    assert await page.locator('[data-fc="referenceImage"]').is_visible(),'Reference preview not shown'
    await page.locator('[data-fc="photoMode"]').click()
    assert await page.locator('[data-fc="photoInputArea"]').is_visible()
    assert await page.locator('[data-fc="cameraPanel"]').is_hidden()
    await page.evaluate('''async () => {
       const w=window.faceCheckDemo;
       w.engine.compare=async ()=>({type:'photo_similarity_test',result:'similar',similarityIndex:84,distance:.46});
       await w.comparePhotos(new Blob(['test'],{type:'image/jpeg'}));
    }''')
    assert 'Photos look similar' in await page.locator('[data-fc="resultTitle"]').inner_text()
    assert 'No liveness check' in await page.locator('[data-fc="metrics"]').inner_text()
    assert 'SDK 1.1.0' in await page.locator('.fc-version').inner_text()
    assert not errors,errors
    await page.screenshot(path='/mnt/data/FaceCheck_v1_1_inline_reference_preview.png',full_page=True)
    print('PASS: Inline selfie camera, cancel, retake, capture, preview, photo mode, zero JS page errors')
    await browser.close()

asyncio.run(main())
