#!/usr/bin/env python3
"""
verify_interactions_and_profile.py

Deterministic runner for TaleTranscend hero interactions, navigation bfcache,
chronicler profile, and Oracle AI verification suites.
"""
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


def main():
    steps = [
        ("Design Tokens Lint", ["npm", "run", "lint:tokens"]),
        ("TypeScript Type Check", ["npm", "run", "type-check"]),
        (
            "Navigation & Bfcache Tests",
            [
                "npx",
                "vitest",
                "run",
                "src/utils/__tests__/navigation.test.js",
            ],
        ),
        (
            "Tale Hero & Soul Resonance Tests",
            [
                "npx",
                "vitest",
                "run",
                "src/pages/tale/__tests__/interactions.test.js",
            ],
        ),
        (
            "Tale Hero UI Tests",
            ["npx", "vitest", "run", "src/pages/tale/__tests__/ui.test.js"],
        ),
        (
            "Profile UI & Tooltips Tests",
            [
                "npx",
                "vitest",
                "run",
                "src/pages/profile/__tests__/ui.test.js",
            ],
        ),
        (
            "Tale & Fragment Download Tests",
            [
                "npx",
                "vitest",
                "run",
                "src/services/tale/__tests__/downloadTale.test.js",
            ],
        ),
        (
            "Oracle AI Service Tests",
            [
                "npx",
                "vitest",
                "run",
                "src/services/__tests__/ai.service.test.js",
            ],
        ),
    ]

    for name, cmd in steps:
        if not run_step(name, cmd):
            sys.exit(1)

    print("\nAll hero interaction and profile verification suites passed cleanly.")


if __name__ == "__main__":
    main()
