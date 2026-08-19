import React from "react";
import { BG_CARD, BORDER, DIM, EMBER, PRIMARY } from "../theme.ts";

export function ConfirmModal(props: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  width: number;
}) {
  const {
    title,
    message,
    confirmLabel = "Press 'y' to Confirm",
    cancelLabel = "Press 'Esc' or 'n' to Cancel",
    width,
  } = props;

  const modalWidth = Math.min(Math.max(48, Math.floor(width * 0.7)), 80);

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      borderColor="#EF4444"
      backgroundColor={BG_CARD}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      width={modalWidth}
      alignSelf="center"
    >
      <box flexDirection="row" marginBottom={1}>
        <text fg="#EF4444">
          <b>⚠️ {title}</b>
        </text>
      </box>

      <box marginBottom={1}>
        <text fg={PRIMARY} wrapMode="word">
          {message}
        </text>
      </box>

      <box height={1}>
        <text fg={BORDER}>{"─".repeat(modalWidth - 6)}</text>
      </box>

      <box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <text fg="#10B981">
          <b>{confirmLabel}</b>
        </text>
        <text fg={DIM}>{cancelLabel}</text>
      </box>
    </box>
  );
}
