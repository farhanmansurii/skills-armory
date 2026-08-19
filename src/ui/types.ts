import type * as core from "../core.ts";

export type TabKey = "skills" | "agents" | "discover" | "settings" | "cleanup" | "help";

export type Snap = ReturnType<typeof core.fastSnapshot>;

export type AgentRow = {
  name: string;
  skills: string;
  detected: boolean;
  managed: boolean;
  discovered: boolean;
  count?: number;
};

export type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  run: () => void;
};
