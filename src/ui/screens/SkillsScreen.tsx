import React from "react";
import type * as core from "../../core.ts";
import type { Snap } from "../types.ts";
import { BG_SELECT, BORDER, ACCENT, DIM, fit, PRIMARY, windowed } from "../theme.ts";
import { AgentBadgeList } from "../components/AgentBadge.tsx";
import { Inspector } from "../components/Inspector.tsx";
import { SearchBar } from "../components/SearchBar.tsx";

export function SkillsScreen(props: {
  snap: Snap;
  install: Record<string, string[]>;
  skills: string[];
  cursor: number;
  marked: Set<string>;
  height: number;
  width: number;
  filter: string;
  filtering: boolean;
}) {
  const { snap, install, skills, cursor, marked, height, width, filter, filtering } = props;

  const isSplit = width >= 90;
  const listW = isSplit ? Math.floor(width * 0.58) : width;
  const sideW = isSplit ? width - listW - 2 : 0;

  // Space left under the bordered search bar (3 rows, no gap) for the two panels below.
  const panelH = Math.max(4, height - 3);

  const nameW = Math.min(26, Math.max(14, ...snap.skills.map((s) => s.length)));
  const cellW = Math.max(8, listW - nameW - 14);

  // Fixed chrome inside the list panel: 2 border + 1 column-header row + 1 spacer.
  const rowsBudget = Math.max(2, panelH - 4);
  const { slice, offset } = windowed(skills, cursor, rowsBudget);
  const focusedSkill = skills[cursor];

  return (
    <box flexDirection="column" maxHeight={height} overflow="hidden">
      {/* Top Search Bar */}
      <SearchBar
        filter={filter}
        filtering={filtering}
        matchCount={skills.length}
        totalCount={snap.skills.length}
        placeholder="Find skills (press / to filter)..."
      />

      {/* Main Dual-Pane or Single List View */}
      <box flexDirection="row" gap={2} maxHeight={panelH} overflow="hidden">
        {/* Left: Skills List panel */}
        <box
          flexDirection="column"
          width={listW}
          maxHeight={panelH}
          overflow="hidden"
          borderStyle="rounded"
          borderColor={BORDER}
          paddingLeft={1}
          paddingRight={1}
        >
          {/* Column Header */}
          <box flexDirection="row" justifyContent="space-between" height={1} flexShrink={0} marginBottom={1}>
            <text fg={DIM}>
              {" "}{fit("SKILL", nameW)}
            </text>
            <text fg={DIM}>INSTALLED IN{marked.size ? `   ${marked.size} selected` : ""}</text>
          </box>

          {/* Rows */}
          <box flexDirection="column" overflow="hidden">
            {slice.map((s, vi) => {
              const on = offset + vi === cursor;
              const isMarked = marked.has(s);

              return (
                <box
                  key={s}
                  flexDirection="row"
                  height={1}
                  flexShrink={0}
                  backgroundColor={on ? BG_SELECT : undefined}
                >
                  <box width={1} height={1} flexShrink={0} backgroundColor={on ? ACCENT : undefined} />
                  <text fg={PRIMARY}>
                    <span style={{ fg: isMarked ? "#10B981" : DIM }}>{isMarked ? " ✓ " : "   "}</span>
                    <span>{fit(s, nameW)}</span>
                  </text>
                  <box flexGrow={1} />
                  <AgentBadgeList
                    skill={s}
                    snap={snap}
                    install={install}
                    width={cellW}
                    active={on}
                  />
                  <text> </text>
                </box>
              );
            })}

            {skills.length === 0 && (
              <box flexDirection="column" alignItems="center" marginTop={2}>
                <text fg={DIM}>
                  {filter ? `No skills match "${filter}"` : "Store is empty"}
                </text>
                <text fg={DIM}>
                  {filter ? "Press Esc to clear the filter" : "Press 3 to browse Discover"}
                </text>
              </box>
            )}
          </box>
        </box>

        {/* Right: Live Inspector Card */}
        {isSplit && focusedSkill && (
          <Inspector
            skill={focusedSkill}
            snap={snap}
            width={sideW}
            height={panelH}
          />
        )}
      </box>
    </box>
  );
}
