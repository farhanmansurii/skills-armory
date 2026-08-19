# Armory

## What it is
A personal developer tool (audience: the author — an engineer running multiple AI coding
harnesses daily). CLI + TUI that manages "skill" packages (SKILL.md directories) across
AI coding agents from one central store (`~/.agents/skills`, a git repo).
Install = symlink into an agent's skills dir; desired state lives in `manifest.toml`.

## Mode
Operate. The user is mid-task (install / uninstall / audit / clean up). Speed,
scanability, and keyboard flow outrank expression. The tool should disappear.

## Visual direction — Crush / Charm Terminal Canon
Crush / Charm terminal aesthetic: iconic slash header banner (`////// Armory v2.0.0 ///...`),
bronze accent `#B45309`, steel blue `#5B8DAE`, and ember `⚡` pending markers.
Dual-pane live split view on widescreen terminals with real-time inspector card.

## UX model
Skill-centric, keyboard-first navigation with top tabs `[1] Skills  [2] Agents  [3] Discover  [4] Settings  [5] Cleanup  [6] Help`:
- **[1] skills**: live searchable list, grouped under pack headers (source repo, or manual override via `config.toml`) + right-hand live inspector (SKILL.md summary & per-agent status), batch edits pending until apply (`a`), migration (`m`)
- **[2] agents**: all detectable coding harnesses; toggle managed state with `space`
- **[3] discover**: browse & search curated skills from `skills.sh` or enter any GitHub repo to import into store
- **[4] settings**: interactive preferences for install strategy (`symlink` vs `copy`), auto-detection toggle, and storage paths
- **[5] cleanup**: orphan skills (installed nowhere) batch-purge from store; drift inspector
- **[6] help**: interactive cheatsheet and architecture reference

## Constraints & Performance
- Bun runtime, Ink 7, terminal only — no images, no web
- Sub-50ms instant startup via standalone compiled binary (`bin/armory`) and batch O(agents) fs caching
- Headless subcommands must never load the UI (scriptable)
- Destructive actions confirm inline; the store is git-versioned so deletes are recoverable

## Assumptions
- Single user, own machine, dark terminal
- Agents without a known skills convention get best-guess dirs, overridable in config.toml
