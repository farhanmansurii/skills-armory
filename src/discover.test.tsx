import { test, expect } from "bun:test";
import { act } from "react";
import { testRender } from "@opentui/react/test-utils";
import { KeyEvent } from "@opentui/core";
import * as core from "./core.ts";
import { App } from "./ui/App.tsx";

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

type Setup = Awaited<ReturnType<typeof testRender>>;

const press = (t: Setup, name: string, sequence = name) => {
  act(() => {
    t.renderer.keyInput.emit("keypress", new KeyEvent({
      name, sequence, ctrl: false, shift: false, meta: false, option: false,
      number: false, raw: sequence, eventType: "press", source: "raw",
    }));
  });
};

// ---------------------------------------------------------------- core pack API

test("listPacks derives real packs from sources.json + the store", () => {
  const cfg = core.loadConfig();
  const packs = core.listPacks(cfg);
  const store = core.storeSkills();

  // Every store skill is accounted for in exactly one pack.
  const accounted = packs.flatMap((p) => p.skills);
  expect(new Set(accounted).size).toBe(accounted.length); // no duplicates
  for (const s of store) expect(accounted).toContain(s);

  // "Unsorted" (skills with no tracked source) is pinned last when present.
  if (packs.some((p) => p.name === "Unsorted")) {
    expect(packs[packs.length - 1]!.name).toBe("Unsorted");
  }
});

test("groupBySource groups skills.sh results by their source repo", () => {
  const grouped = core.groupBySource([
    { name: "a", repo: "org/one", description: "", author: "org", category: "x" },
    { name: "b", repo: "org/one", description: "", author: "org", category: "x" },
    { name: "c", repo: "org/two", description: "", author: "org", category: "x" },
  ]);
  expect(grouped).toHaveLength(2);
  expect(grouped[0]!.source).toBe("org/one");
  expect(grouped[0]!.skills.map((s) => s.name)).toEqual(["a", "b"]);
  expect(grouped[1]!.source).toBe("org/two");
});

test("no hardcoded catalog exports remain", () => {
  // @ts-expect-error — these curated-catalog symbols must be gone
  expect(core.COMMUNITY_PACKS).toBeUndefined();
  // @ts-expect-error
  expect(core.COMMUNITY_SKILLS).toBeUndefined();
  // @ts-expect-error
  expect(core.catalogSkills).toBeUndefined();
  // @ts-expect-error
  expect(core.packForSkill).toBeUndefined();
  // @ts-expect-error
  expect(core.packByRepo).toBeUndefined();
});

// ---------------------------------------------------------------- UI smoke

test("app renders the Skills tab with the store's skills", async () => {
  const t = await testRender(<App />, { width: 110, height: 30 });
  try {
    await t.renderOnce();
    const frame = strip(t.captureCharFrame());
    expect(frame).toContain("SKILL");
  } finally {
    t.renderer.destroy();
  }
});

test("discover tab shows the search prompt (no hardcoded catalog)", async () => {
  const t = await testRender(<App />, { width: 110, height: 30 });
  try {
    await t.renderOnce();
    press(t, "3"); // discover
    await t.renderOnce();
    const frame = strip(t.captureCharFrame());
    expect(frame).toContain("Search skills (skills.sh)");
    expect(frame).toContain("Type to search skills.sh");
  } finally {
    t.renderer.destroy();
  }
});

test("skills: Space multi-selects and surfaces batch install/uninstall", async () => {
  const t = await testRender(<App />, { width: 110, height: 30 });
  try {
    await t.renderOnce();
    press(t, "space", " "); // mark skill at cursor 0
    await t.renderOnce();
    press(t, "j", "j"); // move down
    await t.renderOnce();
    press(t, "space", " "); // mark skill at cursor 1
    await t.renderOnce();
    const frame = strip(t.captureCharFrame());
    expect(frame).toContain("Uninstall (2)");
    expect(frame).toContain("Install (2)");
    expect(frame).toContain("2 selected");
  } finally {
    t.renderer.destroy();
  }
});

test("r reload re-scans without error", async () => {
  const t = await testRender(<App />, { width: 110, height: 30 });
  try {
    await t.renderOnce();
    press(t, "r", "r");
    await t.renderOnce();
    const frame = strip(t.captureCharFrame());
    expect(frame).toContain("Re-scanned");
  } finally {
    t.renderer.destroy();
  }
});
