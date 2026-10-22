#!/usr/bin/env python3
"""Fail fast if branch-based GitHub Pages may overwrite the FaceCheck artifact."""
import json
import os
import sys
import urllib.error
import urllib.request


def validate_pages_settings(pages):
    actual = pages.get('build_type')
    if actual == 'workflow':
        return 'OK: GitHub Pages uses Actions workflows as its only publishing source.'
    source = pages.get('source') or {}
    raise ValueError(
        f'Competing GitHub Pages publisher detected: build_type={actual!r}, '
        f'branch={source.get("branch")!r}.\n'
        'FIX ONCE: Repository > Settings > Pages > Build and deployment > '
        'Source > GitHub Actions. Then rerun Publish FaceCheck SDK demo.\n'
        'Until changed, the default pages build and deployment workflow can '
        'overwrite the complete site with model-free repository source.'
    )


def main():
    repo = os.getenv('GITHUB_REPOSITORY', 'rishikarot/facecheck')
    token = os.getenv('GH_TOKEN', '')
    if not token:
        print('ERROR: GH_TOKEN is missing; cannot verify GitHub Pages publishing source.', file=sys.stderr)
        return 1
    endpoint = f'https://api.github.com/repos/{repo}/pages'
    req = urllib.request.Request(endpoint, headers={
        'Accept': 'application/vnd.github+json',
        'Authorization': f'Bearer {token}',
        'User-Agent': 'facecheck-pages-guard/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
    })
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            pages = json.load(response)
        print(validate_pages_settings(pages))
    except (urllib.error.URLError, ValueError, KeyError) as err:
        print(f'::error title=FaceCheck Pages source check failed::{str(err).replace(chr(10), " | ")}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
