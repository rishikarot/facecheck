# FaceCheck SDK v1.2.0 — Find a Face in a Group

## What is new

**Find in group** is a third mode beside **Live face check** and **Compare two photos**.

1. Add a **single-person reference** using **Upload photo** or **Take selfie**.
2. Select **Find in group**, confirm permission to compare faces.
3. **Upload group photo** (JPEG/PNG/WebP) or **Open group camera** and tap **Find matching person** to capture a frame.
4. FaceCheck detects up to 10 faces in that image, compares each face embedding against the reference, and highlights the best qualifying candidate in green. Other detected faces have numbered boxes.
5. Results are **Possible match**, **Needs review**, **No reliable match**, or **No faces found**. Similar-looking faces, small faces, and borderline scores do not pass automatically.

**No model/API changes are required.** The existing face-api.js SSD MobileNet detector and face descriptor network are used. The SDK runs locally with self-hosted models and browser caching after the first visit.

### For SDK integrators

```js
import { FaceCheckEngine } from './src/engine.js';

const engine = new FaceCheckEngine({ baseUrl: './assets/' });
await engine.setReference(referenceSelfieFile); // Only ONE face allowed here

// Input can be a JPEG/PNG/WebP file or canvas captured from a video.
const output = await engine.findReferenceInGroup(groupPhotoFile, {
  source: 'image',       // or 'camera' for a live-camera snapshot
  maxFaces: 10,         // 2 to 15
  ambiguityMargin: 0.08,
  minFacePixels: 65
});

console.log(output.result);  // possible_match | review | no_match | no_faces
console.log(output.best);    // { index, box, distance, similarityIndex, ... } | null
console.log(output.candidates); // all detected, ordered by closest distance
```

For group camera: `const frame = await engine.captureFrame(videoElement); await engine.findReferenceInGroup(frame,{source:'camera'});`

`findReferenceInGroup` does not retain photo/video frames itself. It returns bounding boxes and distances, not facial embedding arrays. Its result always states `liveness: 'not_performed'`, `verifiedIdentity: false`, and `attendanceAuthorized: false`. The demo needs a reference and user permission; browser-local data is not uploaded.

### Decision rules (prototype settings; not calibrated identity probabilities)

- **Possible match**: nearest distance <= 0.48, sufficient face size and gap from next-best face >= 0.08.
- **Review**: nearest distance <= 0.60 but borderline, too small or ambiguous.
- **No reliable match**: all distances > 0.60.
- **No faces found**: nothing detectable in the snapshot.
- Displayed similarity index is a *visual heuristic*: `clamp((1.30 − distance) × 100, 0, 100)`, NOT a probability or measured recognition accuracy.

Face photos with very small faces, motion blur, heavy occlusions or extreme side poses may fail. Recommend close-up group frames where each person's face is at least ~65px across in the processed image. The group image is resized to a maximum of 1800px along its longest edge for browser performance.

### Important attendance/security boundaries

This is **one enrolled face matched against one multi-face image**, NOT roster-wide attendance verification. A camera snapshot or group photo is not proof of live presence; printed or replayed faces may be present. No automatic attendance is marked.

Next stage for field attendance: enroll a consented site roster; match all detected faces to all enrolled references with **unique one-to-one assignment** (no duplicate attendance), confidence and margin checks, optional individual liveness/PAD, and supervisor confirmation. Do not use this prototype alone as the basis for payroll, access control or attendance decisions. Protect face photos/embeddings according to applicable privacy and biometric obligations.

## GitHub Pages deployment to `rishikarot/facecheck`

1. Extract the updated FaceCheck v1.2.0 ZIP into your local clone of `https://github.com/rishikarot/facecheck`, preserving the hidden `.github/workflows/deploy.yml` file.
2. Commit/push to `main`. Make sure **Settings → Pages → Source = GitHub Actions**, not *Deploy from a branch*.
3. In **Actions**, confirm `Publish FaceCheck SDK demo` completes the build *and* deploy jobs. That workflow downloads all face AI assets, verifies them and publishes `dist/`.
4. Visit `https://rishikarot.github.io/facecheck/assets-manifest.json` and confirm `"sdk": "1.2.0"` and `"built": true`. The source ZIP itself does not contain model binaries.
5. Open `https://rishikarot.github.io/facecheck/`, then clear old cache if the UI or version appears stale.

**Never commit people's face photos or videos to a public GitHub repo.** Use the app's inputs at runtime only and with appropriate consent.
