import React from "react";
import type { Snap, TabKey } from "../types.ts";
import type * as core from "../../core.ts";
import {
  ACCENT, ACCENT_BG, ASCII_LOGO_LINES, BG_CARD, BORDER, CYAN, DIM, EMBER,
  lerpColor, MUTED, PRIMARY, STEEL
} from "../theme.ts";

// Exact row count this component renders (kept in sync with the JSX below —
// deterministic, no forced/padded height, so it never leaves dead space).
export function headerHeight(big: boolean): number {
  return big ? 12 : 5;
}

export function Header(props: {
  snap: Snap;
  activeTab: TabKey;
  storeCount: number;
  installMode: core.InstallMode;
  width: number;
  big?: boolean;
}) {
  const { snap, activeTab, storeCount, installMode, width, big } = props;

  const tabs: { key: TabKey; num: string; label: string }[] = [
    { key: "skills", num: "1", label: "Skills" },
    { key: "agents", num: "2", label: "Agents" },
    { key: "discover", num: "3", label: "Discover" },
    { key: "settings", num: "4", label: "Settings" },
    { key: "cleanup", num: "5", label: "Cleanup" },
    { key: "help", num: "6", label: "Help" },
  ];

  const logoWidth = Math.max(...ASCII_LOGO_LINES.map((l) => l.length));

  return (
    <box flexDirection="column" flexShrink={0} height={headerHeight(!!big)} overflow="hidden">
      {/* Hero ASCII Logo (when terminal height >= 28 and width >= 64) */}
      {big ? (
        <box
          flexDirection="column"
          borderStyle="rounded"
          borderColor={BORDER}
          paddingLeft={1}
          paddingRight={1}
          marginBottom={1}
          flexShrink={0}
        >
          <box flexDirection="row" justifyContent="space-between" height={1} flexShrink={0}>
            <text fg={DIM}>
              <span style={{ fg: EMBER }}>///</span> ARMORY CENTRAL STORE
            </text>
            <text fg={ACCENT}>v2.0.0</text>
          </box>
          {ASCII_LOGO_LINES.map((line, idx) => {
            const gradColor = lerpColor(ACCENT, STEEL, idx / (ASCII_LOGO_LINES.length - 1));
            const pad = Math.max(0, Math.floor((logoWidth - line.length) / 2));
            return (
              <box key={idx} height={1} flexShrink={0}>
                <text fg={gradColor} wrapMode="none">
                  {" ".repeat(pad)}{line}
                </text>
              </box>
            );
          })}
        </box>
      ) : (
        <box flexDirection="row" justifyContent="space-between" height={1} flexShrink={0} marginBottom={0}>
          <box flexDirection="row">
            <text fg={EMBER}>////// </text>
            <text fg={PRIMARY}>Armory </text>
            <text fg={ACCENT}>v2.0.0 </text>
            <text fg={DIM}>— Central Agent Skill Hub</text>
          </box>
          <text fg={DIM}>[press 1-6 or Tab]</text>
        </box>
      )}

      {/* Navigation Tabs Bar */}
      <box flexDirection="row" gap={1} height={1} flexShrink={0} marginTop={big ? 0 : 1} marginBottom={1}>
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <box
              key={t.key}
              backgroundColor={isActive ? ACCENT_BG : BG_CARD}
              paddingLeft={1}
              paddingRight={1}
              height={1}
              flexShrink={0}
            >
              <text fg={isActive ? "#FFFFFF" : MUTED}>
                <span style={{ fg: isActive ? ACCENT : DIM }}>{isActive ? "●" : t.num}</span> {t.label}
              </text>
            </box>
          );
        })}
      </box>

      {/* Live System Stats Pill */}
      <box flexDirection="row" justifyContent="space-between" height={1} flexShrink={0}>
        <box flexDirection="row">
          <text fg={PRIMARY}>{snap.skills.length} skills </text>
          <text fg={DIM}>· {snap.agents.length} agents · {storeCount} in store </text>
          <text fg={CYAN}>· mode: {installMode}</text>
        </box>
      </box>
    </box>
  );
}
