#!/usr/bin/env python3
"""
setup_worktree.py

Deterministic bootstrap for a freshly created git worktree.

A worktree checks out tracked files only. Everything gitignored is absent, which
silently breaks tooling: the Firebase MCP server cannot start inside the 30s
startup budget, brand skills disappear, and the Vercel project link is lost.

This runner restores each ignored-but-required artifact, then verifies the
result. It is idempotent and safe to re-run.

Secrets handling: `.env` and `.env.local` hold real Firebase credentials and are
copied so a worktree boots. The runner refuses to copy any destination that git
would track, never prints file contents, and reports only byte counts and key
names. Values are never logged, echoed, or written to a commit.

Usage:
    python execution/setup_worktree.py               # bootstrap the current directory
    python execution/setup_worktree.py --check       # report state, change nothing
    python execution/setup_worktree.py --verify-mcp  # also spawn each MCP server
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def find_primary_checkout() -> Path:
    """Return the repository's main worktree.

    `git worktree list --porcelain` prints one `worktree <path>` line per
    worktree, main checkout first, and puts the branch on a separate `branch`
    line, so the first path line is the primary checkout. This avoids
    hardcoding a machine-specific absolute path into a tracked script.
    """
    res = subprocess.run(
        ["git", "worktree", "list", "--porcelain"],
        cwd=str(PROJECT_ROOT),
        shell=SHELL,
        **CAPTURE,
    )
    for line in (res.stdout or "").splitlines():
        if line.startswith("worktree "):
            return Path(line[len("worktree "):].strip())
    return PROJECT_ROOT

# ---------------------------------------------------------------------------
# Dev server port allocation
#
# Each worktree gets its own dev server port so several can run side by side.
# The registry lives in the git common directory, which every worktree of this
# repository shares, so allocation is consistent no matter which clone runs it.
# ---------------------------------------------------------------------------

PORT_RANGE_START = 5173
PORT_RANGE_END = 5272
REGISTRY_NAME = "worktree-ports.json"


def git_common_dir() -> Path:
    res = subprocess.run(
        ["git", "rev-parse", "--git-common-dir"],
        cwd=str(PROJECT_ROOT),
        shell=SHELL,
        **CAPTURE,
    )
    raw = (res.stdout or "").strip().splitlines()[0] if (res.stdout or "").strip() else ""
    if not raw:
        return PROJECT_ROOT / ".git"
    candidate = Path(raw)
    if not candidate.is_absolute():
        candidate = (PROJECT_ROOT / candidate).resolve()
    return candidate


def registry_path() -> Path:
    return git_common_dir() / REGISTRY_NAME


def load_registry() -> dict:
    path = registry_path()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def save_registry(data: dict) -> None:
    path = registry_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def port_is_free(port: int) -> bool:
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("127.0.0.1", port))
        except OSError:
            return False
    return True


def prune_missing_worktrees(registry: dict) -> list:
    """Drop entries whose worktree directory no longer exists."""
    removed = []
    for key in list(registry.keys()):
        if not Path(key).is_dir():
            removed.append(key)
            del registry[key]
    return removed


def allocate_port(prune: bool = True) -> int | None:
    """Return this worktree's dev port, assigning one if needed."""
    registry = load_registry()
    if prune:
        if prune_missing_worktrees(registry):
            save_registry(registry)

    key = str(PROJECT_ROOT)
    existing = registry.get(key, {}).get("port")
    if isinstance(existing, int):
        return existing

    taken = {entry["port"] for entry in registry.values()
             if isinstance(entry.get("port"), int)}
    for port in range(PORT_RANGE_START, PORT_RANGE_END + 1):
        if port in taken:
            continue
        if not port_is_free(port):
            continue
        registry[key] = {
            "port": port,
            "branch": current_branch(),
        }
        save_registry(registry)
        return port
    return None


def current_branch() -> str:
    res = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=str(PROJECT_ROOT),
        shell=SHELL,
        **CAPTURE,
    )
    return (res.stdout or "").strip()


def release_port(target: Path | None = None) -> bool:
    """Free a worktree's port. Defaults to the current worktree."""
    registry = load_registry()
    key = str((target or PROJECT_ROOT).resolve())
    if key not in registry:
        return False
    del registry[key]
    save_registry(registry)
    return True


def write_port_file(port: int) -> None:
    """Expose the port to tooling that does not speak JSON, such as Vite."""
    dest = PROJECT_ROOT / ".dev-port"
    dest.write_text(f"{port}\n", encoding="utf-8")


