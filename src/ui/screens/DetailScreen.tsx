import React from "react";
import * as core from "../../core.ts";
import type { Snap } from "../types.ts";
import {
  ACCENT, ACCENT_BG, BORDER, CYAN, DIM, fit, getAgentColor, PRIMARY, STATE_COLOR, STATE_LABEL, windowed
} from "../theme.ts";

export function DetailScreen(props: {
  snap: Snap;
  install: Record<string, string[]>;
  skill: string;
  cursor: number;
  width: number;
  height?: number;
}) {
  const { snap, install, skill, cursor } = props;
  const agents = [...snap.agents].sort();
  const desc = core.skillDescription(skill);

  const rowsBudget = Math.max(2, (props.height ?? 18) - 7);
  const { slice, offset } = windowed(agents, cursor, rowsBudget);

  return (
    <box flexDirection="column">
      {/* Skill Card Header */}
      <box
        flexDirection="column"
        borderStyle="rounded"
        borderColor={ACCENT}
        paddingLeft={1}
        paddingRight={1}
        marginBottom={1}
        flexShrink={0}
      >
        <box flexDirection="row" justifyContent="space-between" height={1} flexShrink={0}>
          <text fg={PRIMARY}>
            <b>Skill: {skill}</b>
          </text>
          <text fg={ACCENT}>Per-Agent Installation</text>
        </box>
        {desc && (
          <box height={1} flexShrink={0}>
            <text fg={PRIMARY} wrapMode="none">
              {desc}
            </text>
          </box>
        )}
        <box height={1} flexShrink={0}>
          <text fg={DIM}>Store Path: {core.STORE}/{skill}</text>
        </box>
      </box>

      {/* Table Header */}
      <box flexDirection="row" height={1} flexShrink={0} marginBottom={1}>
        <text fg={DIM}>
          {"   "}
          {fit("AGENT", 16)} {fit("TARGET STATE", 14)} DISK REALITY
        </text>
      </box>

      {/* Agent Rows */}
      {slice.map((agent, vi) => {
        const idx = offset + vi;
        const st = snap.fsMap.get(`${agent}/${skill}`) ?? "missing";
        const isWanted = install[agent]?.includes(skill) ?? false;
        const on = idx === cursor;

        if (on) {
          return (
            <box
              key={agent}
              backgroundColor={ACCENT_BG}
              flexDirection="row"
              height={1}
              flexShrink={0}
            >
              <text fg="#FFFFFF">
                <span>❯ </span>
                <span>{isWanted ? "● " : "○ "}</span>
                <span style={{ fg: getAgentColor(agent) }}>{fit(agent, 16)} </span>
                <span>{fit(isWanted ? "installed" : "absent", 14)} </span>
                <span>{STATE_LABEL[st]} ({st === "link" ? "symlinked" : st})</span>
              </text>
            </box>
          );
        }

        return (
          <box key={agent} flexDirection="row" height={1} flexShrink={0}>
            <text fg={PRIMARY}>
              <span style={{ fg: DIM }}>  </span>
              <span style={{ fg: isWanted ? ACCENT : DIM }}>{isWanted ? "● " : "○ "}</span>
              <span style={{ fg: getAgentColor(agent) }}>{fit(agent, 16)} </span>
              <span style={{ fg: isWanted ? ACCENT : DIM }}>{fit(isWanted ? "installed" : "absent", 14)} </span>
              <span style={{ fg: STATE_COLOR[st] }}>{STATE_LABEL[st]}</span>
            </text>
          </box>
        );
      })}

      <box marginTop={1} height={1} flexShrink={0}>
        <text fg={DIM}>
          Space: toggle this agent · d: purge · Esc: back
        </text>
      </box>
    </box>
  );
}
