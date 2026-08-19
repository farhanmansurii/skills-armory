import React, { useEffect, useState } from "react";
import * as core from "../../core.ts";
import {
  ACCENT, ACCENT_BG, BORDER, CYAN, DIM, fit, formatInstalls, PRIMARY, windowed
} from "../theme.ts";
import { SearchBar } from "../components/SearchBar.tsx";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function useSpinner(active: boolean): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(id);
  }, [active]);
  return SPINNER_FRAMES[active ? frame : 0]!;
}

export function DiscoverScreen(props: {
  skills: core.CommunitySkill[];
  cursor: number;
  filter: string;
  filtering: boolean;
  searching: boolean;
  importing: string | null;
  installed: string[];
  installedSources: Record<string, core.TrackedSource>;
  marked: Set<string>;
  exploringSource?: string | null;
  width: number;
  height: number;
}) {
  const {
    skills, cursor, filter, filtering, searching, importing, installed, installedSources,
    marked, exploringSource, width, height,
  } = props;

  const isMarked = (s: core.CommunitySkill) => marked.has(`${s.repo}::${s.name}`);

  const installedSet = React.useMemo(() => new Set(installed), [installed]);
  // A search result is "this exact skill" only if the store has that name AND
  // (we don't know its source, or the tracked source matches this result's repo)
  // — many different repos publish skills under the same name (e.g. "humanizer"),
  // and the store is flat/name-keyed, so a name-only match would tick every one
  // of them once you'd installed any single one.
  const isInstalled = React.useCallback(
    (s: core.CommunitySkill) => {
      if (!installedSet.has(s.name)) return false;
      const tracked = installedSources[s.name];
      return !tracked || tracked.source === s.repo;
    },
    [installedSet, installedSources],
  );
  const spinner = useSpinner(searching || !!importing);

  const sourceLabel = (s: core.CommunitySkill): string => s.repo || "—";

  const isSplit = width >= 90;
  const listW = isSplit ? Math.floor(width * 0.55) : width;
  const sideW = isSplit ? width - listW - 2 : 0;

  // Search bar is a 3-row bordered box (border + content + border), no gap;
  // table header (1) + margin (1) + footer hint row (1) + its margin (1).
  const rowsBudget = Math.max(2, height - 3 - 4);
  const { slice, offset } = windowed(skills, cursor, rowsBudget);
  const focused = skills[cursor];

  // Column widths sum exactly to the available list width (never more).
  const INDENT = 2;
  const usable = Math.max(20, listW - INDENT - 2); // 2 gaps between 3 columns
  const instW = Math.min(9, Math.max(7, Math.floor(usable * 0.15)));
  const sourceW = Math.min(28, Math.max(14, Math.floor(usable * 0.35)));
  const nameW = Math.max(14, usable - instW - sourceW);

  return (
    <box flexDirection="column">
      {/* Search Header Bar — replaced by a clear "viewing a source" banner
          while exploring one, instead of burying the repo name as dim
          placeholder text inside an otherwise-empty search box. */}
      <box flexDirection="row" alignItems="center" gap={2} flexShrink={0}>
        {exploringSource ? (
          <box flexGrow={1} flexDirection="column" borderStyle="rounded" borderColor={ACCENT} flexShrink={0}>
            <box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1} height={1} flexShrink={0}>
              <text fg={ACCENT}>
                <b>◆ Source: {exploringSource}</b>
              </text>
              <text fg={CYAN}>
                {searching ? `${spinner} loading...` : `${skills.length} skill(s)`}
              </text>
            </box>
          </box>
        ) : (
          <box flexGrow={1}>
            <SearchBar
              filter={filter}
              filtering={filtering}
              matchCount={skills.length}
              placeholder="Search skills (skills.sh) or paste GitHub owner/repo..."
            />
          </box>
        )}
        {searching && !exploringSource && (
          <box flexDirection="row" height={1} flexShrink={0}>
            <text fg={CYAN}>{spinner} searching skills.sh...</text>
          </box>
        )}
      </box>

      {/* Importing Banner */}
      {importing && (
        <box paddingLeft={1} paddingRight={1} backgroundColor={ACCENT_BG} marginTop={1} height={1} flexShrink={0}>
          <text fg="#FFFFFF">
            {spinner} Downloading & importing {importing}...
          </text>
        </box>
      )}

      {/* Main Table Split */}
      <box flexDirection="row" gap={2}>
        {/* Skills Table */}
        <box flexDirection="column" width={listW} maxHeight={rowsBudget + 4} overflow="hidden">
          <box flexDirection="row" height={1} flexShrink={0} marginBottom={1}>
            <text fg={DIM}>
              {"    "}
              {fit("SKILL", nameW)} {fit("SOURCE", sourceW)} {fit("INSTALLS", instW)}
            </text>
          </box>

          {slice.map((s, vi) => {
            const idx = offset + vi;
            const on = idx === cursor;
            const inst = s.id ? formatInstalls(s.installs) : "—";
            const installedHere = isInstalled(s);
            const markedHere = isMarked(s);

            if (on) {
              return (
                <box
                  key={s.name + s.repo}
                  backgroundColor={ACCENT_BG}
                  flexDirection="row"
                  height={1}
                  flexShrink={0}
                >
                  <text fg="#FFFFFF">
                    <span>❯ </span>
                    <span style={{ fg: markedHere ? ACCENT : "#FFFFFF" }}>{markedHere ? "● " : "○ "}</span>
                    <span>{installedHere ? "✓ " : "  "}</span>
                    <span>{fit(s.name, nameW)} </span>
                    <span style={{ fg: CYAN }}>{fit(sourceLabel(s), sourceW)} </span>
                    <span style={{ fg: "#E2E8F0" }}>{fit(inst, instW)}</span>
                  </text>
                </box>
              );
            }

            return (
              <box key={s.name + s.repo} flexDirection="row" height={1} flexShrink={0}>
                <text fg={PRIMARY}>
                  <span style={{ fg: DIM }}>  </span>
                  <span style={{ fg: markedHere ? ACCENT : DIM }}>{markedHere ? "● " : "○ "}</span>
                  <span style={{ fg: installedHere ? "#10B981" : DIM }}>{installedHere ? "✓ " : "  "}</span>
                  <span>{fit(s.name, nameW)} </span>
                  <span style={{ fg: CYAN }}>{fit(sourceLabel(s), sourceW)} </span>
                  <span style={{ fg: DIM }}>{fit(inst, instW)}</span>
                </text>
              </box>
            );
          })}

          {skills.length === 0 && (
            <box flexDirection="column" flexShrink={0}>
              {searching ? (
                <box height={1} flexShrink={0}>
                  <text fg={CYAN}>
                    {spinner} {exploringSource ? `Loading ${exploringSource}...` : `Searching for "${filter}"...`}
                  </text>
                </box>
              ) : exploringSource ? (
                <React.Fragment>
                  <box height={1} flexShrink={0}>
                    <text fg={PRIMARY}>No skills found from {exploringSource}.</text>
                  </box>
                  <box height={1} flexShrink={0}>
                    <text fg={DIM}>
                      skills.sh may not have indexed this repo, or the request failed — press O again to retry.
                    </text>
                  </box>
                </React.Fragment>
              ) : !filter.trim() ? (
                <box height={1} flexShrink={0}>
                  <text fg={DIM}>Type to search skills.sh, or paste a GitHub repo (owner/repo).</text>
                </box>
              ) : (
                <React.Fragment>
                  <box height={1} flexShrink={0}>
                    <text fg={PRIMARY}>No skills match "{filter}".</text>
                  </box>
                  <box height={1} flexShrink={0}>
                    <text fg={CYAN}>
                      Press Enter to download & import "{filter}" directly from GitHub!
                    </text>
                  </box>
                </React.Fragment>
              )}
            </box>
          )}

          <box marginTop={1} height={1} flexShrink={0}>
            <text fg={DIM}>
              {exploringSource
                ? `⏎: Install · Space: Mark · A: Mark all · I: Install marked${marked.size ? ` (${marked.size})` : ""} · b / Esc: back to search`
                : `⏎: Install · Space: Mark · I: Install marked${marked.size ? ` (${marked.size})` : ""} · O: Open source · /: Search skills.sh`}
            </text>
          </box>
        </box>

        {/* Right Details Card */}
        {isSplit && focused && (
          <box
            flexDirection="column"
            width={sideW}
            maxHeight={rowsBudget + 4}
            overflow="hidden"
            borderStyle="rounded"
            borderColor={BORDER}
            paddingLeft={1}
            paddingRight={1}
            flexShrink={0}
          >
            {(() => {
              const s = focused;
              const installedHere = isInstalled(s);
              return (
                <React.Fragment>
                  <box flexDirection="row" justifyContent="space-between" height={1} flexShrink={0} marginBottom={1}>
                    <text fg={ACCENT}>
                      <b>{s.name}</b>
                    </text>
                    <text fg={installedHere ? "#10B981" : DIM}>
                      {installedHere ? "✓ in store" : "not installed"}
                    </text>
                  </box>

                  <box height={1} flexShrink={0} marginBottom={1}>
                    <text fg={PRIMARY} wrapMode="none">
                      {fit(s.description, sideW - 4)}
                    </text>
                  </box>

                  <box height={1} flexShrink={0}>
                    <text fg={DIM} wrapMode="none">
                      Source: https://github.com/{s.repo}
                    </text>
                  </box>
                  <box height={1} flexShrink={0}>
                    <text fg={DIM}>Author: @{s.author}</text>
                  </box>

                  <box marginTop={1} height={1} flexShrink={0}>
                    <text fg="#10B981">
                      ⏎: Install · Space: Mark{!exploringSource ? " · O: Open source" : ""}
                    </text>
                  </box>
                </React.Fragment>
              );
            })()}
          </box>
        )}
      </box>
    </box>
  );
}
