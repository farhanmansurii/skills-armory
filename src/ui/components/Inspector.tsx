import React from "react";
import * as core from "../../core.ts";
import type { Snap } from "../types.ts";
import { ACCENT, BORDER, CYAN, DIM, fit, getAgentColor, PRIMARY } from "../theme.ts";
import { AgentStatusGlyph } from "./AgentBadge.tsx";

const BADGE_W = 13;

export function Inspector(props: {
  skill: string;
  snap: Snap;
  width: number;
  height: number;
}) {
  const { skill, snap, width, height } = props;

  const desc = core.skillDescription(skill) || "No description found in SKILL.md";
  // Fixed rows consumed by chrome: 2 border + (title+desc+path+legend) x (1 line + 1 margin) = 2 + 8 = 10
  const CHROME_ROWS = 10;
  const itemsPerRow = Math.max(1, Math.floor((width - 2) / BADGE_W));
  const availableRows = Math.max(1, height - CHROME_ROWS);
  const capacity = availableRows * itemsPerRow;
  const needsMore = snap.agents.length > capacity;
  const agentBudget = needsMore ? Math.max(1, capacity - 1) : capacity;

  return (
    <box
      flexDirection="column"
      width={width}
      maxHeight={height}
      overflow="hidden"
      borderStyle="rounded"
      borderColor={BORDER}
      paddingLeft={1}
      paddingRight={1}
      flexShrink={0}
    >
      {/* Title + Store Path */}
      <box flexDirection="row" justifyContent="space-between" height={1} flexShrink={0} marginBottom={1}>
        <text fg={ACCENT}>
          <b>{fit(skill, Math.max(4, width - 14))}</b>
        </text>
        <text fg={DIM}>[inspect]</text>
      </box>

      {/* Description */}
      <box height={1} flexShrink={0} marginBottom={1}>
        <text fg={PRIMARY} wrapMode="none">
          {fit(desc, width - 4)}
        </text>
      </box>

      <box height={1} flexShrink={0} marginBottom={1}>
        <text fg={DIM} wrapMode="none">
          {fit(`Path: ${core.STORE}/${skill}`, width - 4)}
        </text>
      </box>

      {/* Agent Presence Legend */}
      <box flexDirection="row" height={1} flexShrink={0} marginBottom={1}>
        <text fg={CYAN}>Agents </text>
        <text fg={DIM}>
          <span style={{ fg: "#10B981" }}>●</span> linked  <span style={{ fg: "#F59E0B" }}>▲</span> drift  <span style={{ fg: DIM }}>○</span> absent
        </text>
      </box>

      {/* Agent Presence Grid — compact badges instead of one row per agent */}
      <box flexDirection="row" flexWrap="wrap" flexShrink={0} overflow="hidden">
        {snap.agents.slice(0, agentBudget).map((agent) => {
          const st = snap.fsMap.get(`${agent}/${skill}`) ?? "missing";

          return (
            <box key={agent} flexDirection="row" width={BADGE_W} height={1} flexShrink={0}>
              <AgentStatusGlyph st={st} />
              <text fg={getAgentColor(agent)}>{fit(agent, BADGE_W - 3)}</text>
            </box>
          );
        })}
        {needsMore && (
          <box width={BADGE_W} height={1} flexShrink={0}>
            <text fg={DIM}>+{snap.agents.length - agentBudget} more</text>
          </box>
        )}
      </box>
    </box>
  );
}
