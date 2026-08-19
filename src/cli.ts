#!/usr/bin/env bun
// armory cli — headless commands; bare `armory` in a TTY opens the Ink UI.
import {
  add, detectAgents, discoverSkillDirs, drift, loadConfig, loadManifest, matrix, migrate, rm,
  saveConfig, setTarget, sync, importSkillFromSource, updateSkills, searchSkillsSh, listPacks, type Action, type Manifest,
} from "./core.ts";

const HELP = `armory — manage agent skills across harnesses from one central store

usage:
  armory                                      open the TUI (TTY only)
  armory ls                                   matrix of skill x agent
  armory add <skills...> --to <agents,...|all>
  armory rm <skills...> --from <agents,...|all> [--force]
  armory install <repo|url> [--skill <name>] [--to <agents|all>]
  armory update [skills...]                   update skills from upstream git/skills.sh
  armory discover [query]                     search community skills from skills.sh
  armory config [get|set] [key] [value]       view or change settings (install_mode, auto_detect)
  armory sync                                 apply manifest to reality
  armory drift                                list non-symlink entries in target dirs
  armory migrate                              convert real-dir copies to store symlinks
  armory apply                                migrate then sync (all at once)
  armory detect                               probe for installed agents, add new targets
`;

const MARK = { link: "L", dir: "D", ext: "E", broken: "!", missing: "." } as const;

function parseFlags(args: string[]) {
  const pos: string[] = [];
  const f: Record<string, string[] | boolean | string> = {};
  let i = 0;
  while (i < args.length) {
    const a = args[i]!;
    if (a === "--force") {
      f.force = true;
      i++;
    } else if (a === "--skill") {
      f.skill = args[i + 1] ?? "";
      i += 2;
    } else if (a === "--to" || a === "--from") {
      const vals: string[] = [];
      i++;
      while (i < args.length && !args[i]!.startsWith("--")) {
        vals.push(...args[i]!.split(",").filter(Boolean));
        i++;
      }
      f[a.slice(2)] = vals;
    } else {
      pos.push(a);
      i++;
    }
  }
  return { pos, f };
}

function agentsOrAll(m: Manifest, raw: unknown): string[] {
  const names = Array.isArray(raw) ? raw : [];
  if (names.includes("all")) return Object.keys(m.targets);
  if (!names.length) die(`missing agents (use --to/--from, targets: ${Object.keys(m.targets).join(", ")})`);
  const bad = names.filter((a) => !(a in m.targets));
  if (bad.length) die(`unknown agent(s): ${bad.join(", ")} (targets: ${Object.keys(m.targets).join(", ")})`);
  return names;
}

function printActions(acts: Action[]) {
  const label: Record<Action["kind"], string> = {
    link: "link ", gone: "gone ", skip: "skip ", keep: "keep ",
    miss: "MISS ", import: "import  ", convert: "convert ", conflict: "CONFLICT",
  };
  for (const a of acts) {
    const line = `${label[a.kind]} ${a.agent}/${a.skill}${a.detail ? ` (${a.detail})` : ""}`;
    if (a.kind === "conflict" || a.kind === "miss") console.error(line);
    else console.log(line);
  }
}

