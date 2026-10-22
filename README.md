# FaceCheck SDK v1.1 — reusable face matching + guided motion demo

**Live demo:** deploy this project as a GitHub Pages repository. **Built: 22 October 2026.**

This is a local-first, vanilla JavaScript SDK with a React integration example and a user-friendly standalone page. **It is an MVP and is not official biometric identity authentication or presentation-attack detection.** Photos and videos displayed to a camera, manipulated camera feeds and deepfakes may defeat gesture-based liveness. Do not use this as sole access, employment, financial or government identity evidence.

## v1.1 update — missing-library repair and inline reference selfie

**Root cause of the screenshot error:** the source ZIP intentionally contains an empty `assets/vendor/` and `assets/models/` directory. A simple branch-based GitHub Pages publish serves the interface but returns 404 for `assets/vendor/face-api.min.js`. **Select GitHub Actions** as the Pages source. The packaged build downloads the libraries and models and refuses to deploy if files are missing.

**New camera UX:** On **Take selfie** in Step 1, the front camera opens immediately **inside the Reference face card**. The user sees a larger portrait, oval positioning guide, **Use this selfie**, and **Cancel**. If the photo has no usable face or includes multiple people, the camera remains open and suggests how to retake it. Successful capture fills the reference preview and closes only that camera.

**Health panel:** FaceCheck now checks the versioned `assets-manifest.json` and core library/model paths, explains incomplete deployment at the top of the page, and offers **Clear app cache & reload**.

## What works

- Upload a reference JPEG/PNG/WebP photograph or take a **reference selfie** using the front camera.
- **Compare two photos:** upload a second image to get a similarity result; *liveness not performed*.
- **Guided camera face match:** randomly choose three enabled movements from blink/turn/tilt/smile, followed by a stillness step. Requires a fresh front camera, processes frames locally; still images/videos cannot be uploaded as the live verification input. Three guided retries (and ability to start a fresh session) when an action is missed.
- Animated SVG motion coach, face oval, top instructions, green completed checks, simple results.
- Face distance via face-api.js. Similarity index `(1.3 - distance) × 100` is an **illustrative index**, NOT probability or accuracy. Default similar <= 0.48 Euclidean distance, review <= 0.60, different > 0.60. Thresholds require calibration for real use.
- Offline-ready after the service worker has successfully cached the website and models; all inference happens on-device. Reference photos and camera frames are not stored on the server by the demo.

## GitHub Pages deployment (from a new repository)

1. Create a new empty repository named `facecheck-sdk` (public for GitHub Pages on applicable plans).
2. Clone/download it locally, unpack this ZIP **including `.github/workflows/deploy.yml`**, and commit/push the contents to `main`.
3. GitHub repository **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Go to **Actions → Publish FaceCheck SDK demo**. It runs automatically on a push to main, or choose `Run workflow`.
5. The workflow downloads the pinned face-api.js, MediaPipe and face models, verifies all expected files, and publishes a complete `dist` folder. **No model files are bundled in the source ZIP**; GitHub Actions builds them. A red build is not a deployed working site.
6. Open `https://<your-GitHub-user>.github.io/facecheck-sdk/` over HTTPS and allow camera permissions. Ensure page loads; compare images and test live movements.

### If you see “Missing offline library: vendor/face-api.min.js”

1. In your GitHub repository, confirm `.github/workflows/deploy.yml` exists (the dot and folders matter).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.** Do NOT choose Deploy from a branch.
3. In **Actions → Publish FaceCheck SDK demo**, run the workflow against `main`. The build and deploy jobs must both turn green.
4. Visit `https://YOURNAME.github.io/REPO/assets-manifest.json` — it must contain `"built": true` and `"sdk": "1.1.0"`.
5. Visit `https://YOURNAME.github.io/REPO/assets/vendor/face-api.min.js` — it must return JavaScript, not 404 or an HTML error page.
6. Reload the app and select **Check again**. If an earlier deployment remains cached, click **Clear app cache & reload**.

The source ZIP is **not air-gapped**. It requires the GitHub build to retrieve binary weights once. After deployment they are hosted under your own GitHub Pages origin and eligible for offline caching on a subsequent visit.

For local dev (macOS Terminal with network for initial setup):

```bash
bash scripts/fetch_assets.sh
python3 -m http.server 8000
# Open http://localhost:8000
```

Do not open `index.html` directly as `file://`: ES modules, cameras and local model loads need a web server / secure context.

## Reuse in any vanilla JS app

```js
import {FaceCheckWidget} from './src/index.js';
const widget = new FaceCheckWidget({
  container: '#my-verifier',
  baseUrl: './assets/',
  policy: { actions: ['blink','turn','pitch','smile'], count: 3, retries: 3 },
  onResult: (r) => console.log(r.type, r.result, r.distance),
  onProgress: (p) => console.log('completed', p.completed)
});
// Host may set the reference directly, for example from an authorized app file:
await widget.setReference(referenceFile);
// widget.destroy() on unmount to stop camera and release models.
```

Use `showReferencePicker:false` when the host app provides the reference. The provided `examples/react-wrapper.jsx` shows React mounting. For production React, manage reference/mode updates with component effects or refs rather than remounting an active camera.

## Engine-only use

`FaceCheckEngine` can be imported separately: `setReference(file)`, `compare(file,options)`, `landmarkModel()`, `newChallenge()`, `processVideo(video)`, `captureFrame(video)`, `destroy()`. Avoid exposing verification completion solely through a client-modifiable boolean in a real security-sensitive workflow.

## Privacy and security

- No app backend. The demo neither uploads nor logs images to a server.
- The source ZIP contains no face photos or actual identity data. Never commit test faces into a public GitHub repo.
- Image decoding, models and matching are browser-local. Initial download and service worker caching determines offline resilience; the browser may evict cached files under storage pressure.
- Camera upload cannot be used to pass the **live** mode through this UI, but virtual cameras, prerecorded video shown to a camera, code tampering and deepfakes can still bypass heuristics. For high-risk workflows use a tested PAD vendor, cryptographic challenge/session binding, backend audit and replay protection.
- No Aadhaar integration or legal identity verification in this SDK. Aadhaar can be a host-provided reference through a separate signature-validated identity process.
- Model dependencies are pinned for repeatability, but models sourced from upstream GitHub `master` weight files should be mirrored/hashed and vetted before commercial deployment. Review face-api.js, MediaPipe and other model licenses and privacy obligations for your application.

### Quick Mac terminal deployment example

```bash
# After creating an empty GitHub repository `facecheck-sdk`, clone it:
git clone https://github.com/YOUR_USERNAME/facecheck-sdk.git
cd facecheck-sdk
# Copy ALL extracted package files here, including hidden `.github`.
git add .
git commit -m "Publish FaceCheck SDK demo"
git push -u origin main
```

If you upload through GitHub's browser interface, hidden `.github` can be missed. Without `.github/workflows/deploy.yml` the site will not include face models. Do not copy only `index.html`: the SDK requires all `src/` and `styles/` files, while AI assets are downloaded by the workflow.

**To verify:** after a successful workflow, visit `/facecheck-sdk/assets-manifest.json`. Expect `"built": true`, `"sdk": "1.1.0"`, plus the manifest listing the locally-hosted model files. The script fails deployment if assets are absent.
