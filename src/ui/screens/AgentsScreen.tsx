import React from "react";
import type { AgentRow } from "../types.ts";
import { ACCENT, ACCENT_BG, CYAN, DIM, fit, getAgentColor, PRIMARY, windowed } from "../theme.ts";

export function AgentsScreen(props: { rows: AgentRow[]; cursor: number; height?: number }) {
  const rowsBudget = Math.max(2, (props.height ?? 16) - 4);
  const { slice, offset } = windowed(props.rows, props.cursor, rowsBudget);

  return (
    <box flexDirection="column">
      {/* Table Header */}
      <box flexDirection="row" marginBottom={1}>
        <text fg={DIM}>
          {"   "}
          {fit("AGENT", 16)} {fit("STATUS", 14)} {fit("INSTALLED", 12)} SKILLS DIRECTORY
        </text>
      </box>

      {/* Table Rows */}
      {slice.map((r, vi) => {
        const idx = offset + vi;
        const on = idx === props.cursor;
        const status = r.managed
          ? { label: "MANAGED", color: ACCENT }
          : r.discovered
            ? { label: "DISCOVERED", color: "#F59E0B" }
            : r.detected
              ? { label: "DETECTED", color: "#10B981" }
              : { label: "INACTIVE", color: DIM };

        const cnt = `${r.count ?? 0} skills`;

        if (on) {
          return (
            <box
              key={r.name}
              backgroundColor={ACCENT_BG}
              flexDirection="row"
              height={1}
            >
              <text fg="#FFFFFF">
                <span>❯ </span>
                <span>{r.managed ? "● " : "○ "}</span>
                <span style={{ fg: getAgentColor(r.name) }}>{fit(r.name, 16)} </span>
                <span>{fit(status.label, 14)} </span>
                <span style={{ fg: "#FDE047" }}>{fit(cnt, 12)} </span>
                <span>{r.skills}</span>
              </text>
            </box>
          );
        }

        return (
          <box key={r.name} flexDirection="row" height={1}>
            <text fg={PRIMARY}>
              <span style={{ fg: DIM }}>  </span>
              <span style={{ fg: r.managed ? ACCENT : DIM }}>{r.managed ? "● " : "○ "}</span>
              <span style={{ fg: getAgentColor(r.name) }}>{fit(r.name, 16)} </span>
              <span style={{ fg: status.color }}>{fit(status.label, 14)} </span>
              <span style={{ fg: CYAN }}>{fit(cnt, 12)} </span>
              <span style={{ fg: DIM }}>{r.skills}</span>
            </text>
          </box>
        );
      })}

      <box marginTop={1}>
        <text fg={DIM}>
          Space toggles management status · files on disk are never deleted or modified without confirmation.
        </text>
      </box>
    </box>
  );
}
