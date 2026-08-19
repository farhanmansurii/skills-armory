import React from "react";
import type { TabKey } from "../types.ts";
import { BG_CARD, BORDER, CYAN, DIM, fit, PRIMARY } from "../theme.ts";
import { keysFor, type KeyHint, type KeymapContext } from "../keymap.ts";

function KeyHint(props: { keyName: string; label: string; color?: string }) {
  const { keyName, label, color = CYAN } = props;
  return (
    <box flexDirection="row">
      <text fg={color}>
        <span style={{ fg: PRIMARY, bg: BG_CARD }}> {keyName} </span>
        <span> {label}  </span>
      </text>
    </box>
  );
}

export function Footer(props: {
  activeTab: TabKey;
  markedCount: number;
  filtering: boolean;
  filterText: string;
  statusMessage: string;
  detailSkillName?: string | null;
  width: number;
}) {
  const { activeTab, markedCount, filtering, filterText, statusMessage, detailSkillName, width } = props;

  const renderHints = () => {
    if (filtering) {
      return (
        <box flexDirection="row">
          <text fg={CYAN}>
            Search: <span style={{ fg: PRIMARY }}>{filterText}</span>▌ (Enter: confirm · Esc: cancel)
          </text>
        </box>
      );
    }

    const context: KeymapContext = detailSkillName ? "detail" : markedCount > 0 ? "marked" : activeTab;

    const label = (h: KeyHint): string => {
      if (context === "marked") {
        if (h.key === "I") return `Install (${markedCount})`;
        if (h.key === "X") return `Uninstall (${markedCount})`;
      }
      return h.label;
    };

    return (
      <box flexDirection="row" gap={1}>
        {keysFor(context).map((h, i) => (
          <KeyHint key={i} keyName={h.key} label={label(h)} color={h.color} />
        ))}
      </box>
    );
  };

  const statusColor = statusMessage.startsWith("Error") || statusMessage.startsWith("⚠️")
    ? "#EF4444"
    : statusMessage.startsWith("✓") || statusMessage.startsWith("Applied")
      ? "#10B981"
      : DIM;

  return (
    <box flexDirection="column" flexShrink={0} height={3} marginTop={1} overflow="hidden">
      {/* Bottom Divider */}
      <box height={1} flexShrink={0}>
        <text fg={BORDER}>{"─".repeat(Math.max(10, width - 2))}</text>
      </box>

      {/* Action Bar + Status Message */}
      <box flexDirection="row" justifyContent="space-between" alignItems="center" height={1} flexShrink={0} overflow="hidden">
        {renderHints()}
        <text fg={statusColor}>{fit(statusMessage, Math.max(8, Math.floor(width * 0.28)))}</text>
      </box>
    </box>
  );
}
