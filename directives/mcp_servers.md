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

Expected output reports every server as `connected`, except `vercel`, which reports `needs authentication` until OAuth sign-in completes. Inside a session, `/mcps` shows live status and allows connect, disconnect, and authenticate. Run the OAuth flow from `/mcps`, not from the CLI, so the authorization link stays visible.

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
- Cold start exceeds the default timeout: `firebase-tools` measured roughly 33s on first launch after `npm install` and about 3s once warm, against a 30s default startup timeout. The symptom is `Operation timed out after 30000ms` and `failed` in `opencode mcp list` while a later `opencode mcp list` succeeds. This is cold filesystem and antivirus cost, not a broken server. Fix is a per-server `timeout.startup` of 120000, already set for `firebase` in `opencode.json`. Do not rewrite the command in response to a timeout.
- Local devDependency shadowing: `firebase-tools` is a project devDependency (`^15.32.1`), so `npx` resolves the local copy rather than downloading `@latest` once `node_modules` exists. Cold-start timing therefore depends on the installed tree.
- Firebase auth: The server acts with the credentials of the logged-in Firebase CLI user, or Application Default Credentials where present. A `permission-denied` result usually means the wrong account or project, not a broken server. Use `firebase logout` and `firebase login` to switch.
- Firestore safety: Destructive Firestore operations (delete, purge, backup removal) are reachable through these tools. Treat any such call as irreversible and confirm intent before invoking.
- Emulator isolation: `.firebaserc` pins the default project to the live `taletranscend`. `firebase emulators:exec` redirects Firestore only for the commands it wraps, so an MCP tool call made outside that wrapper reaches live Firestore. Confirm the emulator is running before any tool-driven Firestore test, and never assume the default project id means emulator.
- Local versus remote servers: `chrome-devtools` and `firebase` are local stdio servers launched by OpenCode; `vercel` is a remote Streamable HTTP server reached over OAuth. Remote servers need no `oauth: false`, since OAuth is the default and the only supported credential path for Vercel.
- Vercel project linkage: the working directory is linked via `.vercel/project.json` to project `taletranscend` (`prj_pVIGxQJaKJqjfojXJnXyyqd0CHbx`) under team `yashwanth-creator02s-projects` (`team_Kgvgtk2aiYC50anZgBC0b94M`). `vercel link` writes this file and adds `.vercel` to `.gitignore` automatically, so never hand-author it and never commit it. The project is GitHub-connected and deploys from pushes to `main`.
- Vercel CLI credentials are separate from MCP OAuth: authenticating the `vercel` MCP server does not log in the CLI, and `vercel link` will start its own device-code flow when no CLI credentials exist. The two must both be established for `vercel` CLI commands to work alongside the MCP server.
- Deployment target split: `vercel.json` defines the Vercel target and `firebase.json` the Firebase Hosting target, and both are live deploy paths for this project. Confirm which platform is authoritative before triggering a production deploy through either MCP server.
- Deployment protection: the production Vercel deployment sits behind Vercel login and redirects unauthenticated requests to the SSO page, so direct HTTP checks will not see the app. Use the Vercel MCP observability tools, or a protection-bypass link, rather than assuming a redirect means the deployment is down.
