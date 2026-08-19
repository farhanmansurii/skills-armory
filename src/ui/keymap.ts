import type { TabKey } from "./types.ts";
import { ACCENT, CYAN, EMBER, MUTED } from "./theme.ts";

export type KeyHint = { key: string; label: string; color?: string };

// Single source of truth for the app's keybindings and their on-screen labels.
// The footer renders from this so keys and labels stay consistent.
export const KEYMAP = {
  filtering: [] as KeyHint[],
  skills: [
    { key: "Space", label: "Mark", color: ACCENT },
    { key: "A", label: "All", color: CYAN },
    { key: "⏎", label: "Inspect", color: CYAN },
    { key: "/", label: "Search", color: EMBER },
    { key: "r", label: "Reload", color: "#38BDF8" },
    { key: "q", label: "Quit", color: MUTED },
  ],
  agents: [
    { key: "Space", label: "Toggle Target", color: ACCENT },
    { key: "Tab", label: "Next Tab", color: CYAN },
    { key: "q", label: "Quit", color: MUTED },
  ],
  discover: [
    { key: "⏎ / Space", label: "Install", color: "#10B981" },
    { key: "O", label: "Open Source", color: EMBER },
    { key: "/", label: "Search", color: ACCENT },
    { key: "U", label: "Update All", color: "#38BDF8" },
    { key: "q", label: "Quit", color: MUTED },
  ],
  settings: [
    { key: "Space", label: "Toggle Preference", color: "#F59E0B" },
    { key: "Tab", label: "Next Tab", color: CYAN },
    { key: "q", label: "Quit", color: MUTED },
  ],
  cleanup: [
    { key: "Space", label: "Mark", color: ACCENT },
    { key: "A", label: "Select All", color: CYAN },
    { key: "I", label: "Fix Selected", color: "#10B981" },
    { key: "X", label: "Remove Selected", color: "#F59E0B" },
    { key: "d", label: "Purge Orphans", color: "#EF4444" },
    { key: "f", label: "Auto-fix All", color: "#10B981" },
    { key: "q", label: "Quit", color: MUTED },
  ],
  help: [
    { key: "1-6", label: "Switch Tab", color: CYAN },
    { key: "q", label: "Quit", color: MUTED },
  ],
  detail: [
    { key: "Space", label: "Toggle Agent", color: ACCENT },
    { key: "d", label: "Purge", color: "#EF4444" },
    { key: "Esc", label: "Back", color: MUTED },
  ],
  marked: [
    { key: "I", label: "Install", color: "#10B981" },
    { key: "X", label: "Uninstall", color: "#F59E0B" },
    { key: "u", label: "Clear", color: MUTED },
    { key: "d", label: "Purge", color: "#EF4444" },
  ],
} satisfies Record<string, KeyHint[]>;

export type KeymapContext = keyof typeof KEYMAP;

export const keysFor = (context: KeymapContext): KeyHint[] => KEYMAP[context];

export const TAB_KEYS: TabKey[] = ["skills", "agents", "discover", "settings", "cleanup", "help"];
