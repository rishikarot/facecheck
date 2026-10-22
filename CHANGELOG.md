# FaceCheck SDK v1.1.0 · 22 October 2026

- Added portrait selfie camera **inline** inside the reference-photo step, with framing guide, capture/cancel, retake on face-detection error, and automatic preview after successful capture.
- Separated reference camera lifecycle from the live challenge camera to avoid unexpected camera position changes.
- Added a built-asset health panel, deployment troubleshooting, and a version-specific installation manifest check.
- Improved missing-library error messages, cache reset controls, and Safari/mobile layout.
- Bumped service-worker cache to `facecheck-sdk-v1.1-static` to replace earlier cached files.
- Preserved photo-to-photo similarity (without liveness) and camera-only guided liveness + match as clearly distinct modes.
- This source package still requires GitHub Actions to fetch local JS libraries and AI model weights. The binaries are **not** included inside the ZIP.

Validation: Node engine tests, syntax checks, and headless simulated-camera UX smoke tests passed. True biometric inference, model downloading through GitHub Actions, physical iPhone cameras, and anti-spoof robustness were not exercised here.
