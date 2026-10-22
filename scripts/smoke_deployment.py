#!/usr/bin/env python3
"""Verify ACTUAL GitHub Pages URLs after deploy, not just the artifact contents."""
import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

REQUIRED = (
    'assets/vendor/face-api.min.js',
    'assets/vendor/mediapipe/vision_bundle.mjs',
    'assets/models/face_landmarker.task',
    'assets/models/ssd_mobilenetv1_model-weights_manifest.json',
    'assets/models/face_recognition_model-weights_manifest.json',
)


def url_for(base_url, path, run_id):
    return urllib.parse.urljoin(base_url.rstrip('/') + '/', path) + '?fc_run=' + urllib.parse.quote(run_id)


def request(url, method='GET'):
    req = urllib.request.Request(url, method=method, headers={'User-Agent': 'facecheck-live-smoke/1.0', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache'})
    with urllib.request.urlopen(req, timeout=35) as response:
        return response.status, response.read() if method == 'GET' else response.headers


def probe(base_url, expected, run_id):
    _, body = request(url_for(base_url, 'assets-manifest.json', run_id))
    manifest = json.loads(body)
    if manifest.get('built') is not True or manifest.get('sdk') != expected:
        raise RuntimeError(f'Incomplete or stale manifest: expected sdk={expected}, found sdk={manifest.get("sdk")}; built={manifest.get("built")}')
    named = {f['path']: int(f['bytes']) for f in manifest.get('files', [])}
    for path in REQUIRED:
        if path not in named:
            raise RuntimeError(f'Manifest omits {path}')
        _, headers = request(url_for(base_url, path, run_id), method='HEAD')
        length = headers.get('Content-Length')
        if length is not None and int(length) < min(1024, named[path]):
            raise RuntimeError(f'{path} returned too few bytes ({length})')
    return len(named)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--url', required=True)
    p.add_argument('--version', required=True)
    p.add_argument('--run-id', default='manual')
    p.add_argument('--attempts', type=int, default=6)
    p.add_argument('--pause', type=int, default=8)
    args = p.parse_args()
    last = None
    for attempt in range(1, args.attempts + 1):
        try:
            n = probe(args.url, args.version, args.run_id)
            print(f'OK: published FaceCheck {args.version} manifest + 5 core AI files are online; {n} manifest assets.')
            return 0
        except (urllib.error.URLError, ValueError, RuntimeError, json.JSONDecodeError) as error:
            last = error
            print(f'Public site check {attempt}/{args.attempts} failed: {error}', flush=True)
            if attempt < args.attempts:
                time.sleep(args.pause)
    print(f'::error title=FaceCheck deployed site is missing AI models::Please fix Pages Source to GitHub Actions. Last failure: {last}', file=sys.stderr)
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
