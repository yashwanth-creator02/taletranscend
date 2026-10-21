# Directive: Agent Tooling and MCP Servers

## Goal

Provide TaleTranscend agents with direct browser-debugging and Firebase project access through Model Context Protocol (MCP) servers, configured per-project so the setup is reproducible for every contributor without leaking secrets or machine-specific paths.

## When this fires

- Debugging a runtime or UI defect against a live browser (console errors, network failures, performance traces, Core Web Vitals).
- Inspecting or managing Firebase resources: Firestore collections, Auth, Hosting config, Cloud Functions, or emulator state.
- Adding, removing, or upgrading an MCP server for this repository.
- A user reports that an MCP tool is missing or that a server shows as failed.

## Inputs

- `opencode.json` at the repository root (project-local MCP server definitions).
- Node.js and `npx` on `PATH` (both servers launch through `npx`).
- An active Firebase CLI login, which the Firebase MCP server reuses for authorization. Verify with `firebase login:list`.

## Git Safety (If Modifying Code)

- Branch creation requirement: Always work on a dedicated branch off `main` or `master`.
- Never commit directly to `main` or `master`.
- Merges to `main` require explicit user consent in conversation.

## Tools / Scripts to Use

Configured servers:

| Server            | Transport | Command                                         | Purpose                                                           |
| ----------------- | --------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| `chrome-devtools` | stdio     | `npx -y chrome-devtools-mcp@latest`             | Chrome DevTools protocol: console, network, screenshots, tracing. |
| `firebase`        | stdio     | `npx -y firebase-tools@latest experimental:mcp` | Firebase project, Firestore, Auth, Functions, Hosting operations. |
| `vercel`          | remote    | `https://mcp.vercel.com`                        | Vercel deployments, domains, env vars, project and team settings. |

Inspect connection state:

```powershell
opencode mcp list
```

This command reads the config of the directory it runs in and **spawns every declared server to report its status** — verified with a throwaway git repo declaring a single failing server, which it reported by name. Two consequences follow:

- Each call starts `chrome-devtools` and `firebase`, and those child processes outlive the probe. Repeated calls leak `chrome-devtools-mcp` and Chrome instances; nine accumulated during one debugging session and the machine dropped to 0.17 GB free RAM. Clean up with a query on the `chrome-devtools-mcp` command line before blaming a server for a timeout.
- A `failed` line describes a cold start racing the fixed 30s budget, not a broken declaration. `execution/setup_worktree.py` therefore validates `opencode.json` without spawning anything and only probes live status when passed `--verify-mcp`.

Expected output when warm reports every server as `connected`, except `vercel`, which reports `needs authentication` until OAuth sign-in completes. Inside a session, `/mcps` shows live status and allows connect, disconnect, and authenticate. Run the OAuth flow from `/mcps`, not from the CLI, so the authorization link stays visible.

Add a new server (project-local, since this repository is the scope):

```powershell
opencode mcp add <name> -- <command> [args]
```

Add a remote OAuth server (no secret goes in the file):

```powershell
opencode mcp add <name> --url https://<host>/mcp
```

Verify the Firebase project the server resolves against:

```powershell
firebase use
```

## Outputs

- `opencode.json` containing an `mcp.servers` block, with a unique key per server.
- `connected` status for each server from `opencode mcp list`.
- Browser diagnostics captured as evidence during defect investigation.
- Firebase resource changes executed against the intended project.

## Edge Cases & Error Handling