def step_port(check_only: bool) -> None:
    log("--- Running: allocate dev server port ---")
    registry = load_registry()

    if check_only:
        current = registry.get(str(PROJECT_ROOT), {}).get("port")
        log(f"    {'PENDING' if current is None else 'OK'} dev port: "
            f"{current if current is not None else 'unassigned'}")
        return

    if prune_missing_worktrees(registry):
        save_registry(registry)
        log("    PRUNED entries for worktrees that no longer exist")

    port = allocate_port()
    if port is None:
        log(f"    FAIL  no free port in {PORT_RANGE_START}-{PORT_RANGE_END}")
        sys.exit(1)

    write_port_file(port)
    log(f"    OK    dev port {port} ({current_branch()})")
    log(f"          start with: npm run dev -- --port {port}")


# firebase-tools loads its whole CLI module graph on start. Measured on this
# machine: ~68s cold, ~10s warm. OpenCode's 30s startup budget only fits the
# warm case, so a warmup run is mandatory after a cold install.
WARMUP_TARGET = Path("node_modules") / "firebase-tools" / "lib" / "bin" / "firebase.js"
WARMUP_ARGS = ["experimental:mcp", "--help"]
WARMUP_TIMEOUT_SECONDS = 180

# Windows consoles default to cp1252. `opencode mcp list` emits box-drawing and
# other UTF-8 bytes that cp1252 cannot decode, so every capture decodes as
# UTF-8 with replacement instead of failing.
CAPTURE = {"capture_output": True, "text": True,
           "encoding": "utf-8", "errors": "replace"}

# Windows needs the shell to resolve npm.cmd/npx.cmd shims; on POSIX a list
# argument with shell=True would pass every element after the first as $0..$n,
# so `git worktree list` would silently run as bare `git`.
SHELL = os.name == "nt"


def _configure_stdio() -> None:
    """Stop UnicodeEncodeError when echoing CLI output containing box glyphs.

    Windows consoles encode with cp1252. `opencode mcp list` prints U+25CF and
    similar glyphs that cp1252 cannot represent, which would abort the run.
    Replacement keeps the output readable and the script alive.
    """
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")
        except (AttributeError, ValueError):
            pass


def log(message: str) -> None:
    print(message, flush=True)


def copy_dir(src: Path, dest: Path) -> bool:
    """Replace dest with a copy of src. Returns True when a copy happened."""
    if not src.is_dir():
        log(f"    SKIP  source missing: {src}")
        return False
    if dest.is_dir():
        shutil.rmtree(dest)
    elif dest.exists():
        dest.unlink()
    shutil.copytree(src, dest)
    return True


def copy_file(src: Path, dest: Path) -> bool:
    if not src.is_file():
        log(f"    SKIP  source missing: {src}")
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    return True


def step_install(check_only: bool) -> None:
    """Install dependencies so npx resolves firebase-tools locally."""
    if (PROJECT_ROOT / "node_modules").is_dir():
        log("PASSED: dependencies already installed")
        return
    if check_only:
        log("PENDING: npm ci (node_modules absent)")
        return
    log("--- Running: npm ci ---")
    res = subprocess.run(
        ["npm", "ci"],
        cwd=str(PROJECT_ROOT),
        shell=SHELL,
        **CAPTURE,
    )
    if res.returncode != 0:
        log(f"FAILED: npm ci exited with code {res.returncode}")
        log(res.stdout[-2000:])
        log(res.stderr[-2000:])
        sys.exit(1)
    log("PASSED: npm ci")


