import React, { useEffect, useMemo, useRef, useState } from "react";
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import * as core from "../core.ts";
import type { AgentRow, ConfirmState, Snap, TabKey } from "./types.ts";
import { ASCII_LOGO_MIN_ROWS, ASCII_LOGO_MIN_WIDTH, PRIMARY } from "./theme.ts";
import { TAB_KEYS } from "./keymap.ts";
import { Header, headerHeight } from "./components/Header.tsx";
import { Footer } from "./components/Footer.tsx";
import { ConfirmModal } from "./components/ConfirmModal.tsx";
import { SkillsScreen } from "./screens/SkillsScreen.tsx";
import { DetailScreen } from "./screens/DetailScreen.tsx";
import { AgentsScreen } from "./screens/AgentsScreen.tsx";
import { DiscoverScreen } from "./screens/DiscoverScreen.tsx";
import { SettingsScreen } from "./screens/SettingsScreen.tsx";
import { CleanupScreen, driftKey } from "./screens/CleanupScreen.tsx";
import { HelpScreen } from "./screens/HelpScreen.tsx";

export function App() {
  const renderer = useRenderer();
  const { width = 100, height: termRows = 24 } = useTerminalDimensions();

  const bigLogo = width >= ASCII_LOGO_MIN_WIDTH && termRows >= ASCII_LOGO_MIN_ROWS;
  const footerHeight = 3;
  const contentHeight = Math.max(3, termRows - headerHeight(bigLogo) - footerHeight);

  const [manifest, setManifest] = useState(() => core.loadManifest());
  const [config, setConfig] = useState(() => core.loadConfig());
  const [snap, setSnap] = useState<Snap>(() => core.fastSnapshot(manifest));
  const [activeTab, setActiveTab] = useState<TabKey>("skills");
  const [cursor, setCursor] = useState(0);
  const [detailSkill, setDetailSkill] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [filtering, setFiltering] = useState(false);
  const [searching, setSearching] = useState(false);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);
  const [status, setStatus] = useState("ready");
  const [importing, setImporting] = useState<string | null>(null);
  const [liveSkills, setLiveSkills] = useState<core.CommunitySkill[]>([]);
  // Non-null while the user has pressed O on a skill to see every skill from
  // its source repo (not just whatever matched the current search query).
  const [exploringSource, setExploringSource] = useState<string | null>(null);
  const [sourceSkills, setSourceSkills] = useState<core.CommunitySkill[]>([]);

  const storeSkillsList = useMemo(() => core.storeSkills(), [manifest]);
  const installedSources = useMemo(() => core.loadSources(), [manifest]);
  const sortedAgents = useMemo(() => [...snap.agents].sort(), [snap.agents]);

  const refresh = () => {
    core.clearCaches();
    const m = core.loadManifest();
    const cfg = core.loadConfig();
    setManifest({ ...m });
    setConfig({ ...cfg });
    setSnap(core.fastSnapshot(m));
  };

  const skills = useMemo(() => {
    return snap.skills.filter((s) => s.toLowerCase().includes(filter.toLowerCase()));
  }, [snap.skills, filter]);

  // Live skills.sh search, only while on the Discover tab with a query.
  // Paused while exploring one source's full skill list (see below).
  // `searchGen` discards a response if a newer request has since started —
  // clearTimeout only cancels a timer, not a fetch already in flight.
  const searchGen = useRef(0);
  useEffect(() => {
    if (activeTab !== "discover" || exploringSource) return;
    if (!filter.trim()) {
      setLiveSkills([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const gen = ++searchGen.current;
      try {
        const results = await core.searchSkillsSh(filter);
        if (gen === searchGen.current) setLiveSkills(results);
      } catch {
        if (gen === searchGen.current) setLiveSkills([]);
      } finally {
        if (gen === searchGen.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [filter, activeTab, exploringSource]);

  // Fetch every skill from one source repo when the user presses O.
  // `sourceRetry` is bumped to force a refetch of the same repo (e.g. the
  // first attempt came back empty from a network hiccup) — exploringSource
  // alone wouldn't change, so the effect wouldn't otherwise re-run.
  const [sourceRetry, setSourceRetry] = useState(0);
  useEffect(() => {
    if (!exploringSource) return;
    const gen = ++searchGen.current;
    setSearching(true);
    core
      .searchSkillsBySource(exploringSource)
      .then((results) => {
        if (gen === searchGen.current) setSourceSkills(results);
      })
      .catch(() => {
        if (gen === searchGen.current) setSourceSkills([]);
      })
      .finally(() => {
        if (gen === searchGen.current) setSearching(false);
      });
  }, [exploringSource, sourceRetry]);

  const discoverSkills = exploringSource ? sourceSkills : liveSkills;

  const agentRows = useMemo((): AgentRow[] => {
    const known: AgentRow[] = core
      .detectAgents(config, manifest)
      .filter((d) => d.detected || d.inManifest)
      .map((d) => ({
        name: d.name,
        skills: d.skills,
        detected: d.detected,
        managed: d.inManifest,
        discovered: false,
        count: manifest.install[d.name]?.length ?? 0,
      }));
    const extra: AgentRow[] = core
      .discoverSkillDirs(config)
      .filter((d) => !known.some((k) => k.name === d.name))
      .map((d) => ({
        name: d.name,
        skills: d.skills,
        detected: true,
        managed: d.name in manifest.targets,
        discovered: true,
        count: manifest.install[d.name]?.length ?? 0,
      }));
    return [...known, ...extra].sort(
      (x, y) => Number(y.managed) - Number(x.managed) || x.name.localeCompare(y.name),
    );
  }, [manifest, config]);

  const installMarked = () => {
    if (!marked.size) return;
    const skills = [...marked];
    try {
      const m = core.loadManifest();
      const agents = Object.keys(m.targets);
      const acts = core.add(m, skills, agents);
      const n = acts.filter((a) => a.kind === "link").length;
      setMarked(new Set());
      setStatus(n ? `✓ Installed ${skills.length} skill(s) → ${n} agent link(s)` : `${skills.length} skill(s) already installed everywhere`);
      refresh();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const uninstallMarked = () => {
    if (!marked.size) return;
    const skills = [...marked];
    try {
      const m = core.loadManifest();
      const agents = Object.keys(m.targets);
      const acts = core.rm(m, skills, agents, false);
      const n = acts.filter((a) => a.kind === "gone").length;
      setMarked(new Set());
      setStatus(`✓ Uninstalled ${skills.length} skill(s) — removed ${n} link(s)`);
      refresh();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const reload = () => {
    refresh();
    setStatus("✓ Re-scanned");
  };

  const toggleAgent = (skill: string, agent: string) => {
    try {
      const m = core.loadManifest();
      const installed = (m.install[agent] ?? []).includes(skill);
      if (installed) {
        core.rm(m, [skill], [agent], false);
        setStatus(`✓ Removed '${skill}' from ${agent}`);
      } else {
        const acts = core.add(m, [skill], [agent]);
        setStatus(acts.some((a) => a.kind === "link") ? `✓ Installed '${skill}' to ${agent}` : `'${skill}' not installed (not in store?)`);
      }
      refresh();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const askPurge = (victims: string[]) =>
    setConfirmModal({
      title: `Purge ${victims.length} skill(s) from store and unlink everywhere?`,
      message: `Affected: ${victims.slice(0, 5).join(", ")}${victims.length > 5 ? ` (+${victims.length - 5} more)` : ""}\n\nNote: The central store is git-versioned. Restore via: git -C ~/.agents/skills checkout -- .`,
      confirmLabel: "Press 'y' to Purge",
      cancelLabel: "Press 'Esc' or 'n' to Cancel",
      isDestructive: true,
      run: () => {
        const m = core.loadManifest();
        core.purge(m, victims);
        setMarked(new Set());
        setStatus(`✓ Purged ${victims.length} skill(s)`);
        refresh();
        if (detailSkill) setDetailSkill(null);
      },
    });

  const switchTab = (t: TabKey) => {
    setActiveTab(t);
    setCursor(0);
    setConfirmModal(null);
    setDetailSkill(null);
    setFilter("");
    setFiltering(false);
    setMarked(new Set());
    setExploringSource(null);
  };

  const handleImport = async (repo: string, skillName?: string) => {
    setImporting(repo);
    setStatus(`⏳ Downloading ${repo}...`);
    try {
      const res = await core.importSkillFromSource(repo, skillName);
      if (res.skills.length > 0) {
        const m = core.loadManifest();
        const agents = Object.keys(m.targets);
        const acts = core.add(m, res.skills, agents);
        const n = acts.filter((a) => a.kind === "link").length;
        setStatus(`✓ Installed ${res.skills.join(", ")} to ${n} agent(s)`);
      } else {
        setStatus(`⚠️ ${res.message}`);
      }
      refresh();
    } catch (e: any) {
      setStatus(`Import Error: ${e.message}`);
    } finally {
      setImporting(null);
    }
  };

  const handleImportMany = async (items: { repo: string; name: string }[]) => {
    if (!items.length) return;
    setImporting(items[0]!.repo);
    let installedCount = 0;
    for (const [i, item] of items.entries()) {
      setStatus(`⏳ Installing ${i + 1}/${items.length}: ${item.name} (${item.repo})...`);
      try {
        const res = await core.importSkillFromSource(item.repo, item.name);
        if (res.skills.length > 0) {
          const m = core.loadManifest();
          core.add(m, res.skills, Object.keys(m.targets));
          installedCount++;
        }
      } catch {
        // keep going — report the tally at the end, per-item errors aren't actionable in a batch
      }
    }
    setStatus(`✓ Installed ${installedCount}/${items.length} skill(s)`);
    setMarked(new Set());
    setImporting(null);
    refresh();
  };

  const migrateAndSync = () => {
    try {
      const m = core.loadManifest();
      const acts = [...core.migrate(m), ...core.sync(m)];
      const n = acts.filter(
        (a) => a.kind === "link" || a.kind === "gone" || a.kind === "convert" || a.kind === "import",
      ).length;
      setStatus(n ? `✓ Migrate & Sync: ${n} change(s) applied` : "Migrate & Sync: all clean");
      refresh();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const autofix = () => {
    try {
      const m = core.loadManifest();
      const acts = [...core.migrate(m), ...core.sync(m)];
      const n = acts.filter(
        (a) => a.kind === "link" || a.kind === "gone" || a.kind === "convert" || a.kind === "import",
      ).length;
      setStatus(n ? `✓ Auto-fixed ${n} drift/mismatch entr${n === 1 ? "y" : "ies"}` : "✓ Auto-fix: already clean");
      refresh();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  // Parses `drift:${agent}/${skill}` keys back into pairs for the targeted
  // fix/remove actions below (see CleanupScreen's driftKey()).
  const parseDriftMarks = (marks: Set<string>): { agent: string; skill: string }[] =>
    [...marks]
      .filter((k) => k.startsWith("drift:"))
      .map((k) => {
        const [agent, ...rest] = k.slice("drift:".length).split("/");
        return { agent: agent!, skill: rest.join("/") };
      });

  const fixSelectedDrift = () => {
    const targets = parseDriftMarks(marked);
    if (!targets.length) return;
    try {
      const m = core.loadManifest();
      const acts = core.fixDriftEntries(m, targets);
      const n = acts.filter((a) => a.kind === "convert" || a.kind === "gone").length;
      setMarked(new Set());
      setStatus(n ? `✓ Fixed ${n} selected drift entr${n === 1 ? "y" : "ies"}` : "No fixable selected entries");
      refresh();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const removeSelectedDrift = () => {
    const targets = parseDriftMarks(marked);
    if (!targets.length) return;
    try {
      const m = core.loadManifest();
      const acts = core.removeDriftEntries(m, targets);
      const n = acts.filter((a) => a.kind === "gone").length;
      setMarked(new Set());
      setStatus(`✓ Removed ${n} selected drift entr${n === 1 ? "y" : "ies"}`);
      refresh();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const handleUpdateSkills = async () => {
    setStatus("⏳ Updating skills from upstream remotes & central git...");
    try {
      const res = await core.updateSkills();
      if (res.updated.length > 0) {
        setStatus(`✓ Updated ${res.updated.length} skill(s): ${res.updated.join(", ")}`);
        refresh();
      } else if (res.failed.length > 0) {
        setStatus(`⚠️ Failed to update: ${res.failed.join(", ")}`);
      } else {
        setStatus("✓ All skills are up to date with upstream");
      }
    } catch (e: any) {
      setStatus(`Update error: ${e.message}`);
    }
  };

  useKeyboard((event) => {
    if (event.eventType === "release") return;

    // Modal Confirmation Dialog
    if (confirmModal) {
      if (event.name === "y" || event.sequence === "y" || event.sequence === "Y") {
        confirmModal.run();
        setConfirmModal(null);
      } else if (event.name === "escape" || event.name === "n" || event.sequence === "n") {
        setStatus("Action cancelled");
        setConfirmModal(null);
      }
      return;
    }

    // Active Search Filtering
    if (filtering) {
      if (event.name === "return") {
        setFiltering(false);
        const src = activeTab === "discover" ? core.parseInstallSource(filter) : null;
        if (src) handleImport(src);
      } else if (event.name === "escape") {
        setFiltering(false);
      } else if (event.name === "backspace" || event.name === "delete") {
        setFilter((f) => f.slice(0, -1));
        setCursor(0);
      } else if (event.sequence && event.sequence.length === 1 && !event.ctrl && !event.meta) {
        setFilter((f) => f + event.sequence);
        setCursor(0);
      }
      return;
    }

    // Direct Tab Switching
    if (event.sequence === "1" || event.name === "1") return switchTab("skills");
    if (event.sequence === "2" || event.name === "2") return switchTab("agents");
    if (event.sequence === "3" || event.name === "3") return switchTab("discover");
    if (event.sequence === "4" || event.name === "4") return switchTab("settings");
    if (event.sequence === "5" || event.name === "5") return switchTab("cleanup");
    if (event.sequence === "6" || event.name === "6" || event.sequence === "?") return switchTab("help");

    if (event.name === "tab" || event.name === "right") {
      const tabs: TabKey[] = [...TAB_KEYS];
      const nextIdx = (tabs.indexOf(activeTab) + 1) % tabs.length;
      return switchTab(tabs[nextIdx]!);
    }
    if ((event.name === "tab" && event.shift) || event.name === "left") {
      const tabs: TabKey[] = [...TAB_KEYS];
      const prevIdx = (tabs.indexOf(activeTab) - 1 + tabs.length) % tabs.length;
      return switchTab(tabs[prevIdx]!);
    }

    // Quit Application
    if (event.sequence === "q" || event.name === "q") {
      renderer?.destroy();
      return;
    }

    if (event.sequence === "U") return handleUpdateSkills();
    if (event.sequence === "r" || event.sequence === "R") return reload();

    const down = (n: number) => setCursor((c) => Math.min(c + 1, Math.max(0, n - 1)));
    const up = () => setCursor((c) => Math.max(c - 1, 0));

    const mark = (s: string) =>
      setMarked((mk) => {
        const next = new Set(mk);
        if (next.has(s)) next.delete(s);
        else next.add(s);
        return next;
      });

    // Skill Drilldown (per-agent) Navigation
    if (detailSkill) {
      if (event.name === "escape" || event.sequence === "b") {
        setDetailSkill(null);
      } else if (event.name === "down" || event.name === "j" || event.sequence === "j") {
        down(sortedAgents.length);
      } else if (event.name === "up" || event.name === "k" || event.sequence === "k") {
        up();
      } else if (event.name === "space" || event.sequence === " ") {
        const a = sortedAgents[cursor];
        if (a) toggleAgent(detailSkill, a);
      } else if (event.sequence === "d") {
        askPurge([detailSkill]);
      }
      return;
    }

    // Main Tabs Navigation
    if (activeTab === "skills") {
      if (event.name === "down" || event.name === "j" || event.sequence === "j") down(skills.length);
      else if (event.name === "up" || event.name === "k" || event.sequence === "k") up();
      else if ((event.name === "space" || event.sequence === " ") && skills.length) {
        const s = skills[cursor];
        if (s) mark(s);
      } else if (event.sequence === "A" && skills.length) setMarked(new Set(skills));
      else if (event.sequence === "u") setMarked(new Set());
      else if (event.sequence === "I" && marked.size) installMarked();
      else if (event.sequence === "X" && marked.size) uninstallMarked();
      else if (event.sequence === "d" && skills.length) {
        const s = skills[cursor];
        if (s) askPurge(marked.size ? [...marked] : [s]);
      } else if (event.sequence === "m") migrateAndSync();
      else if (event.sequence === "/" || event.name === "/") setFiltering(true);
      else if (event.name === "return" && skills.length) {
        const s = skills[cursor];
        if (s) {
          setDetailSkill(s);
          setCursor(0);
        }
      }
    } else if (activeTab === "agents") {
      if (event.name === "down" || event.name === "j" || event.sequence === "j") down(agentRows.length);
      else if (event.name === "up" || event.name === "k" || event.sequence === "k") up();
      else if ((event.name === "space" || event.sequence === " ") && agentRows.length) {
        const r = agentRows[cursor];
        if (r) {
          const m = core.loadManifest();
          core.setTarget(m, r.name, r.skills, !r.managed);
          setStatus(r.managed ? `${r.name} unmanaged` : `✓ ${r.name} now managed`);
          refresh();
        }
      }
    } else if (activeTab === "discover") {
      if (event.name === "down" || event.name === "j" || event.sequence === "j") down(discoverSkills.length);
      else if (event.name === "up" || event.name === "k" || event.sequence === "k") up();
      else if (event.sequence === "/" || event.name === "/") setFiltering(true);
      else if ((event.name === "escape" || event.sequence === "b") && exploringSource) {
        setExploringSource(null);
        setCursor(0);
      } else if (event.sequence === "o" || event.sequence === "O") {
        if (exploringSource && discoverSkills.length === 0) {
          setSourceRetry((n) => n + 1);
        } else {
          const item = discoverSkills[cursor];
          if (item) {
            setExploringSource(item.repo);
            setCursor(0);
          }
        }
      } else if (event.name === "return" && discoverSkills.length) {
        const item = discoverSkills[cursor];
        if (item) handleImport(item.repo, item.name);
      } else if ((event.name === "space" || event.sequence === " ") && discoverSkills.length) {
        const item = discoverSkills[cursor];
        if (item) mark(`${item.repo}::${item.name}`);
      } else if (event.sequence === "A" && discoverSkills.length) {
        setMarked(new Set(discoverSkills.map((s) => `${s.repo}::${s.name}`)));
      } else if (event.sequence === "I" && marked.size) {
        // Marked keys are self-contained ("repo::name"), so this installs
        // everything marked so far even if it spans multiple explored
        // sources/searches, not just what's in the current list.
        handleImportMany(
          [...marked].map((k) => {
            const [repo, name] = k.split("::");
            return { repo: repo!, name: name! };
          }),
        );
      }
    } else if (activeTab === "settings") {
      if (event.name === "down" || event.name === "j" || event.sequence === "j") down(4);
      else if (event.name === "up" || event.name === "k" || event.sequence === "k") up();
      else if (event.name === "space" || event.sequence === " " || event.name === "return") {
        if (cursor === 0) {
          const nextMode = config.prefs.install_mode === "symlink" ? "copy" : "symlink";
          config.prefs.install_mode = nextMode;
          core.saveConfig(config);
          setStatus(`✓ Install Strategy switched to: ${nextMode}`);
          refresh();
        } else if (cursor === 1) {
          config.prefs.auto_detect = !config.prefs.auto_detect;
          core.saveConfig(config);
          setStatus(`✓ Harness Auto-Detection: ${config.prefs.auto_detect ? "Enabled" : "Disabled"}`);
          refresh();
        }
      }
    } else if (activeTab === "cleanup") {
      // Orphans and drift share one cursor (see CleanupScreen) so up/down
      // and Space reach every row, not just orphans.
      const orph = core.orphans(manifest);
      const driftList = core.drift(manifest);
      const total = orph.length + driftList.length;
      if (event.name === "down" || event.name === "j" || event.sequence === "j") down(total);
      else if (event.name === "up" || event.name === "k" || event.sequence === "k") up();
      else if ((event.name === "space" || event.sequence === " ") && total) {
        if (cursor < orph.length) {
          const s = orph[cursor];
          if (s) mark(s);
        } else {
          const d = driftList[cursor - orph.length];
          if (d) mark(driftKey(d));
        }
      } else if (event.sequence === "u") setMarked(new Set());
      else if (event.sequence === "A" && total) {
        setMarked(new Set([...orph, ...driftList.map(driftKey)]));
      } else if (event.sequence === "d" && marked.size) {
        const victims = [...marked].filter((k) => !k.startsWith("drift:"));
        if (victims.length) askPurge(victims);
      } else if (event.sequence === "I" && marked.size) fixSelectedDrift();
      else if (event.sequence === "X" && marked.size) removeSelectedDrift();
      else if (event.sequence === "m") migrateAndSync();
      else if (event.sequence === "f") autofix();
    } else if (activeTab === "help") {
      if (event.name === "escape" || event.sequence === "b") switchTab("skills");
    }
  });

  return (
    <box flexDirection="column" width={width} height={termRows} overflow="hidden" paddingLeft={1} paddingRight={1}>
      {/* Header — pinned, never shrinks */}
      <Header
        snap={snap}
        activeTab={activeTab}
        storeCount={storeSkillsList.length}
        installMode={config.prefs.install_mode}
        width={width}
        big={bigLogo}
      />

      {/* Content well — takes all remaining space, clips instead of overlapping the footer */}
      <box flexDirection="column" maxHeight={contentHeight} flexShrink={0} overflow="hidden">
      {confirmModal ? (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          width={width}
        />
      ) : detailSkill ? (
        <DetailScreen
          snap={snap}
          install={manifest.install}
          skill={detailSkill}
          cursor={cursor}
          width={width}
          height={contentHeight}
        />
      ) : activeTab === "skills" ? (
        <SkillsScreen
          snap={snap}
          install={manifest.install}
          skills={skills}
          cursor={cursor}
          marked={marked}
          height={contentHeight}
          width={width}
          filter={filter}
          filtering={filtering}
        />
      ) : activeTab === "agents" ? (
        <AgentsScreen rows={agentRows} cursor={cursor} height={contentHeight} />
      ) : activeTab === "discover" ? (
        <DiscoverScreen
          skills={discoverSkills}
          cursor={cursor}
          filter={filter}
          filtering={filtering}
          searching={searching}
          importing={importing}
          installed={storeSkillsList}
          installedSources={installedSources}
          marked={marked}
          exploringSource={exploringSource}
          width={width}
          height={contentHeight}
        />
      ) : activeTab === "settings" ? (
        <SettingsScreen cfg={config} cursor={cursor} />
      ) : activeTab === "cleanup" ? (
        <CleanupScreen
          orphans={core.orphans(manifest)}
          drift={core.drift(manifest)}
          marked={marked}
          cursor={cursor}
          height={contentHeight}
        />
      ) : (
        <HelpScreen />
      )}
      </box>

      {/* Footer — pinned, never shrinks */}
      <Footer
        activeTab={activeTab}
        markedCount={marked.size}
        filtering={filtering}
        filterText={filter}
        statusMessage={status}
        detailSkillName={detailSkill}
        width={width}
      />
    </box>
  );
}