function die(msg: string): never {
  console.error(`armory: ${msg}`);
  process.exit(1);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (!cmd) {
    if (process.stdout.isTTY) {
      const { run } = await import("./ui.tsx");
      await run();
    } else {
      process.stdout.write(HELP);
    }
    return;
  }

  const m = loadManifest();
  const { pos, f } = parseFlags(rest);

  switch (cmd) {
    case "ls": {
      const { agents, skills, cell } = matrix(m);
      const w = Math.max(10, ...skills.map((s) => s.length));
      console.log(" ".repeat(w + 2) + agents.map((a) => a.slice(0, 6).padStart(6)).join("  "));
      for (const s of skills)
        console.log(s.padEnd(w) + "  " + agents.map((a) => MARK[cell(s, a)].padStart(6)).join("  "));
      console.log("\nL=symlink to store  D=real dir (run migrate)  E=external link  !=broken  .=absent");
      break;
    }
    case "add":
      if (!pos.length) die("no skills given");
      printActions(add(m, pos, agentsOrAll(m, f.to)));
      break;
    case "rm":
      if (!pos.length) die("no skills given");
      printActions(rm(m, pos, agentsOrAll(m, f.from), !!f.force));
      break;
    case "install": {
      if (!pos.length) die("no repository or URL given. Example: armory install vercel-labs/skills");
      const source = pos[0]!;
      const spec = typeof f.skill === "string" ? f.skill : undefined;
      console.log(`Cloning and importing from ${source}...`);
      const res = await importSkillFromSource(source, spec);
      console.log(`✓ ${res.message}`);
      if (f.to) {
        const agents = agentsOrAll(m, f.to);
        printActions(add(m, res.skills, agents));
      }
      break;
    }
    case "update": {
      process.stdout.write("🔄 Checking for skill updates from upstream...\n");
      const res = await updateSkills(pos.length ? pos : undefined);
      if (res.updated.length > 0) {
        console.log(`✓ Updated ${res.updated.length} skill(s): ${res.updated.join(", ")}`);
        const acts = sync(m);
        if (acts.length > 0) {
          printActions(acts);
        }
        console.log("✓ Synchronized updated skills across all managed agents.");
      } else if (res.failed.length > 0) {
        console.log(`⚠️ Failed to update: ${res.failed.join(", ")}`);
      } else {
        console.log("✓ All skills are up to date.");
      }
      break;
    }
    case "discover": {
      const q = pos.join(" ").trim();
      if (!q) {
        const cfg = loadConfig();
        const packs = listPacks(cfg);
        console.log(`\nYour packs (grouped by source repo from ~/.agents/skills):\n`);
        for (const p of packs) {
          console.log(`● ${p.name} — ${p.skills.length} skill(s)`);
          console.log(`  ${p.skills.slice(0, 8).join(", ")}${p.skills.length > 8 ? ` (+${p.skills.length - 8} more)` : ""}\n`);
        }
        console.log("Search the skills.sh catalog with: armory discover <query>");
        console.log("To install a repo: armory install <owner/repo> --skill <name> --to all");
        break;
      }
      console.log(`Searching skills.sh for "${q}"...\n`);
      const matches = await searchSkillsSh(q);
      if (matches.length === 0) {
        console.log("No results. To install directly: armory install <owner/repo> --to all");
        break;
      }
      for (const s of matches) {
        console.log(`● ${s.name.padEnd(24)} [${s.category}] (${s.repo})`);
        console.log(`  ${s.description}\n`);
      }
      console.log("To install: armory install <repo> --skill <name> --to all");
      break;
    }
    case "config": {
      const cfg = loadConfig();
      const sub = pos[0];
      if (!sub || sub === "get") {
        const k = pos[1];
        if (!k) {
          console.log(`[prefs]`);
          console.log(`install_mode = "${cfg.prefs.install_mode}"`);
          console.log(`auto_detect  = ${cfg.prefs.auto_detect}`);
        } else if (k === "install_mode") {
          console.log(cfg.prefs.install_mode);
        } else if (k === "auto_detect") {
          console.log(cfg.prefs.auto_detect);
        } else {
          die(`unknown config key '${k}'`);
        }
      } else if (sub === "set") {
        const k = pos[1];
        const v = pos[2];
        if (!k || !v) die("usage: armory config set <key> <value>");
        if (k === "install_mode") {
          if (v !== "symlink" && v !== "copy") die("install_mode must be 'symlink' or 'copy'");
          cfg.prefs.install_mode = v;
          saveConfig(cfg);
          console.log(`✓ set install_mode = "${v}"`);
        } else if (k === "auto_detect") {
          cfg.prefs.auto_detect = v === "true" || v === "1";
          saveConfig(cfg);
          console.log(`✓ set auto_detect = ${cfg.prefs.auto_detect}`);
        } else {
          die(`unknown config key '${k}'`);
        }
      } else {
        die("usage: armory config [get|set] [key] [value]");
      }
      break;
    }
    case "sync":
      printActions(sync(m));
      console.log("sync done");
      break;
    case "drift": {
      const rows = drift(m);
      const real = rows.filter((r) => r.state !== "ext");
      for (const r of rows)
        console.log(`${r.state.padStart(6)}  ${r.agent}/${r.skill}${r.state === "ext" ? "  (external, informational)" : ""}`);
      if (!real.length) console.log(rows.length ? "" : "clean");
      else console.log(`\n${real.length} entr${real.length > 1 ? "ies" : "y"} need attention (run migrate)`);
      break;
    }
    case "migrate": {
      const acts = migrate(m);
      printActions(acts);
      const n = (k: Action["kind"]) => acts.filter((a) => a.kind === k).length;
      console.log(`\n${n("convert")} converted, ${n("import")} imported, ${n("conflict")} conflicts`);
      break;
    }
    case "apply": {
      const acts = [...migrate(m), ...sync(m)];
      printActions(acts);
      console.log("apply done");
      break;
    }
    case "detect": {
      const cfg = loadConfig();
      const found = detectAgents(cfg, m);
      for (const d of found.filter((d) => d.detected))
        console.log(`● ${d.name.padEnd(12)} ${d.skills}${d.inManifest ? "  (target)" : ""}`);
      const discovered = discoverSkillDirs(cfg).filter(
        (d) => !(d.name in m.targets) && !found.some((f) => f.name === d.name),
      );
      for (const d of discovered) console.log(`? ${d.name.padEnd(12)} ${d.skills}  (unknown agent — enable in TUI agents screen)`);
      if (cfg.prefs.auto_detect) {
        // Only known harnesses auto-add; discovered unknown dirs are suggestions, never targets.
        const toAdd = found.filter((d) => d.detected && !d.inManifest);
        for (const d of toAdd) setTarget(m, d.name, d.skills, true);
        if (toAdd.length) console.log(`\nadded target(s): ${toAdd.map((d) => d.name).join(", ")}`);
      }
      break;
    }
    case "help":
    case "--help":
    case "-h":
      process.stdout.write(HELP);
      break;
    default:
      die(`unknown command '${cmd}'\n\n${HELP}`);
  }
}

main().catch((e) => die(e.message));