def step_warmup(check_only: bool) -> None:
    """Warm the firebase-tools module graph so startup fits the 30s budget."""
    target = PROJECT_ROOT / WARMUP_TARGET
    if not target.is_file():
        if check_only:
            log("PENDING: firebase-tools warmup (node_modules absent)")
            return
        log("FAILED: firebase-tools not present; run npm ci first")
        sys.exit(1)
    if check_only:
        log("PENDING: firebase-tools warmup")
        return
    log("--- Running: firebase-tools warmup ---")
    start = time.monotonic()
    try:
        subprocess.run(
            ["node", str(target)] + WARMUP_ARGS,
            cwd=str(PROJECT_ROOT),
            shell=SHELL,
            **CAPTURE,
            timeout=WARMUP_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        log("FAILED: warmup timed out")
        sys.exit(1)
    elapsed = time.monotonic() - start
    log(f"PASSED: firebase-tools warmup completed in {elapsed:.1f}s")


def step_skills(source: Path, check_only: bool) -> None:
    """Restore .agents/skills, which is gitignored and therefore absent."""
    src = source / ".agents" / "skills"
    dest = PROJECT_ROOT / ".agents" / "skills"
    if dest.is_dir():
        log(f"PASSED: skills already present ({sum(1 for _ in dest.iterdir())} entries)")
        return
    if check_only:
        log("PENDING: copy .agents/skills")
        return
    log("--- Running: copy .agents/skills ---")
    if copy_dir(src, dest):
        log(f"PASSED: copied skills from {src}")
    else:
        log("FAILED: no skill source found; run the brand-leo-utils sync directive")


def step_vercel_link(source: Path, check_only: bool) -> None:
    """Restore .vercel/project.json, which is gitignored and therefore absent."""
    src = source / ".vercel" / "project.json"
    dest = PROJECT_ROOT / ".vercel" / "project.json"
    if dest.is_file():
        log("PASSED: Vercel link already present")
        return
    if check_only:
        log("PENDING: copy .vercel/project.json")
        return
    log("--- Running: copy .vercel/project.json ---")
    if copy_file(src, dest):
        log(f"PASSED: copied Vercel link from {src}")
    else:
        log("WARNING: no Vercel link found; run 'vercel link' manually")


# Local environment files holding real credentials. Copied so a new worktree
# boots, never printed, and only ever to a path git already ignores.
ENV_FILES = [
    (".env", ".env"),
    (".env.local", ".env.local"),
    ("functions/.env", "functions/.env"),
    ("functions/.env.local", "functions/.env.local"),
]

# Keys the Vite build needs. Only names are checked; values are never read.
REQUIRED_ENV_KEYS = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
]


def is_gitignored(rel_path: str) -> bool:
    res = subprocess.run(
        ["git", "check-ignore", "-q", rel_path],
        cwd=str(PROJECT_ROOT),
        shell=SHELL,
        **CAPTURE,
    )
    return res.returncode == 0


def file_digest(path: Path) -> str:
    """Hash file contents without reading them into memory as text.

    Comparing sizes alone treats a same-length edit as already copied, so a
    rotated credential in the primary checkout would never reach the new
    worktree. Only the digest is exposed; contents are never printed.
    """
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def env_key_names(path: Path) -> set[str]:
    names: set[str] = set()
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            names.add(line.split("=", 1)[0].strip())
    return names


def step_env(source: Path, check_only: bool) -> None:
    """Copy local env files, refusing any destination git would track."""
    log("--- Running: copy local env files ---")
    for rel_src, rel_dest in ENV_FILES:
        src = source / rel_src
        dest = PROJECT_ROOT / rel_dest

        if not src.is_file():
            log(f"    SKIP  absent in source: {rel_src}")
            continue

        if not is_gitignored(rel_dest):
            log(f"    REFUSE {rel_dest} is not gitignored; refusing to copy secrets")
            continue

        if dest.is_file() and file_digest(dest) == file_digest(src):
            log(f"    OK    {rel_dest} already present ({dest.stat().st_size} bytes)")
            continue

        if check_only:
            log(f"    PENDING {rel_dest}")
            continue

        if copy_file(src, dest):
            log(f"    COPIED {rel_src} -> {rel_dest} ({dest.stat().st_size} bytes)")
        else:
            log(f"    FAIL  could not copy {rel_src}")

    env_file = PROJECT_ROOT / ".env"
    if env_file.is_file():
        present = env_key_names(env_file)
        missing = [k for k in REQUIRED_ENV_KEYS if k not in present]
        if missing:
            log(f"    WARN  .env missing keys: {', '.join(missing)}")
        else:
            log(f"    OK    .env carries all {len(REQUIRED_ENV_KEYS)} required keys")
    else:
        log("    WARN  no .env present; copy .env.example and fill it in")


def step_report() -> None:
    """Print resolved project identity for the copied Vercel link."""
    link = PROJECT_ROOT / ".vercel" / "project.json"
    if link.is_file():
        data = json.loads(link.read_text(encoding="utf-8"))
        log(f"      project={data.get('projectName')} id={data.get('projectId')}")
        log(f"      team={data.get('orgId')}")


