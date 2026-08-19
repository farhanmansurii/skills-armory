import React from "react";
import type * as core from "../../core.ts";
import {
  ACCENT, ACCENT_BG, CYAN, DIM, fit, getAgentColor, PRIMARY, STATE_COLOR, windowed
} from "../theme.ts";

// A drift row's mark key — distinct from a plain orphan skill name (which
// could otherwise collide with a drift entry for the same skill name on a
// different agent).
export const driftKey = (d: { agent: string; skill: string }) => `drift:${d.agent}/${d.skill}`;

export function CleanupScreen(props: {
  orphans: string[];
  drift: core.DriftEntry[];
  marked: Set<string>;
  cursor: number;
  height: number;
}) {
  const { orphans, drift, marked, cursor, height } = props;

  // Orphans and drift share one cursor: 0..orphans.length-1 walks the orphan
  // list, orphans.length..end walks the drift list — so up/down actually
  // reaches every row, not just orphans.
  const halfBudget = Math.max(1, Math.floor((height - 6) / 2));
  const { slice: orphanSlice, offset: orphanOffset } = windowed(orphans, Math.min(cursor, orphans.length - 1), halfBudget);
  const driftCursor = Math.max(0, cursor - orphans.length);
  const { slice: driftSlice, offset: driftOffset } = windowed(drift, driftCursor, halfBudget);

  return (
    <box flexDirection="column">
      {/* Orphans Table Header */}
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={ACCENT}>
          <b>Orphan Skills ({orphans.length}) — in store but installed in 0 agents</b>
        </text>
        {orphans.length > 0 && <text fg={DIM}>space: mark · A: all · d: purge</text>}
      </box>

      {orphans.length === 0 ? (
        <box height={1}>
          <text fg="#10B981">
            ✨ Clean — every skill in the central store is installed in at least one agent!
          </text>
        </box>
      ) : (
        orphanSlice.map((s, vi) => {
          const idx = orphanOffset + vi;
          const on = idx === cursor;
          const isMarked = marked.has(s);

          if (on) {
            return (
              <box
                key={s}
                backgroundColor={ACCENT_BG}
                flexDirection="row"
                height={1}
              >
                <text fg="#FFFFFF">
                  <span>❯ </span>
                  <span>{isMarked ? "● " : "○ "}</span>
                  <span>{fit(s, 28)} </span>
                  <span style={{ fg: "#FDE047" }}>orphan (0 installs) </span>
                  <span style={{ fg: "#E2E8F0" }}>~/.agents/skills/{s}</span>
                </text>
              </box>
            );
          }

          return (
            <box key={s} flexDirection="row" height={1}>
              <text fg={PRIMARY}>
                <span style={{ fg: DIM }}>  </span>
                <span style={{ fg: isMarked ? ACCENT : DIM }}>{isMarked ? "● " : "○ "}</span>
                <span>{fit(s, 28)} </span>
                <span style={{ fg: DIM }}>orphan (0 installs) </span>
                <span style={{ fg: DIM }}>~/.agents/skills/{s}</span>
              </text>
            </box>
          );
        })
      )}

      {/* Drift Table Header */}
      <box flexDirection="row" justifyContent="space-between" marginTop={1} marginBottom={1}>
        <text fg={CYAN}>
          <b>Directory Drift ({drift.length}) — unmanaged copies or external links</b>
        </text>
        {drift.length > 0 && (
          <text fg={DIM}>space: mark · I: fix selected · X: remove selected · f: auto-fix all</text>
        )}
      </box>

      {drift.length === 0 ? (
        <box height={1}>
          <text fg="#10B981">✨ Clean — all installed agent skills are synced symlinks to store!</text>
        </box>
      ) : (
        driftSlice.map((d, vi) => {
          const idx = orphans.length + driftOffset + vi;
          const on = idx === cursor;
          const isMarked = marked.has(driftKey(d));
          const hint =
            d.state === "ext"
              ? "external symlink"
              : d.state === "broken"
                ? "dangling symlink"
                : "real copy";

          return (
            <box
              key={`${d.agent}/${d.skill}`}
              flexDirection="row"
              height={1}
              backgroundColor={on ? ACCENT_BG : undefined}
            >
              <text fg={on ? "#FFFFFF" : (isMarked ? ACCENT : DIM)}>
                {on ? "❯ " : "  "}{isMarked ? "● " : "○ "}
              </text>
              <text fg={on ? "#FFFFFF" : STATE_COLOR[d.state]}>
                {d.state.toUpperCase().padStart(5)}{"  "}
              </text>
              <text fg={on ? "#FFFFFF" : getAgentColor(d.agent)}>
                {fit(d.agent, 12)}{"  "}
              </text>
              <text fg={on ? "#FFFFFF" : PRIMARY}>
                {fit(d.skill, 24)}{"  "}
              </text>
              <text fg={on ? "#E2E8F0" : DIM} wrapMode="none">
                ({hint})
              </text>
            </box>
          );
        })
      )}
    </box>
  );
}