- Config location: Servers are declared under `mcp.servers`, never directly under `mcp`. Keys are server names; values are `type`, `command`, and optional `environment`, `cwd`, `disabled`, `timeout`, and `codemode`.
- No global duplication: `~/.config/opencode/opencode.jsonc` is intentionally empty of `mcp` entries. Keep TaleTranscend servers project-local so they do not affect unrelated repositories.
- Cross-IDE isolation: MCP servers configured in Antigravity, Gemini CLI, or Cursor are not shared with OpenCode. Each tool requires its own entry, even for identically named servers.
- Version skew: A CLI older than the running OpenCode service can reject valid `mcp.servers` config while sessions still work. Symptom is `Configuration is invalid` from `opencode mcp list` despite healthy tools. Resolution is `opencode upgrade`, not a config rewrite.
- Windows stdio: `npx` resolves through `npx.cmd`. If a server fails to spawn, wrap the command as `cmd` with args `["/c", "npx", "-y", ...]`.
- Cold start can exceed the startup budget: `firebase-tools` loads its entire CLI module graph on start. Measured on this machine: `firebase-tools` 68 to 119s cold and 9.8 to 13.3s warm; `chrome-devtools-mcp` 44.6s cold and 3.3 to 3.5s warm. The symptom is `Operation timed out after 30000ms` and `failed` in `opencode mcp list`. This is cold filesystem, antivirus, and registry cost, not a broken server. Do not rewrite the command in response to a timeout. Pinning a version does not help: `@latest` and `@15.34.0` both land at about 12 to 13s once warm.
- Timeout overrides depend on the build: `mcp.timeout.startup` is valid per the published schema, but on OpenCode 1.19.3 it was inert — failures still reported `30000ms`. `opencode.json` now declares a `mcp.timeout` block (startup 180000, catalog 60000) on OpenCode 2.0.32; re-check `opencode mcp list` after any upgrade before trusting it. Warming the module graph remains the deterministic fix, which is what `execution/setup_worktree.py` does.
- New worktrees lack gitignored artifacts: `node_modules/`, `.agents/skills/`, `.vercel/project.json`, and `.env` are all absent from a fresh worktree, which breaks the Firebase MCP server, the brand skills, and the Vercel link without any obvious error. Run `python execution/setup_worktree.py` in every new worktree before any MCP or test work. See the Worktree Bootstrap Mandate in `AGENTS.md`.
- Bootstrap validates config, not connections: `setup_worktree.py` confirms that `opencode.json` parses, that every server is declared, and that each local command resolves on `PATH`. It deliberately does not spawn servers, because connection state belongs to the running session rather than the worktree. Pass `--verify-mcp` to pay the spawn cost deliberately.
- BOM tolerance: `opencode.json` is read as `utf-8-sig`. Windows editors add a BOM readily and OpenCode accepts it, so strict UTF-8 would have reported a working config as invalid JSON.
- chrome-devtools needs no bootstrapping: the server auto-provisions Chrome for Testing and caches both the binary and its Chrome profile outside the repository, so nothing is missing in a new worktree. Do not add config or skill copies for it.
- Local devDependency is bypassed by `@latest`: `firebase-tools` is a project devDependency (`^15.32.1`) and `node_modules/.bin/firebase` exists, but `npx -y firebase-tools@latest` ignores it and runs the newest published release instead. Measured: local copy 15.32.1, `@latest` 15.34.0. To use the pinned version offline, run `npx --no-install firebase experimental:mcp`; that requires `node_modules` to exist, so it fails outright in an unbootstrapped worktree. Steady-state startup is close either way (11.7s local versus 13.3s `@latest`), so the launch method is not what fixes cold start.
- Firebase auth: The server acts with the credentials of the logged-in Firebase CLI user, or Application Default Credentials where present. A `permission-denied` result usually means the wrong account or project, not a broken server. Use `firebase logout` and `firebase login` to switch.
- Firestore safety: Destructive Firestore operations (delete, purge, backup removal) are reachable through these tools. Treat any such call as irreversible and confirm intent before invoking.
- Emulator isolation: `.firebaserc` pins the default project to the live `taletranscend`. `firebase emulators:exec` redirects Firestore only for the commands it wraps, so an MCP tool call made outside that wrapper reaches live Firestore. Confirm the emulator is running before any tool-driven Firestore test, and never assume the default project id means emulator.
- Local versus remote servers: `chrome-devtools` and `firebase` are local stdio servers launched by OpenCode; `vercel` is a remote Streamable HTTP server reached over OAuth. Remote servers need no `oauth: false`, since OAuth is the default and the only supported credential path for Vercel.
- Vercel project linkage: the working directory is linked via `.vercel/project.json` to project `taletranscend` (`prj_pVIGxQJaKJqjfojXJnXyyqd0CHbx`) under team `yashwanth-creator02s-projects` (`team_Kgvgtk2aiYC50anZgBC0b94M`). `vercel link` writes this file and adds `.vercel` to `.gitignore` automatically, so never hand-author it and never commit it. The project is GitHub-connected and deploys from pushes to `main`.
- Vercel CLI credentials are separate from MCP OAuth: authenticating the `vercel` MCP server does not log in the CLI, and `vercel link` will start its own device-code flow when no CLI credentials exist. The two must both be established for `vercel` CLI commands to work alongside the MCP server.
- Deployment target split: `vercel.json` defines the Vercel target and `firebase.json` the Firebase Hosting target, and both are live deploy paths for this project. Confirm which platform is authoritative before triggering a production deploy through either MCP server.
- Deployment protection: the production Vercel deployment sits behind Vercel login and redirects unauthenticated requests to the SSO page, so direct HTTP checks will not see the app. Use the Vercel MCP observability tools, or a protection-bypass link, rather than assuming a redirect means the deployment is down.
