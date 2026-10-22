#!/usr/bin/env bash
# Third-party assets are downloaded in GitHub Actions / once during local setup.
# The published application makes NO CDN requests at runtime.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p assets/vendor/mediapipe/wasm assets/models
curl_flags=(--fail --show-error --silent --location --retry 3 --connect-timeout 20 --max-time 180)
fetch(){ local remote="$1" dest="$2"; echo "Downloading ${dest}";curl "${curl_flags[@]}" "$remote" -o "${dest}.partial";test -s "${dest}.partial" || { echo "Empty download for ${dest}" >&2;exit 1;};mv "${dest}.partial" "$dest";}
fetch 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js' assets/vendor/face-api.min.js
mp='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21'
fetch "$mp/vision_bundle.mjs" assets/vendor/mediapipe/vision_bundle.mjs
for a in vision_wasm_internal.js vision_wasm_internal.wasm vision_wasm_nosimd_internal.js vision_wasm_nosimd_internal.wasm; do fetch "$mp/wasm/$a" "assets/vendor/mediapipe/wasm/$a";done
fetch 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task' assets/models/face_landmarker.task
base='https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'
for f in ssd_mobilenetv1_model-weights_manifest.json ssd_mobilenetv1_model-shard1 ssd_mobilenetv1_model-shard2 face_landmark_68_model-weights_manifest.json face_landmark_68_model-shard1 face_recognition_model-weights_manifest.json face_recognition_model-shard1 face_recognition_model-shard2; do fetch "$base/$f" "assets/models/$f";done
python3 scripts/verify_assets.py
