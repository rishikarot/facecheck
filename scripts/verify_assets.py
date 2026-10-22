#!/usr/bin/env python3
"""Verifies GitHub Pages dist and original assets; never publish a half-installed app."""
import argparse,hashlib,json,sys
from pathlib import Path
P=argparse.ArgumentParser();P.add_argument('root',nargs='?',default='.')
a=P.parse_args();root=Path(a.root)
MIN={
'assets/vendor/face-api.min.js':100_000,
'assets/vendor/mediapipe/vision_bundle.mjs':50_000,
'assets/vendor/mediapipe/wasm/vision_wasm_internal.js':100_000,
'assets/vendor/mediapipe/wasm/vision_wasm_internal.wasm':2_000_000,
'assets/vendor/mediapipe/wasm/vision_wasm_nosimd_internal.js':100_000,
'assets/vendor/mediapipe/wasm/vision_wasm_nosimd_internal.wasm':2_000_000,
'assets/models/face_landmarker.task':500_000,
}
for name in ('ssd_mobilenetv1_model-weights_manifest.json','face_landmark_68_model-weights_manifest.json','face_recognition_model-weights_manifest.json'):
 MIN[f'assets/models/{name}']=100
for name in ('ssd_mobilenetv1_model-shard1','ssd_mobilenetv1_model-shard2','face_landmark_68_model-shard1','face_recognition_model-shard1','face_recognition_model-shard2'):
 MIN[f'assets/models/{name}']=5000
SOURCE=['index.html','main.js','sw.js','src/index.js','src/widget.js','src/engine.js','styles/facecheck.css']
for f in SOURCE:
 path=root/f
 if not path.is_file() or path.stat().st_size <(40 if f=='src/index.js' else 200):sys.exit(f'MISSING/INVALID SDK code in publish directory: {f}')
files=[]
for path,minimum in MIN.items():
 p=root/path
 if not p.is_file():sys.exit(f'REQUIRED OFFLINE MODEL MISSING: {path}')
 data=p.read_bytes()
 if len(data)<minimum:sys.exit(f'REQUIRED OFFLINE MODEL TOO SMALL: {path}: {len(data)}')
 if data[:50].lower().lstrip().startswith((b'<html',b'<!doctype',b'<error')):sys.exit(f'Incorrect HTML content for {path}')
 files.append({'path':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
for fname in ('ssd_mobilenetv1_model','face_landmark_68_model','face_recognition_model'):
 manifest=root/f'assets/models/{fname}-weights_manifest.json'
 try:
  shards=[s for group in json.loads(manifest.read_text()) for s in group['paths']]
 except Exception as e:sys.exit(f'Invalid model manifest: {manifest}: {e}')
 for shard in shards:
  if not (manifest.parent/shard).is_file():sys.exit(f'Unresolved weight shard {shard} in {fname}')
if root == Path('.'):
 (root/'assets-manifest.json').write_text(json.dumps({'built':True,'sdk':'1.2.0','files':files},indent=2))
else:
 p=root/'assets-manifest.json'
 if not p.is_file() or json.loads(p.read_text()).get('sdk')!='1.2.0':sys.exit('Missing/old final asset manifest')
print(f'OK: {len(files)} self-hosted asset files verified, {sum(x["bytes"] for x in files)/1e6:.1f} MB')
