// armory core — pure logic, no I/O formatting. Used by cli.ts and ui.tsx.
import { parse, stringify } from "smol-toml";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export const STORE = path.join(os.homedir(), ".agents", "skills");
export const DIR = path.join(os.homedir(), ".agents", "armory");
export const MANIFEST = path.join(DIR, "manifest.toml");
export const CONFIG = path.join(DIR, "config.toml");
const IGNORE = new Set([".DS_Store"]);

export type Manifest = {
  targets: Record<string, string>;
  install: Record<string, string[]>;
};
export type AgentProfile = { bins?: string[]; dirs?: string[]; skills: string };
export type InstallMode = "symlink" | "copy";
export type Config = {
  prefs: {
    auto_detect: boolean;
    install_mode: InstallMode;
  };
  agents: Record<string, AgentProfile>;
  packs: Record<string, string>;
};
export type EntryState = "link" | "dir" | "ext" | "broken" | "missing";
export type Action = {
  kind: "link" | "gone" | "skip" | "keep" | "miss" | "import" | "convert" | "conflict";
  agent: string;
  skill: string;
  detail?: string;
};

export type CommunitySkill = {
  name: string;
  repo: string;
  description: string;
  author: string;
  category: string;
  installs?: number;
  id?: string;
};

export type Pack = {
  id: string;
  name: string;
  repo: string;
  author: string;
  skills: string[];
};

// Skill -> pack name. Auto: skills sharing a tracked source (sources.json) group
// under that repo. Manual: config.toml's [packs] table overrides the pack name.
export function skillPacks(cfg: Config): Map<string, string> {
  const packs = new Map<string, string>();
  for (const [skill, info] of Object.entries(loadSources())) {
    packs.set(skill, info.source);
  }
  for (const [skill, pack] of Object.entries(cfg.packs ?? {})) {
    packs.set(skill, pack);
  }
  return packs;
}

// Real packs, derived from sources.json + the store + config.toml [packs]
// overrides. No hardcoded catalog — a skill's pack is where it actually came from.
export function listPacks(cfg: Config): Pack[] {
  const packOf = skillPacks(cfg);
  const groups = new Map<string, string[]>();
  for (const s of storeSkills()) {
    const pack = packOf.get(s) ?? "Unsorted";
    (groups.get(pack) ?? groups.set(pack, []).get(pack)!).push(s);
  }
  return [...groups.entries()]
    .map(([name, skills]) => ({
      id: name,
      name,
      repo: name === "Unsorted" ? "" : name,
      author: name === "Unsorted" ? "local" : (name.split("/")[0] || "local"),
      skills: skills.sort(),
    }))
    .sort((a, b) =>
      a.name === "Unsorted" ? 1 : b.name === "Unsorted" ? -1 : a.name.localeCompare(b.name),
    );
}

// Group live skills.sh search results by their source repo for the Discover list.
export function groupBySource(skills: CommunitySkill[]): { source: string; skills: CommunitySkill[] }[] {
  const groups = new Map<string, CommunitySkill[]>();
  for (const s of skills) {
    const key = s.repo || "unknown";
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
  }
  return [...groups.entries()]
    .map(([source, list]) => ({ source, skills: list }))
    .sort((a, b) => a.source.localeCompare(b.source));
}

