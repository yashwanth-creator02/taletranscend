#!/usr/bin/env python3
"""
verify_author_flows.py

Deterministic runner for TaleTranscend author registration, scribe profile,
and chronicler inquiry verification suites.
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
            "Author Service Tests",
            ["npx", "vitest", "run", "src/services/__tests__/author.service.test.js"],
        ),
        (
            "Tale Inquire Tests",
            ["npx", "vitest", "run", "src/pages/tale/__tests__/inquire.test.js"],
        ),
        (
            "Contribution Publish Wall Tests",
            [
                "npx",
                "vitest",
                "run",
                "src/pages/contribution/__tests__/publish.test.js",
            ],
        ),
        (
            "Profile Scribe Sync Tests",
            ["npx", "vitest", "run", "src/pages/profile/__tests__/sync.test.js"],
        ),
        (
            "Validation Utilities Tests",
            [
                "npx",
                "vitest",
                "run",
                "src/utils/__tests__/validation.utils.test.ts",
            ],
        ),
    ]

    for name, cmd in steps:
        if not run_step(name, cmd):
            sys.exit(1)

    print("\nAll author registration and correspondence suites passed cleanly.")


if __name__ == "__main__":
    main()
