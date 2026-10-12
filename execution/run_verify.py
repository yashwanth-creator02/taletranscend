#!/usr/bin/env python3
"""
run_verify.py

Deterministic runner for TaleTranscend verification checks.
Executes format check, linter, design token linter, type-check, and tests.
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
        ("Prettier Format Check", ["npm", "run", "format:check"]),
        ("Design Tokens Lint", ["npm", "run", "lint:tokens"]),
        ("ESLint", ["npm", "run", "lint"]),
        ("TypeScript Type Check", ["npm", "run", "type-check"]),
        ("Unit & Integration Tests", ["npm", "test"]),
    ]

    for name, cmd in steps:
        if not run_step(name, cmd):
            sys.exit(1)

    print("\nAll verification steps completed successfully.")


if __name__ == "__main__":
    main()
