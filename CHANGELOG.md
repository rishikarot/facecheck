# FaceCheck SDK — Changes

## v1.2.0 · 22 October 2026

- Added **Find in Group** in the standalone demo (reference selfie/photo against multiple people in an uploaded group picture or a rear-camera snapshot).
- Added `FaceCheckEngine.findReferenceInGroup(...)` and pure `rankGroupCandidates(...)` with quality/margin gates and four explicit results.
- Added numbered overlay boxes, highlighted candidate, ranking metrics and clear warnings that group matching does not verify liveness or authorize attendance.
- Added group consent control, mobile-first group camera preview and compact action buttons.
- Retained existing reference camera, two-photo comparison and one-face randomized live liveness flows.
- Updated `assets-manifest.json` build version, cache version and the source verifier's valid small entry-point check.
- Added unit tests for no match, ambiguities, weak/small faces and clear matches, plus simulated upload/camera UI smoke tests.

## v1.1.0

- Inline reference selfie camera, deployment checks and offline model setup diagnostics.
