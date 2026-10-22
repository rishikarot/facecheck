# FaceCheck SDK v1.2.0

A local-first, reusable JavaScript face comparison and guided-liveness component, with a standalone HTML demo for GitHub Pages and an example React wrapper.

### The three modes

- **Live face check** — one person, fresh camera input, randomized motion challenges, then compare to the single-face reference. Motion checks are heuristic, not certified PAD.
- **Compare two photos** — compare two images, no liveness claim.
- **Find in group (new)** — use one reference selfie/photo to locate a candidate among multiple visible faces in an uploaded group photograph or a rear-camera snapshot. Outputs similarity suggestions; no liveness or attendance authorization.

The demo processes photos and video frames locally and has no backend. The **source ZIP excludes model binaries**; `.github/workflows/deploy.yml` downloads/publishes them during GitHub Actions deployment. Offline operation depends on a completed first visit and service-worker cache retention. Never commit personal photos to the public repository.

### Deploy in your existing GitHub repo

1. Open `https://github.com/rishikarot/facecheck` and use a local clone (or GitHub Desktop).
2. Extract the **complete v1.2.0 ZIP** into the repo root, preserving `.github/workflows/deploy.yml`, `src/`, `styles/`, `scripts/`, and `sw.js`.
3. Commit and push to `main`.
4. Go to **Settings → Pages**. Set **Source = GitHub Actions**.
5. In **Actions**, run **Publish FaceCheck SDK demo** if necessary. Confirm the build and deployment succeed.
6. Check `https://rishikarot.github.io/facecheck/assets-manifest.json` (expected `"sdk":"1.2.0"`, `"built":true`) and then `https://rishikarot.github.io/facecheck/`.
7. If the old version persists, use **Clear app cache & reload** in FaceCheck.

`src/index.js` remains a short valid entry point; the asset verifier explicitly allows it. This prevents a prior false build failure.

### Developer usage

```javascript
import { FaceCheckWidget } from './src/index.js';
const verifier=new FaceCheckWidget({container:'#facecheck',baseUrl:'./assets/',onResult:result=>console.log(result)});
await verifier.setReference(referenceFile); // Single clear reference face
verifier.setMode('group'); // Or 'live' / 'photo'
```

See [GROUP_MATCH_GUIDE.md](GROUP_MATCH_GUIDE.md) for `FaceCheckEngine.findReferenceInGroup()` and structured result details.

### Tests

Run `npm test` (Node 22) for deterministic engine configuration and group-ranking unit tests. The `tests/ui_group_smoke.py` test is optional and needs locally installed `playwright`, Pillow and Chromium; it mocks ML inference to validate upload/camera UX. The actual offline model binaries and face matching on physical devices have not been validated in this environment.

### Security & operational constraints

This is a prototype, not official identity authentication. The similarity index is not a confidence probability. Camera-snapshot group matching must never automatically mark attendance or assert live presence; use supervision, appropriate consent, and stronger PAD controls for higher-risk workflows. No Aadhaar content is required by the SDK.
