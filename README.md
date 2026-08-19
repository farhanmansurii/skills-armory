<div align="center">

# ⚔️ Skills Armory

**One central skill store for every AI coding agent on your machine.**

[![npm version](https://img.shields.io/npm/v/skills-armory.svg?color=B45309)](https://www.npmjs.com/package/skills-armory)
[![License: MIT](https://img.shields.io/badge/license-MIT-5B8DAE.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/runtime-bun-F97316.svg)](https://bun.sh)
[![GitHub stars](https://img.shields.io/github/stars/farhanmansurii/skills-armory?style=social)](https://github.com/farhanmansurii/skills-armory)

`SKILL.md` packages, installed once, synced everywhere — Claude Code, Codex,
Cursor, opencode, Gemini, Crush, and 15+ more.

[Install](#install) • [Quick start](#quick-start) • [Usage](#usage) • [How it works](#how-it-works)

</div>

---

## Why

Running several AI coding agents day to day means the same skills (README
optimization, traffic reports, code review helpers, etc.) end up duplicated,
drifting, or missing entirely across tools. Armory keeps one versioned store
(`~/.agents/skills`, a git repo) and symlinks — or copies — into each agent's
expected skills directory, tracked in `manifest.toml` as the source of truth.

- **One store, every agent** — install a skill once, it's live everywhere you manage
- **Symlink or copy** — pick per-machine whether agents share live files or get real copies
- **Drift-aware** — detects real-dir copies, broken links, and orphaned skills; auto-fixes them
- **Discover & import** — pull skills straight from [skills.sh](https://skills.sh) or any `owner/repo`
- **Fast** — instant-startup compiled binary, single-pass batch filesystem scanning
- **Scriptable** — every TUI action has a headless CLI equivalent

## Requirements

- [Bun](https://bun.sh) — this project targets Bun, not Node/npm/pnpm
- macOS or Linux (paths assume a Unix home directory)

## Install

```bash
npm install -g skills-armory
# or run without installing:
bunx skills-armory
```

Both put an `armory` command on your `PATH` (Bun must be installed — see
[Requirements](#requirements) — since the package runs straight from
TypeScript source via Bun's shebang).

### From source

```bash
git clone https://github.com/farhanmansurii/skills-armory.git && cd skills-armory
bun install
bun run src/cli.ts <command>       # run directly from source
bun run build                      # or compile a standalone binary to bin/armory
```

## Quick start

```bash
armory detect                         # find installed agents, register them as targets
armory discover readme                # search skills.sh for something to install
armory install vercel-labs/skills --skill github-presence --to claude,cursor
armory ls                             # see the skill x agent matrix
armory sync                           # apply the manifest to disk
```

Or just run `armory` with no arguments in a terminal to drive the same
workflow from the TUI.

## Usage

Running `armory` with no arguments in a terminal opens the full-screen TUI
(skills list, agent toggles, discover, settings, cleanup, help). Everything is
also scriptable headlessly:

```bash
armory                                        # open the TUI (TTY only)
armory ls                                     # matrix of skill x agent
armory add <skills...> --to <agents,...|all>
armory rm <skills...> --from <agents,...|all> [--force]
armory install <repo|url> [--skill <name>] [--to <agents|all>]
armory update [skills...]                     # update skills from upstream git/skills.sh
armory discover [query]                       # search community skills from skills.sh
armory config [get|set] [key] [value]         # view or change settings
armory sync                                   # apply manifest to reality
armory drift                                  # list non-symlink entries in target dirs
armory migrate                                # convert real-dir copies to store symlinks
armory apply                                  # migrate then sync (all at once)
armory detect                                 # probe for installed agents, add new targets
```

## TUI keybindings

Navigate lists with arrows or `j`/`k`. Switch tabs with `1`-`6`, `Tab`/`Shift+Tab`,
or `←`/`→`. Per-screen actions:

| Screen | Keys | Action |
| --- | --- | --- |
| Skills | `Space` / `A` | Mark a skill / select all |
| | `I` / `X` | Install / uninstall marked skills everywhere |
| | `⏎` | Inspect — toggle install per agent |
| | `d` | Purge (marked skills, or the focused one) |
| | `/` | Search |
| Discover | `⏎` | Install the focused skill right away |
| | `Space` / `A` | Mark a skill / mark all visible |
| | `I` | Install everything marked, in one batch |
| | `O` | Open the focused skill's source repo — lists every skill it has, not just search hits |
| | `b` / `Esc` | Back to search (while viewing a source) |
| | `/` | Search skills.sh, or paste a `owner/repo` to import directly |
| Cleanup | `Space` / `A` | Mark a row (orphan or drift) / select all |
| | `I` / `X` | Fix / remove marked drift rows |
| | `d` | Purge marked orphans |
| | `f` | Auto-fix all drift (real copies + broken/dangling symlinks) |
| | `m` | Migrate + sync everything |

## How it works

- **Store**: skills live as directories under `~/.agents/skills`, a git repo.
- **Manifest**: `manifest.toml` records which agents are managed and which
  skills are installed where — regenerated by Armory on add/rm.
- **Install strategy**: `symlink` (default, recommended) links into each
  agent's skills dir; `copy` writes real directories. Configurable via
  `armory config set install_mode <symlink|copy>`.
- **Drift & cleanup**: `armory drift` finds entries that don't match your
  configured install strategy (real dirs when symlinked is expected, or vice
  versa), and the Cleanup screen finds orphan skills installed nowhere.

## Supported agents

Detected out of the box via `armory detect`: Claude Code, Codex, Cursor,
opencode, Gemini CLI, Antigravity, Amp, Copilot, Qwen, Roo, Kilo Code, Crush,
Grok, Command Code, Devin, DeepAgents, Goose, and Pi. Anything without a known
skills convention gets a best-guess path, overridable per-agent in
`manifest.toml`'s `[targets]` table.

## Configuration

`config.toml` holds user preferences:

```toml
[prefs]
auto_detect = true
install_mode = "symlink"   # "symlink" or "copy"

[agents]
# per-agent overrides

[packs]
# manual source-repo overrides for pack grouping (`armory discover` with no query)
```

Change settings from the CLI instead of editing by hand:

```bash
armory config get install_mode
armory config set install_mode copy
```

## Stack

Bun + TypeScript, terminal UI built with [OpenTUI](https://github.com/sst/opentui)
(React renderer for the terminal). Published to npm as [`skills-armory`](https://www.npmjs.com/package/skills-armory);
can also be compiled to a standalone binary via `bun build --compile`.

## License

MIT