export async function searchSkillsSh(query: string): Promise<CommunitySkill[]> {
  try {
    const url = `https://skills.sh/api/search?q=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    if (Array.isArray(data?.skills)) {
      return data.skills.map((s: any) => ({
        name: s.skillId || s.name,
        repo: s.source,
        description: `${s.name} from ${s.source}`,
        author: s.source?.split("/")[0] || "community",
        category: "skills.sh",
        installs: s.installs,
        id: s.id,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

// Reliably fetch every skill belonging to one source repo (skills.sh has no
// dedicated "list by repo" endpoint — searching `q=owner/repo` matches the
// `source` field fuzzily, so results are filtered to an exact match here).
export async function searchSkillsBySource(repo: string): Promise<CommunitySkill[]> {
  const results = await searchSkillsSh(repo);
  return results.filter((s) => s.repo === repo);
}

// Known harnesses. Users extend/override via config.toml [agents.x].
// skills is the agent's global skills dir. Detection = the skills dir (or config
// dir) exists on disk, or its binary is on PATH. Paths mirror the skills.sh
// canonical list. Agents whose skills.sh global path is ~/.agents/skills (the
// armory store itself) are omitted to avoid self-collision.
export const REGISTRY: Record<string, AgentProfile> = {
  claude: { bins: ["claude"], dirs: ["~/.claude"], skills: "~/.claude/skills" },
  opencode: { bins: ["opencode"], dirs: ["~/.config/opencode"], skills: "~/.config/opencode/skills" },
  codex: { bins: ["codex"], dirs: ["~/.codex"], skills: "~/.codex/skills" },
  gemini: { bins: ["gemini"], dirs: ["~/.gemini"], skills: "~/.gemini/skills" },
  amp: { bins: ["amp"], dirs: ["~/.config/amp"], skills: "~/.config/amp/skills" },
  cursor: { bins: ["cursor-agent", "cursor"], dirs: ["~/.cursor"], skills: "~/.cursor/skills" },
  windsurf: { bins: ["windsurf"], dirs: ["~/.codeium/windsurf", "~/.windsurf"], skills: "~/.codeium/windsurf/skills" },
  aider: { bins: ["aider"], dirs: ["~/.aider"], skills: "~/.aider/skills" },
  jcode: { bins: ["jcode"], dirs: ["~/.config/jcode", "~/.jcode"], skills: "~/.config/jcode/skills" },
  antigravity: { bins: ["antigravity"], dirs: ["~/.gemini/antigravity"], skills: "~/.gemini/antigravity/skills" },
  "antigravity-cli": { bins: ["antigravity"], dirs: ["~/.gemini/antigravity-cli"], skills: "~/.gemini/antigravity-cli/skills" },
  pi: { bins: ["pi"], dirs: ["~/.pi"], skills: "~/.pi/agent/skills" },
  agents: { dirs: ["~/.config/agents"], skills: "~/.config/agents/skills" }, // amp/replit/universal global
  bob: { dirs: ["~/.bob"], skills: "~/.bob/skills" },
  copilot: { bins: ["github-copilot"], dirs: ["~/.copilot"], skills: "~/.copilot/skills" },
  qwen: { bins: ["qwen-code"], dirs: ["~/.qwen"], skills: "~/.qwen/skills" },
  roo: { bins: ["roo"], dirs: ["~/.roo"], skills: "~/.roo/skills" },
  kilocode: { bins: ["kilo"], dirs: ["~/.kilocode"], skills: "~/.kilocode/skills" },
  crush: { bins: ["crush"], dirs: ["~/.config/crush"], skills: "~/.config/crush/skills" },
  goose: { bins: ["goose"], dirs: ["~/.config/goose"], skills: "~/.config/goose/skills" },
  grok: { bins: ["grok"], dirs: ["~/.grok"], skills: "~/.grok/skills" },
  "command-code": { bins: ["command-code"], dirs: ["~/.commandcode"], skills: "~/.commandcode/skills" },
  continue: { bins: ["continue"], dirs: ["~/.continue"], skills: "~/.continue/skills" },
  devin: { bins: ["devin"], dirs: ["~/.config/devin"], skills: "~/.config/devin/skills" },
  firebender: { bins: ["firebender"], dirs: ["~/.firebender"], skills: "~/.firebender/skills" },
  deepagents: { bins: ["deepagents"], dirs: ["~/.deepagents"], skills: "~/.deepagents/agent/skills" },
  kimchi: { bins: ["kimchi"], dirs: ["~/.config/kimchi"], skills: "~/.config/kimchi/harness/skills" },
};

export const expand = (p: string): string =>
  p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;

let _realStore: string | undefined;
export const realStore = () => (_realStore ??= fs.realpathSync(STORE));
// Guard: a managed target must never resolve to (or into) the store itself,
// or migrate/sync/purge would destroy the skill store. Defensive against bad config.
export const assertNotStore = (dir: string) => {
  if (dir === STORE) throw new Error(`refusing to operate on the store (${STORE})`);
  let real: string;
  try {
    real = fs.realpathSync(dir);
  } catch {
    return; // target doesn't exist yet; the caller will create it
  }
  let store: string;
  try {
    store = realStore();
  } catch {
    return;
  }
  if (real === store || real.startsWith(store + path.sep))
    throw new Error(`target ${dir} resolves to the store — fix config.toml`);
};

const whichCache = new Map<string, boolean>();
export function which(bin: string): boolean {
  if (whichCache.has(bin)) return whichCache.get(bin)!;
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!dir) continue;
    try {
      fs.accessSync(path.join(dir, bin), fs.constants.X_OK);
      whichCache.set(bin, true);
      return true;
    } catch {}
  }
  whichCache.set(bin, false);
  return false;
}

const SKIP_DISCOVERY_DIRS = new Set([
  ".cache", ".Trash", ".npm", ".cargo", ".rustup", ".local", ".docker",
  ".git", ".vscode", ".cursor-server", ".nvm", ".asdf", ".pyenv",
  ".virtualenvs", ".gemini", "Library", "Applications", "Pictures",
  "Movies", "Music", "Documents", "Downloads", "node_modules"
]);

// Find skills dirs not covered by the registry: ~/.config/<x>/skills and ~/.<x>/skills.
// The store itself and the armory dir are never candidates.
export function discoverSkillDirs(cfg: Config): { name: string; skills: string }[] {
  const known = new Set(
    Object.values({ ...REGISTRY, ...cfg.agents }).map((p) => expand(p.skills)),
  );
  known.add(STORE);
  known.add(DIR);
  const home = os.homedir();
  const out: { name: string; skills: string }[] = [];
  const check = (parent: string, stripDot: boolean) => {
    let ents: fs.Dirent[];
    try {
      ents = fs.readdirSync(parent, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      if (!e.isDirectory()) continue;
      if (stripDot && (SKIP_DISCOVERY_DIRS.has(e.name) || !e.name.startsWith("."))) continue;
      if (!stripDot && (SKIP_DISCOVERY_DIRS.has(e.name) || e.name.startsWith("."))) continue;
      const cand = path.join(parent, e.name, "skills");
      if (!known.has(cand) && fs.existsSync(cand) && fs.statSync(cand).isDirectory())
        out.push({ name: e.name.replace(/^\./, ""), skills: cand });
    }
  };
  check(path.join(home, ".config"), false);
  check(home, true);
  return out;
}

export type Detection = { name: string; skills: string; detected: boolean; inManifest: boolean };

export function detectAgents(cfg: Config, m: Manifest): Detection[] {
  const profiles = { ...REGISTRY, ...cfg.agents };
  return Object.entries(profiles).map(([name, p]) => ({
    name,
    skills: p.skills,
    detected: (p.bins ?? []).some(which) || (p.dirs ?? []).some((d) => fs.existsSync(expand(d))),
    inManifest: name in m.targets,
  }));
}

// ---------------------------------------------------------------- config

export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG)) {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(
      CONFIG,
      `# armory config — user preferences and agent profiles
[prefs]
auto_detect = true
install_mode = "symlink" # "symlink" or "copy"

# Add or override agent profiles:
# [agents.myagent]
# bins = ["myagent"]                     # detection: on PATH
# dirs = ["~/.config/myagent"]           # detection: dir exists
# skills = "~/.config/myagent/skills"    # where its skills live

# Reassign a skill's pack (overrides auto-grouping by source repo):
# [packs]
# caveman = "my-favorites"
`,
    );
  }
  const raw = parse(fs.readFileSync(CONFIG, "utf8")) as any;
  return {
    prefs: {
      auto_detect: raw.prefs?.auto_detect ?? true,
      install_mode: raw.prefs?.install_mode === "copy" ? "copy" : "symlink",
    },
    agents: raw.agents ?? {},
    packs: raw.packs ?? {},
  };
}

export function saveConfig(cfg: Config): void {
  const header = "# armory config — user preferences and agent profiles\n";
  fs.writeFileSync(
    CONFIG,
    header +
      stringify({
        prefs: {
          auto_detect: cfg.prefs.auto_detect ?? true,
          install_mode: cfg.prefs.install_mode ?? "symlink",
        },
        agents: cfg.agents ?? {},
        packs: cfg.packs ?? {},
      }),
  );
}

// ---------------------------------------------------------------- manifest

export function loadManifest(): Manifest {
  if (!fs.existsSync(MANIFEST)) {
    const cfg = loadConfig();
    const m: Manifest = { targets: {}, install: {} };
    for (const d of detectAgents(cfg, m)) {
      if (!d.detected) continue;
      m.targets[d.name] = d.skills;
      const dir = expand(d.skills);
      m.install[d.name] = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((n) => !n.startsWith(".")).sort()
        : [];
    }
    saveManifest(m);
  }
  const raw = parse(fs.readFileSync(MANIFEST, "utf8")) as any;
  return { targets: raw.targets ?? {}, install: raw.install ?? {} };
}

export function saveManifest(m: Manifest): void {
  const header = "# regenerated by armory on add/rm — comments are not preserved\n";
  fs.writeFileSync(MANIFEST, header + stringify({ targets: m.targets, install: m.install }));
}

// ---------------------------------------------------------------- fs state

export function entryState(p: string): EntryState {
  let st: fs.Stats;
  try {
    st = fs.lstatSync(p);
  } catch {
    return "missing";
  }
  if (st.isSymbolicLink()) {
    try {
      const rel = path.relative(realStore(), fs.realpathSync(p));
      return rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? "link" : "ext";
    } catch {
      return "broken";
    }
  }
  return st.isDirectory() ? "dir" : "missing";
}

export function entries(dir: string): Set<string> {
  if (!fs.existsSync(dir)) return new Set();
  return new Set(fs.readdirSync(dir).filter((n) => !n.startsWith(".")));
}

type TreeVal = ["link", string] | ["file", string];
function tree(root: string): Map<string, TreeVal> {
  const out = new Map<string, TreeVal>();
  const walk = (dir: string, rel: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORE.has(e.name)) continue;
      const full = path.join(dir, e.name);
      const r = rel ? path.join(rel, e.name) : e.name;
      if (e.isSymbolicLink()) out.set(r, ["link", fs.readlinkSync(full)]);
      else if (e.isDirectory()) walk(full, r);
      else if (e.isFile()) out.set(r, ["file", full]);
    }
  };
  walk(root, "");
  return out;
}

export function identical(a: string, b: string): boolean {
  const ta = tree(a);
  const tb = tree(b);
  if (ta.size !== tb.size) return false;
  for (const [k, va] of ta) {
    const vb = tb.get(k);
    if (!vb || va[0] !== vb[0]) return false;
    if (va[0] === "link" && va[1] !== vb[1]) return false;
    if (va[0] === "file" && vb[0] === "file" && !fs.readFileSync(va[1]).equals(fs.readFileSync(vb[1])))
      return false;
  }
  return true;
}

// ---------------------------------------------------------------- operations

export function add(m: Manifest, skills: string[], agents: string[], modeOverride?: InstallMode): Action[] {
  const cfg = loadConfig();
  const mode = modeOverride ?? cfg.prefs.install_mode ?? "symlink";
  const missing = skills.filter((s) => {
    const p = path.join(STORE, s);
    return !fs.existsSync(p) || !fs.statSync(p).isDirectory();
  });
  if (missing.length) throw new Error(`not in store: ${missing.join(", ")}`);
  const out: Action[] = [];
  for (const agent of agents) {
    const dir = expand(m.targets[agent]!);
    assertNotStore(dir);
    fs.mkdirSync(dir, { recursive: true });
    for (const s of skills) {
      const p = path.join(dir, s);
      const src = path.join(STORE, s);
      const st = entryState(p);
      if (st !== "missing") {
        out.push({ kind: "skip", agent, skill: s, detail: `already ${st}` });
      } else {
        if (mode === "copy") {
          fs.cpSync(src, p, { recursive: true, filter: (f) => !IGNORE.has(path.basename(f)) });
          out.push({ kind: "link", agent, skill: s, detail: "copied directory" });
        } else {
          fs.symlinkSync(src, p);
          out.push({ kind: "link", agent, skill: s });
        }
      }
      if (st === "missing" || st === "link") {
        m.install[agent] = [...new Set([...(m.install[agent] ?? []), s])].sort();
      }
    }
  }
  saveManifest(m);
  return out;
}

export function rm(m: Manifest, skills: string[], agents: string[], force: boolean): Action[] {
  const out: Action[] = [];
  for (const agent of agents) {
    const dir = expand(m.targets[agent]!);
    assertNotStore(dir);
    for (const s of skills) {
      const p = path.join(dir, s);
      const st = entryState(p);
      if (st === "link" || st === "broken" || ((st === "dir" || st === "ext") && force)) {
        if (st === "dir") fs.rmSync(p, { recursive: true, force: true });
        else fs.unlinkSync(p);
        out.push({ kind: "gone", agent, skill: s, detail: `was ${st}` });
      } else if (st === "dir" || st === "ext") {
        out.push({ kind: "keep", agent, skill: s, detail: `real ${st} — refusing (use --force)` });
      } else {
        out.push({ kind: "skip", agent, skill: s, detail: st });
      }
      if (m.install[agent]) m.install[agent] = m.install[agent]!.filter((x) => x !== s);
    }
  }
  saveManifest(m);
  return out;
}

export function sync(m: Manifest): Action[] {
  const cfg = loadConfig();
  const mode = cfg.prefs.install_mode ?? "symlink";
  const out: Action[] = [];
  for (const agent of Object.keys(m.targets)) {
    const want = new Set(m.install[agent] ?? []);
    const dir = expand(m.targets[agent]!);
    assertNotStore(dir);
    if (want.size === 0 && !fs.existsSync(dir)) continue; // don't create dirs we manage nothing into
    fs.mkdirSync(dir, { recursive: true });
    const have = entries(dir);
    for (const s of [...want].filter((s) => !have.has(s)).sort()) {
      const src = path.join(STORE, s);
      if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
        if (mode === "copy") {
          fs.cpSync(src, path.join(dir, s), {
            recursive: true,
            filter: (f) => !IGNORE.has(path.basename(f)),
          });
          out.push({ kind: "link", agent, skill: s, detail: "copied" });
        } else {
          fs.symlinkSync(src, path.join(dir, s));
          out.push({ kind: "link", agent, skill: s });
        }
      } else {
        out.push({ kind: "miss", agent, skill: s, detail: "not in store" });
      }
    }
    for (const s of [...have].filter((s) => !want.has(s)).sort()) {
      const p = path.join(dir, s);
      const st = entryState(p);
      if (st === "link") {
        fs.unlinkSync(p);
        out.push({ kind: "gone", agent, skill: s, detail: "not in manifest" });
      } else if (st === "dir" && mode === "copy") {
        fs.rmSync(p, { recursive: true, force: true });
        out.push({ kind: "gone", agent, skill: s, detail: "removed copy" });
      } else {
        out.push({ kind: "keep", agent, skill: s, detail: `${st}, not in manifest` });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- skills.sh & github importer

export const SOURCES = path.join(DIR, "sources.json");

export type TrackedSource = {
  source: string;
  subPath?: string;
  installedAt: string;
  updatedAt?: string;
};

export function loadSources(): Record<string, TrackedSource> {
  try {
    if (fs.existsSync(SOURCES)) {
      return JSON.parse(fs.readFileSync(SOURCES, "utf8"));
    }
  } catch {}
  return {};
}

export function saveSources(sources: Record<string, TrackedSource>): void {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(SOURCES, JSON.stringify(sources, null, 2), "utf8");
}

export type ImportResult = {
  success: boolean;
  skills: string[];
  message: string;
};

// Recognizes a pasted install command (e.g. "npx skills add owner/repo",
// "skills add owner/repo") or a bare "owner/repo" / GitHub URL, and returns
// the source to hand to importSkillFromSource. Returns null if the input
// doesn't look like an install source at all.
const INSTALL_CMD_PREFIX = /^\s*(?:npx\s+)?(?:skills|armory)\s+add\s+/i;
export function parseInstallSource(input: string): string | null {
  const stripped = input.replace(INSTALL_CMD_PREFIX, "").trim();
  if (!stripped) return null;
  if (stripped.startsWith("https://github.com/") || stripped.startsWith("http://github.com/")) return stripped;
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/.test(stripped) && !stripped.includes(" ")) return stripped;
  return null;
}

export async function importSkillFromSource(
  source: string,
  specificSkill?: string | string[],
): Promise<ImportResult> {
  const trimmed = source.trim();
  if (!trimmed) throw new Error("Empty skill source");

  // Normalize source to git url
  let gitUrl = trimmed;
  let subPath = "";

  if (trimmed.startsWith("https://github.com/") || trimmed.startsWith("http://github.com/")) {
    const withoutHost = trimmed.replace(/^https?:\/\/github\.com\//, "");
    const parts = withoutHost.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      gitUrl = `https://github.com/${parts[0]}/${parts[1].replace(/\.git$/, "")}.git`;
      if (parts.includes("tree")) {
        const treeIdx = parts.indexOf("tree");
        subPath = parts.slice(treeIdx + 2).join("/");
      }
    }
  } else if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/.test(trimmed) && !trimmed.includes("://")) {
    const parts = trimmed.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      gitUrl = `https://github.com/${parts[0]}/${parts[1]}.git`;
      if (parts.length > 2) {
        subPath = parts.slice(2).join("/");
      }
    }
  }

  // Create temporary directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "armory-import-"));
  try {
    const proc = Bun.spawnSync(["git", "clone", "--depth", "1", gitUrl, tmpDir]);
    if (proc.exitCode !== 0) {
      const err = proc.stderr.toString();
      throw new Error(`Failed to clone ${gitUrl}: ${err}`);
    }

    // Search for SKILL.md files — support both monorepos with multiple sub-skills and single skills
    const foundSkills: { name: string; dir: string }[] = [];
    const searchRoot = subPath ? path.join(tmpDir, subPath) : tmpDir;

    // Scan subdirectories recursively for skill packages
    const scan = (dir: string, depth = 0) => {
      if (depth > 4) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name.startsWith(".") || e.name === "node_modules" || e.name === ".git") continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (fs.existsSync(path.join(full, "SKILL.md"))) {
            foundSkills.push({ name: e.name, dir: full });
          } else {
            scan(full, depth + 1);
          }
        }
      }
    };
    scan(searchRoot);

    // If no nested sub-skills found, check root of search directory
    if (foundSkills.length === 0 && fs.existsSync(path.join(searchRoot, "SKILL.md"))) {
      const singleName = typeof specificSkill === "string" ? specificSkill : undefined;
      const name =
        singleName ||
        (path.basename(searchRoot) === path.basename(tmpDir)
          ? path.basename(gitUrl, ".git")
          : path.basename(searchRoot));
      foundSkills.push({ name, dir: searchRoot });
    }

    if (foundSkills.length === 0) {
      throw new Error(`No SKILL.md found in ${source}`);
    }

    const wantedSet = specificSkill
      ? Array.isArray(specificSkill)
        ? new Set(specificSkill)
        : new Set([specificSkill])
      : null;

    const sources = loadSources();
    const imported: string[] = [];
    for (const item of foundSkills) {
      if (wantedSet && !wantedSet.has(item.name) && foundSkills.length > 1) {
        continue;
      }
      const targetDir = path.join(STORE, item.name);
      fs.mkdirSync(STORE, { recursive: true });
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
      fs.cpSync(item.dir, targetDir, {
        recursive: true,
        filter: (f) => !IGNORE.has(path.basename(f)) && !f.includes("/.git"),
      });
      imported.push(item.name);
      sources[item.name] = {
        source: trimmed,
        subPath: subPath || undefined,
        installedAt: new Date().toISOString(),
      };
    }

    saveSources(sources);
    clearCaches();
    return {
      success: true,
      skills: imported,
      message: `Imported ${imported.length} skill(s) into store: ${imported.join(", ")}`,
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

export async function updateSkills(specificSkills?: string[]): Promise<{ updated: string[]; failed: string[] }> {
  const sources = loadSources();
  const toUpdate = specificSkills?.length ? specificSkills : Object.keys(sources);
  const updated: string[] = [];
  const failed: string[] = [];

  // Group by source repo to avoid redundant git clones
  const bySource: Record<string, string[]> = {};
  for (const skill of toUpdate) {
    const info = sources[skill];
    if (info) {
      (bySource[info.source] ??= []).push(skill);
    }
  }

  for (const [sourceRepo, skills] of Object.entries(bySource)) {
    try {
      const res = await importSkillFromSource(sourceRepo);
      for (const s of skills) {
        if (res.skills.includes(s)) {
          sources[s] = {
            ...sources[s]!,
            updatedAt: new Date().toISOString(),
          };
          updated.push(s);
        }
      }
    } catch {
      failed.push(...skills);
    }
  }

  // Also if central store is a git repo, pull upstream git changes
  try {
    if (fs.existsSync(path.join(STORE, ".git"))) {
      const proc = Bun.spawnSync(["git", "-C", STORE, "pull", "--rebase"]);
      if (proc.exitCode === 0) {
        clearCaches();
      }
    }
  } catch {}

  saveSources(sources);
  clearCaches();
  return { updated, failed };
}

export type DriftEntry = { agent: string; skill: string; state: EntryState };
export function drift(m: Manifest): DriftEntry[] {
  const cfg = loadConfig();
  const mode = cfg.prefs.install_mode ?? "symlink";
  const out: DriftEntry[] = [];
  for (const agent of Object.keys(m.targets)) {
    const dir = expand(m.targets[agent]!);
    assertNotStore(dir);
    for (const s of [...entries(dir)].sort()) {
      const state = entryState(path.join(dir, s));
      if (state === "link") continue;
      if (state === "dir" && mode === "copy") continue; // real dirs are expected in copy mode
      out.push({ agent, skill: s, state });
    }
  }
  return out;
}

// Repairs one drift entry: "broken"/"ext" relink straight to the store
// (dropping whatever the old target was); "dir" converts a real copy to a
// symlink, importing it into the store first if needed. Shared by migrate()
// (bulk sweep — skips "ext" since an external link might be deliberate) and
// fixDriftEntries() (explicit per-row fix, where relinking "ext" is exactly
// the intent).
function fixOneEntry(m: Manifest, agent: string, dir: string, skill: string, st: EntryState): Action {
  const p = path.join(dir, skill);
  const src = path.join(STORE, skill);

  if (st === "broken" || st === "ext") {
    fs.unlinkSync(p);
    if (fs.existsSync(src)) {
      fs.symlinkSync(src, p);
      m.install[agent] = [...new Set([...(m.install[agent] ?? []), skill])].sort();
      return { kind: "convert", agent, skill, detail: `relinked ${st} symlink` };
    }
    if (m.install[agent]) m.install[agent] = m.install[agent]!.filter((x) => x !== skill);
    return { kind: "gone", agent, skill, detail: `removed ${st} symlink (skill no longer in store)` };
  }

  // st === "dir"
  if (!fs.existsSync(src)) {
    fs.cpSync(p, src, { recursive: true, filter: (f) => !IGNORE.has(path.basename(f)) });
  }
  if (identical(p, src)) {
    fs.rmSync(p, { recursive: true, force: true });
    fs.symlinkSync(src, p);
    m.install[agent] = [...new Set([...(m.install[agent] ?? []), skill])].sort();
    return { kind: "convert", agent, skill };
  }
  return { kind: "conflict", agent, skill, detail: "differs from store — left untouched" };
}

export function migrate(m: Manifest): Action[] {
  const out: Action[] = [];
  for (const agent of Object.keys(m.targets)) {
    const dir = expand(m.targets[agent]!);
    assertNotStore(dir);
    for (const s of [...entries(dir)].sort()) {
      const st = entryState(path.join(dir, s));
      if (st !== "broken" && st !== "dir") continue;
      out.push(fixOneEntry(m, agent, dir, s, st));
    }
  }
  saveManifest(m);
  clearCaches();
  return out;
}

// Fixes exactly the given (agent, skill) drift entries (Cleanup screen row
// selection) — unlike migrate(), also relinks "ext" entries.
export function fixDriftEntries(m: Manifest, targets: { agent: string; skill: string }[]): Action[] {
  const out: Action[] = [];
  for (const { agent, skill } of targets) {
    const dir = expand(m.targets[agent]!);
    assertNotStore(dir);
    const st = entryState(path.join(dir, skill));
    if (st === "link" || st === "missing") continue;
    out.push(fixOneEntry(m, agent, dir, skill, st));
  }
  saveManifest(m);
  clearCaches();
  return out;
}

// Removes exactly the given (agent, skill) drift entries without repairing
// them — the "uninstall" counterpart to fixDriftEntries().
export function removeDriftEntries(m: Manifest, targets: { agent: string; skill: string }[]): Action[] {
  const out: Action[] = [];
  for (const { agent, skill } of targets) {
    out.push(...rm(m, [skill], [agent], true));
  }
  return out;
}

// ---------------------------------------------------------------- store info & cleanup

// Names must not escape the store: no slashes, no dot-traversal. Spaces are fine.
const safeName = (n: string) =>
  n.length > 0 && !n.includes("/") && !n.includes("\\") && n !== "." && n !== "..";

const descCache = new Map<string, string>();
let storeSkillsCache: string[] | null = null;

export function clearCaches(): void {
  storeSkillsCache = null;
  descCache.clear();
}

export function skillDescription(name: string): string {
  if (descCache.has(name)) return descCache.get(name)!;
  try {
    const file = path.join(STORE, name, "SKILL.md");
    if (!fs.existsSync(file)) {
      descCache.set(name, "");
      return "";
    }
    const head = fs.readFileSync(file, "utf8").slice(0, 4000);
    const fm = head.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const body = fm ? fm[1]! : head;
    const d = body.match(/^description:\s*(.*)$/m);
    if (!d) {
      descCache.set(name, "");
      return "";
    }
    let val = d[1]!.trim();
    if (val === ">-" || val === ">" || val === "|-" || val === "|") {
      const lines: string[] = [];
      for (const line of body.slice(body.indexOf(d[0]) + d[0].length).split("\n")) {
        if (/^\s*$/.test(line)) continue; // skip leading/trailing blank lines
        if (/^\s+\S/.test(line)) lines.push(line.trim());
        else break;
      }
      val = lines.join(" ");
    }
    const clean = val.replace(/^["']|["']$/g, "");
    descCache.set(name, clean);
    return clean;
  } catch {
    descCache.set(name, "");
    return "";
  }
}

export function storeSkills(): string[] {
  if (storeSkillsCache) return storeSkillsCache;
  if (!fs.existsSync(STORE)) return [];
  storeSkillsCache = fs
    .readdirSync(STORE)
    .filter((n) => !n.startsWith(".") && fs.statSync(path.join(STORE, n)).isDirectory())
    .sort();
  return storeSkillsCache;
}

export function orphans(m: Manifest): string[] {
  const used = new Set(Object.values(m.install).flat());
  return storeSkills().filter((s) => !used.has(s));
}

export function removeFromStore(names: string[]): void {
  for (const n of names) {
    if (!safeName(n)) throw new Error(`unsafe skill name: ${n}`);
    fs.rmSync(path.join(STORE, n), { recursive: true, force: true });
  }
  clearCaches();
}

// Complete uninstall: unlink from every agent, drop from all install lists, delete from store.
// The store is a git repo — recovery: git -C ~/.agents/skills checkout -- <name>
export function purge(m: Manifest, skills: string[]): Action[] {
  const out: Action[] = [];
  for (const s of skills) {
    if (!safeName(s)) throw new Error(`unsafe skill name: ${s}`);
    for (const agent of Object.keys(m.targets)) {
      const dir = expand(m.targets[agent]!);
      assertNotStore(dir);
      const p = path.join(dir, s);
      const st = entryState(p);
      if (st === "link" || st === "broken") {
        fs.unlinkSync(p);
        out.push({ kind: "gone", agent, skill: s, detail: `was ${st}` });
      } else if (st === "dir" || st === "ext") {
        out.push({ kind: "keep", agent, skill: s, detail: `real ${st} — left in place` });
      }
      if (m.install[agent]) m.install[agent] = m.install[agent]!.filter((x) => x !== s);
    }
    const src = path.join(STORE, s);
    if (fs.existsSync(src)) {
      fs.rmSync(src, { recursive: true, force: true });
      out.push({ kind: "gone", agent: "store", skill: s });
    }
  }
  saveManifest(m);
  clearCaches();
  return out;
}

// Enable/disable a managed target. Enabling snapshots the dir's current entries.
export function setTarget(m: Manifest, name: string, skillsDir: string, on: boolean): void {
  if (on) {
    m.targets[name] = skillsDir;
    const dir = expand(skillsDir);
    m.install[name] = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((n) => !n.startsWith(".")).sort()
      : [];
  } else {
    delete m.targets[name];
    delete m.install[name];
  }
  saveManifest(m);
}

// Fast batch snapshot that scans each target directory once O(agents) instead of O(agents * skills)
export function fastSnapshot(m: Manifest) {
  const agents = Object.keys(m.targets);
  const fsMap = new Map<string, EntryState>();
  // Every skill actually in the central store must be listed — not just
  // ones a manifest install-list or an agent's directory happens to
  // mention — or a skill with 0 installs and no drift (a plain orphan)
  // is invisible on the Skills tab with no way to select or purge it.
  const allSkillsSet = new Set<string>(storeSkills());

  for (const list of Object.values(m.install)) {
    for (const s of list) allSkillsSet.add(s);
  }

  const rStore = realStore();

  for (const agent of agents) {
    const dir = expand(m.targets[agent]!);
    if (!fs.existsSync(dir)) continue;
    let ents: fs.Dirent[] = [];
    try {
      ents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of ents) {
      if (e.name.startsWith(".")) continue;
      allSkillsSet.add(e.name);
      const full = path.join(dir, e.name);
      let state: EntryState = "missing";
      if (e.isSymbolicLink()) {
        try {
          const target = fs.realpathSync(full);
          const rel = path.relative(rStore, target);
          state = rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? "link" : "ext";
        } catch {
          state = "broken";
        }
      } else if (e.isDirectory()) {
        state = "dir";
      }
      fsMap.set(`${agent}/${e.name}`, state);
    }
  }

  const skills = [...allSkillsSet].sort();
  return {
    agents,
    skills,
    fsMap,
    cell: (skill: string, agent: string): EntryState =>
      fsMap.get(`${agent}/${skill}`) ?? "missing",
  };
}

export function matrix(m: Manifest) {
  const agents = Object.keys(m.targets);
  const skills = [
    ...new Set([
      ...agents.flatMap((a) => [...entries(expand(m.targets[a]!))]),
      ...Object.values(m.install).flat(),
    ]),
  ].sort();
  return {
    agents,
    skills,
    cell: (skill: string, agent: string): EntryState =>
      entryState(path.join(expand(m.targets[agent]!), skill)),
  };
}
