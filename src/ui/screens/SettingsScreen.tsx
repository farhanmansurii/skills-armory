import React from "react";
import * as core from "../../core.ts";
import { ACCENT, BORDER, CYAN, DIM, EMBER, PRIMARY } from "../theme.ts";

export function SettingsScreen(props: {
  cfg: core.Config;
  cursor: number;
}) {
  const { cfg, cursor } = props;

  const items = [
    {
      id: "install_mode",
      label: "Install Strategy",
      val: cfg.prefs.install_mode === "symlink" ? "Symlink (Recommended)" : "Copy (Real directory)",
      hint:
        cfg.prefs.install_mode === "symlink"
          ? "Symlink ~/.agents/skills/<name> into agent directories (0 disk waste, updates propagate live)"
          : "Copy directory files into agent directories (independent copies)",
      toggleHint: "Space toggles: Symlink ⟷ Copy",
    },
    {
      id: "auto_detect",
      label: "Harness Auto-Detection",
      val: cfg.prefs.auto_detect ? "Enabled (Auto-manage detected agents)" : "Disabled (Manual targets only)",
      hint: "Automatically probe PATH and ~/.config for Claude Code, Codex, Cursor, Crush, Devin, etc.",
      toggleHint: "Space toggles: Enabled ⟷ Disabled",
    },
    {
      id: "store_path",
      label: "Central Store Path",
      val: core.STORE,
      hint: "Git-versioned store where all master skill packages are located",
      toggleHint: "Managed in ~/.agents/skills",
    },
    {
      id: "config_path",
      label: "Config File",
      val: core.CONFIG,
      hint: "User settings and custom agent profile overrides",
      toggleHint: "Managed in ~/.agents/armory/config.toml",
    },
  ];

  return (
    <box flexDirection="column">
      <box height={1} flexShrink={0} marginBottom={1}>
        <text fg={ACCENT}>
          <b>Armory Configuration & Preferences</b>
        </text>
      </box>

      {items.map((it, i) => {
        const on = i === cursor;

        if (on) {
          return (
            <box
              key={it.id}
              flexDirection="column"
              borderStyle="rounded"
              borderColor={ACCENT}
              paddingLeft={1}
              paddingRight={1}
              marginBottom={1}
              flexShrink={0}
            >
              <box flexDirection="row" justifyContent="space-between" height={1} flexShrink={0}>
                <text fg="#FFFFFF">
                  <b>❯ {it.label}</b>
                </text>
                <text fg={CYAN}>
                  <b>{it.val}</b>
                </text>
              </box>
              <box height={1} flexShrink={0}>
                <text fg={PRIMARY}>{it.hint}</text>
              </box>
              <box height={1} flexShrink={0}>
                <text fg={EMBER}>
                  <b>{it.toggleHint}</b>
                </text>
              </box>
            </box>
          );
        }

        return (
          <box
            key={it.id}
            flexDirection="column"
            borderStyle="rounded"
            borderColor={BORDER}
            paddingLeft={1}
            paddingRight={1}
            marginBottom={1}
            flexShrink={0}
          >
            <box flexDirection="row" justifyContent="space-between" height={1} flexShrink={0}>
              <text fg={PRIMARY}>
                {"  "}{it.label}
              </text>
              <text fg={DIM}>{it.val}</text>
            </box>
            <box height={1} flexShrink={0}>
              <text fg={DIM}>{it.hint}</text>
            </box>
          </box>
        );
      })}

      <box height={1} flexShrink={0} marginTop={0}>
        <text fg={DIM}>
          Settings are saved instantly to ~/.agents/armory/config.toml
        </text>
      </box>
    </box>
  );
}
