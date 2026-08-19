// armory ui — OpenTUI React Terminal User Interface
import React from "react";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import * as core from "./core.ts";
import { App } from "./ui/App.tsx";
import type { Snap } from "./ui/types.ts";

export async function run(): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });
  const root = createRoot(renderer);
  root.render(<App />);
}

export function snapshot(m: core.Manifest): Snap {
  return core.fastSnapshot(m);
}

// Re-export all screens and components
export { App } from "./ui/App.tsx";
export { Header } from "./ui/components/Header.tsx";
export { Footer } from "./ui/components/Footer.tsx";
export { Inspector } from "./ui/components/Inspector.tsx";
export { AgentBadgeList, AgentStatusGlyph } from "./ui/components/AgentBadge.tsx";
export { SearchBar } from "./ui/components/SearchBar.tsx";
export { ConfirmModal } from "./ui/components/ConfirmModal.tsx";

export { SkillsScreen } from "./ui/screens/SkillsScreen.tsx";
export { DetailScreen } from "./ui/screens/DetailScreen.tsx";
export { AgentsScreen } from "./ui/screens/AgentsScreen.tsx";
export { DiscoverScreen } from "./ui/screens/DiscoverScreen.tsx";
export { SettingsScreen } from "./ui/screens/SettingsScreen.tsx";
export { CleanupScreen } from "./ui/screens/CleanupScreen.tsx";
export { HelpScreen } from "./ui/screens/HelpScreen.tsx";

export * from "./ui/theme.ts";
export * from "./ui/types.ts";
