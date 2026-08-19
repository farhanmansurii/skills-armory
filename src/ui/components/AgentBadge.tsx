import React from "react";
import type { Snap } from "../types.ts";
import { DIM, MUTED, PRIMARY, STATE_COLOR, STATE_GLYPH, getAgentColor } from "../theme.ts";

export function AgentStatusGlyph({ st }: { st: string }) {
  const color = STATE_COLOR[st as keyof typeof STATE_COLOR] ?? DIM;
  const glyph = STATE_GLYPH[st as keyof typeof STATE_GLYPH] ?? "○";
  return <text fg={color}>{glyph} </text>;
}

export function AgentBadgeList(props: {
  skill: string;
  snap: Snap;
  install: Record<string, string[]>;
  width: number;
  active?: boolean;
}) {
  const { skill, snap, install, width, active } = props;
  const installed = snap.agents.filter((a) => install[a]?.includes(skill) ?? false);

  if (installed.length === 0) {
    return <text fg={active ? "#CBD5E1" : DIM}>0 installed</text>;
  }

  // If column width is small (< 16 cols), show compact count + pips
  if (width < 18) {
    const pips = snap.agents
      .map((a) => (install[a]?.includes(skill) ? "●" : "○"))
      .slice(0, 5)
      .join("");
    return (
      <text fg={active ? PRIMARY : MUTED}>
        <span style={{ fg: active ? "#FDE047" : "#10B981" }}>{installed.length}</span>
        <span style={{ fg: active ? "#CBD5E1" : DIM }}>/{snap.agents.length} {pips}</span>
      </text>
    );
  }

  // Compute how many badges fit in the budget
  const badges = installed.map((a) => ({
    name: a,
    color: getAgentColor(a),
  }));

  let used = 0;
  const visible: typeof badges = [];
  let hidden = 0;

  for (const b of badges) {
    const badgeWidth = b.name.length + 2; // badge name + separator
    if (used + badgeWidth <= width - 6) {
      visible.push(b);
      used += badgeWidth;
    } else {
      hidden++;
    }
  }

  return (
    <text>
      {visible.map((b, i) => (
        <span key={b.name}>
          {i > 0 ? <span style={{ fg: active ? "#CBD5E1" : DIM }}>, </span> : null}
          <span style={{ fg: b.color }}>{b.name}</span>
        </span>
      ))}
      {hidden > 0 && (
        <span style={{ fg: active ? "#FFFFFF" : DIM }}> (+{hidden})</span>
      )}
    </text>
  );
}
