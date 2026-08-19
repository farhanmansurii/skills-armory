import React from "react";
import { ACCENT, BORDER, CYAN, DIM, EMBER, PRIMARY } from "../theme.ts";

export function HelpScreen() {
  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      borderColor={BORDER}
      paddingLeft={2}
      paddingRight={2}
      flexShrink={0}
    >
      <box height={1} flexShrink={0} marginBottom={1}>
        <text fg={ACCENT}>
          <b>Armory Cheatsheet & Keyboard Navigation</b>
        </text>
      </box>

      <box height={1} flexShrink={0}>
        <text fg={CYAN}>
          <b>General Controls:</b>
        </text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  1-6 / Tab   Switch between Skills, Agents, Discover, Settings, Cleanup, Help</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  ↑↓ / jk     Navigate through items smoothly</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  /           Focus search filter (type query, press Esc or Enter to exit)</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  U           Update skills from upstream git repositories & skills.sh</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  q           Quit armory</text>
      </box>

      <box height={1} flexShrink={0} marginTop={1}>
        <text fg={EMBER}>
          <b>Skills View Controls:</b>
        </text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  Space       Mark / select a skill (multi-select)</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  A / u       Select all / clear the selection</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  I           Install marked skills into all agents (immediate)</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  X           Uninstall marked skills from all agents (immediate)</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  Enter       Open the per-agent detail editor</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  Space (in detail)  Toggle install for the focused agent (immediate)</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  d           Purge focused/marked skills from store + agents (safe confirm)</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  m           Migrate real directories to store & sync</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  r           Re-scan the store, manifest and agent dirs</text>
      </box>

      <box height={1} flexShrink={0} marginTop={1}>
        <text fg={EMBER}>
          <b>Discover View Controls:</b>
        </text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  /           Search skills.sh, or paste any GitHub owner/repo</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  ⏎ / Space   Install a search result into all agents (immediate)</text>
      </box>

      <box height={1} flexShrink={0} marginTop={1}>
        <text fg={EMBER}>
          <b>Cleanup View Controls:</b>
        </text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  Space / A   Mark orphans (or select all)</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  f           Auto-fix drift — convert real copies to store symlinks & sync</text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={PRIMARY}>  d           Purge marked orphans from store (safe confirm)</text>
      </box>

      <box height={1} flexShrink={0} marginTop={1}>
        <text fg="#10B981">
          <b>Central Store Concept:</b>
        </text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={DIM}>
          All skills live centrally in ~/.agents/skills (a git repo). Restore via:
        </text>
      </box>
      <box height={1} flexShrink={0}>
        <text fg={CYAN}>  git -C ~/.agents/skills checkout -- &lt;skill-name&gt;</text>
      </box>
    </box>
  );
}
