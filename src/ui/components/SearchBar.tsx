import React from "react";
import { ACCENT, BG_CARD, BORDER, CYAN, DIM, EMBER, PRIMARY } from "../theme.ts";

export function SearchBar(props: {
  filter: string;
  filtering: boolean;
  matchCount?: number;
  totalCount?: number;
  placeholder?: string;
  bordered?: boolean;
}) {
  const { filter, filtering, matchCount, totalCount, placeholder = "Search (press / to filter)...", bordered = true } = props;

  const content = (
    <box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1} height={1} flexShrink={0}>
      <box flexDirection="row">
        <text fg={filtering ? ACCENT : DIM}>{"❯ "}</text>
        {filtering ? (
          <text fg={PRIMARY}>
            {filter}
            <span style={{ fg: EMBER }}>▌</span>
          </text>
        ) : filter ? (
          <text fg={CYAN}>{filter}</text>
        ) : (
          <text fg={DIM}>{placeholder}</text>
        )}
      </box>
      {matchCount !== undefined && totalCount !== undefined && (
        <box flexDirection="row">
          {filter ? (
            <text fg={CYAN}>
              {matchCount}/{totalCount} matching
            </text>
          ) : (
            <text fg={DIM}>{totalCount} total</text>
          )}
        </box>
      )}
    </box>
  );

  if (!bordered) {
    return (
      <box backgroundColor={BG_CARD} flexShrink={0}>
        {content}
      </box>
    );
  }

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      borderColor={filtering ? ACCENT : BORDER}
      flexShrink={0}
    >
      {content}
    </box>
  );
}
