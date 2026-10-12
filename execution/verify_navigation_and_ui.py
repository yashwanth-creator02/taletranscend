#!/usr/bin/env python3
"""
verify_navigation_and_ui.py

Deterministic runner for TaleTranscend navigation, hierarchical routing,
accessibility, toast notifications, and brand emblem integrity.
"""
import re
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def run_step(name: str, cmd: list[str]) -> bool:
    print(f"--- Running: {name} ---")
    res = subprocess.run(cmd, cwd=str(PROJECT_ROOT), shell=True)
    if res.returncode != 0:
        print(f"FAILED: {name} exited with code {res.returncode}")
        return False
    print(f"PASSED: {name}")
    return True


def verify_footer_isolation() -> bool:
    print("--- Verifying: Single-Page Footer Isolation Policy ---")
    views_dir = PROJECT_ROOT / "src" / "views"
    violations = []

    for html_file in views_dir.glob("*.html"):
        if html_file.name == "index.html":
            continue
        content = html_file.read_text(encoding="utf-8")
        if "<footer" in content or "site-footer" in content or "home-footer" in content:
            violations.append(html_file.name)

    if violations:
        print(f"FAILED: Found illegal footer tags in inner views: {violations}")
        print("Only index.html (home page) is allowed to contain a footer.")
        return False

    print("PASSED: Footer is exclusively present on index.html.")
    return True


def verify_brand_assets() -> bool:
    print("--- Verifying: Brand Emblem Asset Suite ---")
    required_assets = [
        "public/logo.png",
        "public/logo-wide.png",
        "public/icon.svg",
        "public/apple-touch-icon.png",
        "public/favicon.ico",
        "src/assets/images/logo.png",
    ]
    missing = []
    for asset in required_assets:
        p = PROJECT_ROOT / asset
        if not p.is_file() or p.stat().st_size == 0:
            missing.append(asset)

    if missing:
        print(f"FAILED: Missing or empty brand assets: {missing}")
        return False

    print(f"PASSED: All {len(required_assets)} required brand assets exist and are populated.")
    return True


def main():
    # 1. Structural file integrity checks
    if not verify_footer_isolation():
        sys.exit(1)
    if not verify_brand_assets():
        sys.exit(1)

    # 2. Automated test runners
    steps = [
        ("Design Tokens Lint", ["npm", "run", "lint:tokens"]),
        ("TypeScript Type Check", ["npm", "run", "type-check"]),
        (
            "Navigation & Routing Tests",
            ["npx", "vitest", "run", "src/utils/__tests__/navigation.test.js"],
        ),
        (
            "Navbar Templates Tests",
            ["npx", "vitest", "run", "src/ui/components/nav/__tests__/nav.templates.test.js"],
        ),
        (
            "Toast Notifications Tests",
            ["npx", "vitest", "run", "src/ui/components/__tests__/toast.test.js"],
        ),
        (
            "Table of Contents / Sitemap Tests",
            ["npx", "vitest", "run", "src/pages/toc/__tests__/toc.test.js"],
        ),
    ]

    for name, cmd in steps:
        if not run_step(name, cmd):
            sys.exit(1)

    print("\nAll navigation, UI standards, and brand asset verifications passed cleanly.")


if __name__ == "__main__":
    main()
