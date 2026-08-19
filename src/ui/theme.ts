import type * as core from "../core.ts";

// ---------------------------------------------------------------- Design Tokens
// "Indigo Night" — one calm accent family instead of bronze/ember/cyan competing for attention.
export const ACCENT = "#818CF8"; // indigo — focus, active tabs, primary actions
export const ACCENT_BRIGHT = "#A5B4FC"; // bright indigo — emphasis text
export const ACCENT_BG = "#2E3272"; // solid indigo bar background (active tab, modal title)
export const EMBER = "#F59E0B"; // amber — pending markers, warnings
export const STEEL = "#2DD4BF"; // teal — secondary accent, gradients
export const CYAN = "#2DD4BF"; // alias kept for existing call sites
export const PRIMARY = "#E5E7EB"; // soft off-white text
export const MUTED = "#8B94A8"; // secondary text
export const DIM = "#5B6478"; // muted slate gray
export const BORDER = "#242C40"; // subtle dark border
export const BORDER_FOCUS = "#818CF8"; // focused border
export const BG_DARK = "#0A0E17"; // app background
export const BG_CARD = "#111827"; // panel / bar background
export const BG_PANEL = "#0D1320"; // recessed panel background (list/inspector wells)
export const BG_SELECT = "#1E2748"; // tinted background for a selected list row

export const STATE_COLOR: Record<core.EntryState, string> = {
  link: "#10B981", // emerald green — linked to central store
  dir: "#F59E0B", // amber yellow — real copy / drift
  ext: "#38BDF8", // sky blue — external link
  broken: "#EF4444", // rose red — broken link
  missing: "#475569", // dark slate — not installed
};

export const STATE_LABEL: Record<core.EntryState, string> = {
  link: "linked",
  dir: "drift (copy)",
  ext: "external",
  broken: "broken",
  missing: "absent",
};

export const STATE_GLYPH: Record<core.EntryState, string> = {
  link: "●",
  dir: "▲",
  ext: "◆",
  broken: "✕",
  missing: "○",
};

// ---------------------------------------------------------------- Agent Brand Colors
export const AGENT_COLORS: Record<string, string> = {
  claude: "#FB923C", // Anthropic warm terracotta
  opencode: "#38BDF8", // Sky electric blue
  gemini: "#60A5FA", // Google radiant blue
  codex: "#34D399", // OpenAI mint emerald
  amp: "#FBBF24", // Warm amber gold
  cursor: "#C084FC", // Cursor lilac violet
  antigravity: "#F472B6", // DeepMind magenta pink
  "antigravity-cli": "#F472B6",
  agents: "#2DD4BF", // Central agents teal
  pi: "#E879F9", // Fuchsia
  bob: "#A3E635", // Lime
  copilot: "#818CF8", // GitHub indigo
  qwen: "#22D3EE", // Electric cyan
  roo: "#F87171", // Coral red
  kilocode: "#FB7185", // Rose
  crush: "#E11D48", // Crimson red
  grok: "#94A3B8", // Slate
  "command-code": "#A78BFA", // Violet
  devin: "#F59E0B", // Gold
  deepagents: "#4ADE80", // Spring green
};

const AGENT_PALETTE = [
  "#FB923C", "#38BDF8", "#60A5FA", "#34D399", "#FBBF24",
  "#C084FC", "#F472B6", "#2DD4BF", "#E879F9", "#A3E635",
  "#818CF8", "#22D3EE", "#FB7185", "#4ADE80",
];

export function getAgentColor(agent: string): string {
  const norm = agent.toLowerCase().trim();
  if (AGENT_COLORS[norm]) return AGENT_COLORS[norm]!;
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  return AGENT_PALETTE[Math.abs(hash) % AGENT_PALETTE.length]!;
}

// ---------------------------------------------------------------- String / Layout Helpers
export const fit = (s: string, w: number): string =>
  s.length > w ? s.slice(0, Math.max(1, w - 1)) + "…" : s.padEnd(w);

export function windowed<T>(list: T[], cursor: number, height: number): { slice: T[]; offset: number } {
  const h = Math.max(1, height);
  const offset = Math.min(Math.max(cursor - Math.floor(h / 2), 0), Math.max(0, list.length - h));
  return { slice: list.slice(offset, offset + h), offset };
}

export function formatInstalls(n?: number): string {
  if (!n) return "";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

// Color interpolation for gradient text
const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
export function lerpColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const [r, g, bl] = pa.map((v, i) => v + (pb[i]! - v) * t);
  return `#${hex(r!)}${hex(g!)}${hex(bl!)}`;
}

// ---------------------------------------------------------------- ASCII Art Logo
export const ASCII_LOGO_LINES = [
  "    _    ____  __  __  ___  ______   __",
  "   / \\  |  _ \\|  \\/  |/ _ \\|  _ \\ \\ / /",
  "  / _ \\ | |_) | |\\/| | | | | |_) \\ V /",
  " / ___ \\|  _ <| |  | | |_| |  _ < | |",
  "/_/   \\_\\_| \\_\\_|  |_|\\___/|_| \\_\\|_|",
];

export const ASCII_LOGO_MIN_WIDTH = 64;
export const ASCII_LOGO_MIN_ROWS = 28;
