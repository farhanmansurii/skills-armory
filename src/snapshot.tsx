// Static frame renderer — renders each screen with real data using OpenTUI testRender
// Usage: bun src/snapshot.tsx [skills|detail|agents|discover|cleanup|help]
import React from "react";
import { testRender } from "@opentui/react/test-utils";
import * as core from "./core.ts";
import {
  SkillsScreen, DetailScreen, AgentsScreen, DiscoverScreen, SettingsScreen, CleanupScreen, HelpScreen, Header, snapshot, type AgentRow,
} from "./ui.tsx";

const W = 100;
const H = 18;
const which = process.argv[2] ?? "all";

const m = core.loadManifest();
const cfg = core.loadConfig();
const snap = snapshot(m);
const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

const agentRows = (): AgentRow[] => {
  const known: AgentRow[] = core
    .detectAgents(cfg, m)
    .filter((d) => d.detected || d.inManifest)
    .map((d) => ({
      name: d.name,
      skills: d.skills,
      detected: d.detected,
      managed: d.inManifest,
      discovered: false,
      count: m.install[d.name]?.length ?? 0,
    }));
  const extra: AgentRow[] = core
    .discoverSkillDirs(cfg)
    .filter((d) => !known.some((k) => k.name === d.name))
    .map((d) => ({
      name: d.name,
      skills: d.skills,
      detected: true,
      managed: d.name in m.targets,
      discovered: true,
      count: m.install[d.name]?.length ?? 0,
    }));
  return [...known, ...extra].sort((x, y) => Number(y.managed) - Number(x.managed) || x.name.localeCompare(y.name));
};

// Sample skills.sh-style results for the discover snapshot (the real view is
// populated by live search; this only exercises the layout).
const sampleDiscover: core.CommunitySkill[] = [
  { name: "brainstorming", repo: "obra/superpowers", description: "Structured exploration of user intent, edge cases, and design specs", author: "obra", category: "skills.sh", installs: 331694, id: "obra/superpowers/brainstorming" },
  { name: "systematic-debugging", repo: "obra/superpowers", description: "Scientific debugging methodology to isolate and fix root causes", author: "obra", category: "skills.sh", installs: 229984, id: "obra/superpowers/systematic-debugging" },
  { name: "webapp-testing", repo: "anthropics/skills", description: "End-to-end web application testing and verification", author: "anthropic", category: "skills.sh", installs: 135829, id: "anthropics/skills/webapp-testing" },
];

const frames: Record<string, { el: React.ReactNode; height?: number; width?: number }> = {
  header: {
    el: (
      <Header
        snap={snap}
        activeTab="skills"
        storeCount={core.storeSkills().length}
        installMode="symlink"
        width={W}
      />
    ),
    height: 8,
  },
  header_big: {
    el: (
      <Header
        snap={snap}
        activeTab="skills"
        storeCount={core.storeSkills().length}
        installMode="symlink"
        width={90}
        big
      />
    ),
    height: 12,
  },
  skills: {
    el: (
      <SkillsScreen
        snap={snap}
        install={m.install}
        skills={snap.skills}
        cursor={3}
        marked={new Set(["caveman", "brainstorming"])}
        height={H}
        width={W}
        filter=""
        filtering={false}
      />
    ),
    height: H,
  },
  detail: {
    el: (
      <DetailScreen snap={snap} install={m.install} skill="caveman" cursor={1} width={W} height={H} />
    ),
    height: H,
  },
  agents: {
    el: <AgentsScreen rows={agentRows()} cursor={0} height={H} />,
    height: H,
  },
  discover: {
    el: (
      <DiscoverScreen
        skills={sampleDiscover}
        cursor={0}
        filter=""
        filtering={false}
        searching={false}
        importing={null}
        installed={core.storeSkills()}
        width={W}
        height={H}
      />
    ),
    height: H,
  },
  settings: {
    el: <SettingsScreen cfg={cfg} cursor={0} />,
    height: H,
  },
  cleanup: {
    el: (
      <CleanupScreen
        orphans={core.orphans(m)}
        drift={core.drift(m)}
        marked={new Set()}
        cursor={0}
        height={H}
      />
    ),
    height: H,
  },
  help: {
    el: <HelpScreen />,
    height: H,
  },
};

for (const [name, config] of Object.entries(frames)) {
  if (which !== "all" && which !== name) continue;
  console.log(`\n===== ${name} =====`);
  const frameWidth = config.width ?? W;
  const frameHeight = config.height ?? H;
  const setup = await testRender(config.el, { width: frameWidth, height: frameHeight });
  try {
    await setup.renderOnce();
    const frame = setup.captureCharFrame();
    console.log(strip(frame));
  } finally {
    setup.renderer.destroy();
  }
}
