# Deploy FaceCheck SDK v1.1.0 to GitHub Pages

1. Create an empty repository (or update your existing FaceCheck repository). Example name: `facecheck-sdk`.
2. Extract `FaceCheck_SDK_v1_1_GitHub_Ready.zip`. Upload the **contents** to the repository root; include the hidden `.github/workflows/deploy.yml` directory. Use `git add -A && git commit && git push` for reliable nested folders.
3. GitHub repository **Settings → Pages → Source → GitHub Actions**. Do not use branch publishing.
4. Open **Actions → Publish FaceCheck SDK demo** and run it on `main`. The build fetches local model binaries, produces `assets-manifest.json`, verifies all assets and deploys `dist`.
5. Open your published page, e.g. `https://YOURNAME.github.io/facecheck-sdk/` over HTTPS. **Offline face models installed** must appear at the top.
6. Select **Take selfie** in Step 1, look at the inline camera, then **Use this selfie**. For comparison select **Compare two photos** and upload another image. For a live check choose **Live face check → Start guided camera check**.

## Debugging

- `assets/vendor/face-api.min.js` returns 404: Pages is publishing source files, the workflow failed or the wrong repo/branch was deployed. Recheck Pages source + Actions run.
- Build action fails: inspect **Download pinned local AI models** or **Fail on missing SDK files or AI models**. Do not manually dismiss a failure.
- Old version appears: use **Clear app cache & reload** and retry in Safari/Chrome.
- Camera permission denied: grant camera permission, open over HTTPS, and retry. Desktop Safari and iOS Safari require a user gesture.
- Image accepted but no face found: face the camera, ensure even lighting, remove clutter/other people, and capture again. Capture stays open on failure.
- Model loaded but recognition inaccurate: prototype model and uncalibrated thresholds. Do not treat the displayed similarity as a probability.

**Privacy:** Do not upload genuine customer face photos or identity documents into a public repository. Photos in the demo are handled within browser memory only. Gestural liveness does not prove real-person presence against video injection or replay attacks.