def step_mcp_config() -> None:
    """Validate the declared MCP servers without spawning them.

    Spawning is deliberately avoided here: each probe starts every declared
    server, and the local ones are expensive (firebase-tools needs ~10s warm and
    up to ~120s cold, chrome-devtools ~3s warm) and leave child processes behind
    when the probe exits. Whether a server actually connects is a property of the
    running OpenCode session, not of the worktree, so it cannot be established
    from here. Use --verify-mcp to pay that cost deliberately.
    """
    path = PROJECT_ROOT / "opencode.json"
    if not path.is_file():
        log("FAILED: opencode.json missing; no MCP servers would be available")
        return
    try:
        # utf-8-sig tolerates a BOM, which Windows editors add readily and
        # OpenCode itself accepts; strict utf-8 would reject a working config.
        cfg = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as exc:
        log(f"FAILED: opencode.json is not valid JSON: {exc}")
        return

    servers = ((cfg.get("mcp") or {}).get("servers") or {})
    if not servers:
        log("FAILED: no servers declared under mcp.servers")
        return

    problems = 0
    for name, spec in sorted(servers.items()):
        if spec.get("type") == "remote":
            url = spec.get("url", "?")
            log(f"    OK    {name:<16} remote {url}")
            continue
        argv = spec.get("command") or []
        if not argv:
            log(f"    FAILED {name:<15} local server has no command")
            problems += 1
            continue
        exe = argv[0]
        resolved = shutil.which(exe)
        if resolved:
            log(f"    OK    {name:<16} local {exe} ({resolved})")
        else:
            log(f"    FAILED {name:<15} local {exe} is not on PATH")
            problems += 1

    if problems:
        log(f"FAILED: {problems} MCP server(s) cannot start as configured")
    else:
        log(f"PASSED: {len(servers)} MCP server(s) declared and resolvable")


def step_verify_mcp(check_only: bool) -> None:
    """Report MCP connection state. Informational: needs network and auth."""
    if check_only:
        return
    # The first post-warmup spawn can still lose the race against the fixed 30s
    # budget, so retry once before reporting failure.
    for attempt in (1, 2):
        log(f"--- Running: opencode mcp list (attempt {attempt}) ---")
        res = subprocess.run(
            ["opencode", "mcp", "list"],
            cwd=str(PROJECT_ROOT),
            shell=SHELL,
            **CAPTURE,
        )
        output = (res.stdout or "") + (res.stderr or "")
        for line in output.splitlines():
            if any(token in line for token in ("connected", "failed", "authentication")):
                log(f"      {line.strip()}")

        firebase_failed = any(
            "firebase" in line and "failed" in line for line in output.splitlines()
        )
        if not firebase_failed:
            return
        if attempt == 1:
            log("      firebase failed; warming once more and retrying")
            step_warmup(check_only=False)

    log("WARNING: firebase still failing after retry. The module cache evicted")
    log("         and startup exceeded the fixed 30s budget again.")


def main() -> None:
    _configure_stdio()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=None,
                        help="primary checkout to copy ignored artifacts from "
                             "(defaults to the git main worktree)")
    parser.add_argument("--check", action="store_true",
                        help="report state without changing anything")
    parser.add_argument("--release-port", metavar="PATH", nargs="?", const="",
                        default=None,
                        help="release a worktree's dev port and exit. Defaults "
                             "to the current worktree when PATH is omitted.")
    parser.add_argument("--list-ports", action="store_true",
                        help="print the port registry and exit")
    parser.add_argument("--verify-mcp", action="store_true",
                        help="additionally spawn every MCP server to check it "
                             "connects. Slow (up to ~2 min cold) and leaves "
                             "child processes behind; off by default.")
    args = parser.parse_args()

    _configure_stdio()

    if args.list_ports:
        registry = load_registry()
        if not registry:
            log("No worktree ports allocated.")
            return
        for key, entry in sorted(registry.items(), key=lambda kv: kv[1]["port"]):
            log(f"  {entry['port']}  {entry.get('branch', '?'):<40} {key}")
        return

    if args.release_port is not None:
        target = Path(args.release_port) if args.release_port else PROJECT_ROOT
        if release_port(target):
            log(f"Released dev port for {target}")
        else:
            log(f"No port allocation recorded for {target}")
        return

    source = args.source.resolve() if args.source else find_primary_checkout()
    check = args.check

    log(f"Worktree setup for: {PROJECT_ROOT}")
    log(f"Copying from     : {source}")
    if check:
        log("Mode             : check only (no changes)")
    log("")

    log("--- Dependencies ---")
    step_install(check)
    log("")

    log("--- Ignored artifacts ---")
    step_skills(source, check)
    step_vercel_link(source, check)
    step_env(source, check)
    step_report()
    log("")

    log("--- Firebase MCP warmup ---")
    step_warmup(check)
    log("")

    log("--- Dev server port ---")
    step_port(check)
    log("")

    log("--- MCP config ---")
    step_mcp_config()
    if args.verify_mcp:
        log("")
        log("--- MCP live verification (spawns every server) ---")
        step_verify_mcp(check)

    log("")
    log("Worktree setup complete.")


if __name__ == "__main__":
    main()