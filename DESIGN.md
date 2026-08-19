# Armory — design system

## Direction
Crush / Charm terminal aesthetic (Charmbracelet Glamour Dark canon).
Mode: Operate — high-efficiency, keyboard-first skill management across AI coding agents.
Bronze/copper and steel-blue accents on dark ground, crisp selection bars, and live split inspection.

## Tokens & Palette
- **Primary Accent** `#B45309` (bronze): focused highlight bar, tabs, checkmarks, borders
- **Secondary Accent** `#5B8DAE` (steel blue): search query echo, inspect highlights
- **Ember Badge** `#F97316` (ember orange): pending markers `⚡`, banner slashes `//////` — forge-spark motif
- **Text Ground** `#F8FAFC` (bright near-white): headers, active text
- **Muted Slate** `#64748B`: secondary text, borders, absent dots
- **State colors** (installed-in pills, detail status) — unchanged, chosen to stay distinct from the bronze/steel accents:
  - `link` = `#10B981` (emerald green)
  - `dir` (drift / real copy) = `#F59E0B` (amber yellow)
  - `ext` (external link) = `#38BDF8` (sky blue)
  - `broken` = `#EF4444` (rose red)
  - `missing` = `#475569` (dim dark slate)

## Surface & Layout
- Fullscreen alternate-screen buffer, cursor hidden, restored cleanly on exit
- **Header**: Compact 4-line zero-scroll guarantee header:
  - Line 1: `////// Armory v2.0.0 //////////////////////////////////////`
  - Line 2: Navigation tabs: `[1] Skills  [2] Agents  [3] Discover  [4] Settings  [5] Cleanup  [6] Help`
  - Line 3: Live stats pill: `53 skills · 20 agents · 147 in store · mode: symlink · ⚡ 2 pending`
  - Line 4: Divider rule `────────────`
- **Strict Viewport Bounding**: Dynamic table height `Math.max(3, stdout.rows - 11)` ensures header, tabs, list, inspector, and footer NEVER scroll off the terminal viewport.
- **Dual-Pane Split Screen** (terminals >= 90 cols):
  - Left: Scrollable matrix/list with solid background highlight bar (`#92400E`)
  - Right: Live Inspection card with description from `SKILL.md`, store path, and metadata

## Screens
- **[1] Skills**: Searchable list with live inspector; skills grouped under pack headers (auto by source repo, or manual override via `config.toml`'s `[packs]` table); batch selection (`space`), bulk install (`I`), bulk remove (`X`), purge (`d`), apply (`a`), migrate (`m`)
- **[2] Agents**: Detected & discovered harnesses; toggle management (`space`)
- **[3] Discover**: Browse curated skills from `skills.sh` or type any GitHub repo (`owner/repo`) to download & import directly into store (`Space`/`Enter`)
- **[4] Settings**: Interactive preferences:
  - **Install Strategy**: `Symlink (Recommended)` ⟷ `Copy (Real directories)`
  - **Auto-Detection**: `Enabled` ⟷ `Disabled`
  - Store and config path references
- **[5] Cleanup**: Orphan skills (in store but 0 installs) + Drift inspector; batch purge / migration
- **[6] Help**: Built-in cheatsheet with keybindings and central store architecture

## Performance Architecture
- Batch single-pass filesystem scanning: O(agents) instead of O(agents * skills * syscalls)
- Memoized `SKILL.md` frontmatter and cached PATH binary resolution
- Standalone compiled binary (`bin/armory`) with instant startup (<40ms)