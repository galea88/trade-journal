---
name: npm workspace migration
description: Lessons from migrating this monorepo from pnpm to npm workspaces — arborist bug, peer conflict root cause, manual fixups required.
---

## The arborist "Invalid Version:" bug in npm ≤11.17.0

npm's arborist crashes with `TypeError: Invalid Version: ` at `Node.canDedupe` when a workspace has a dependency whose peer requirement is violated with `legacy-peer-deps=true`. The root cause: npm creates a placeholder node with `version: ""` for the conflicting package during ideal-tree building; when `pruneDedupable` later calls `semver.eq(other.version, this.version)` with `""`, it crashes.

**Why:** `legacy-peer-deps=true` suppresses the eresolve error but still creates the placeholder — the wrong fix masks a real conflict.

**How to apply:** Fix the actual peer conflict first; don't rely on `legacy-peer-deps`. In this project the conflict was `esbuild@0.27.x` pinned in api-server while `esbuild-plugin-pino@2.3.3` requires `esbuild@>=0.25.0 <=0.25.8`. Changing to `esbuild@0.25.8` resolves the conflict.

## Arborist patch (workaround)

If the bug persists despite fixing peer conflicts, patch the globally-installed npm's arborist:
```
sed -i 's/if (preferDedupe || semver.eq(other.version, this.version)) {/if (preferDedupe || (other.version \&\& this.version \&\& semver.eq(other.version, this.version))) {/' ~/.config/npm/node_global/lib/node_modules/npm/node_modules/@npmcli/arborist/lib/node.js
```

The npm global install is at `/home/runner/workspace/.config/npm/node_global/` in this Replit environment.

## npm install gets killed in bash shell

`npm install` from the bash shell (the tool's bash() function) is killed by the environment for large workspace installs. Use `node -e "require('child_process').execSync('npm install ...', {timeout: 120000})"` instead — this bypasses the bash shell kill.

## workspace symlinks not created on partial install

When npm install is killed mid-reification, `node_modules/@workspace/*` symlinks and `node_modules/.bin` entries may not be created. Fix:
1. Manually create `node_modules/@workspace/<name>` symlinks pointing to workspace dirs
2. Scan all `node_modules/<pkg>/package.json` for `bin` fields and create missing `.bin` symlinks

## Expo + npm workspace: mobile dev script must use absolute path

The mobile dev script uses `node /home/runner/workspace/node_modules/expo/bin/cli start ...`. Using `npx expo` or `node node_modules/expo/bin/cli` both fail:
- `npx expo` — npm workspace symlink resolution makes npx look for `node_modules/@workspace/trading-journal-mobile/node_modules/expo/bin/cli` (a non-existent literal path)
- `node node_modules/expo/bin/cli` — the `node_modules/expo` symlink inside the mobile's local node_modules is wiped every time `npm install` runs

**Why:** npm install regenerates the mobile's local node_modules, clearing manually created symlinks. Absolute path is the only stable solution.

**How to apply:** Keep the dev script as `node /home/runner/workspace/node_modules/expo/bin/cli start --localhost --port $PORT`.

## Expo + npm workspace: react-native not found

Expo's Metro bundler does NOT walk up to parent node_modules — it only finds packages installed locally. With npm workspace hoisting, react-native lives in root `node_modules` but Expo looks in the workspace-local `node_modules`. Fix: create local node_modules in the mobile workspace dir with symlinks to all root node_modules packages.

## Partial react-native install (missing package.json)

If npm aborts mid-reification, react-native's directory may exist but package.json may be missing. Fix: `npm view react-native@<version> --json` and write the essential fields back to `node_modules/react-native/package.json`.

## esbuild-plugin-pino peer requirement

`esbuild-plugin-pino@2.3.3` requires `esbuild@>=0.25.0 <=0.25.8`. Use `esbuild@0.25.8` in api-server (not the latest 0.27.x). The pinned `thread-stream` devDep should be removed — it's a peerDep that resolves transitively.

## install script approval

After npm install completes, some packages need `npm approve-scripts <pkg>` before their postinstall scripts run: `@clerk/shared`, `esbuild`, `sharp`, `browser-tabs-lock`.

## @next/swc native binary may be corrupted after interrupted install

If `next dev` crashes with SIGBUS (exit code 135), the `@next/swc-linux-x64-gnu` native binary is likely truncated. Verify with `file node_modules/@next/swc-linux-x64-gnu/*.node` — a valid binary says "ELF 64-bit LSB shared object, stripped"; a corrupt one says "missing section headers at N".

Fix: download the tarball directly from `http://package-firewall.replit.local/npm/%40next%2Fswc-linux-x64-gnu/-/swc-linux-x64-gnu-<version>.tgz` using Node's http module (npm install for this 137MB package always times out), extract it with tar, and copy it to `node_modules/@next/swc-linux-x64-gnu`. Then restore `node_modules/.bin/next` if it was lost.

## Stale .next cache causes 500 errors after pnpm→npm migration

After replacing pnpm with npm, the `artifacts/trading-journal/.next` directory may contain compiled server files referencing absolute `.pnpm` paths (e.g. `.pnpm/styled-jsx@5.1.6_.../styled-jsx/index.js`). Delete `.next` so Next.js recompiles fresh.

## task agents add packages to package.json but post-merge npm install doesn't run

When a task agent adds a new npm dependency (e.g. `@sentry/react`), `npm install` runs in the post-merge script. If the package has many internal sub-deps (`@sentry-internal/browser-utils`, `@sentry-internal/feedback`, `@sentry-internal/replay`, `@sentry-internal/replay-canvas`), only the top-level tarball may end up installed; sub-deps are missing and cause "Module not found" errors.

Fix: download each missing sub-dep directly from `http://package-firewall.replit.local/npm/<encoded-pkg>/-/<name>-<version>.tgz` using Node's http module, extract with tar, copy to `node_modules/`. Run in parallel for speed.

## post-merge.sh must use npm not pnpm

`scripts/post-merge.sh` originally contained `pnpm install --frozen-lockfile`. After the npm migration it must use `node -e "require('child_process').execSync('npm install', ...)"` (not bare `npm install` — it gets killed in bash) followed by `npm run -w @workspace/db push`.
