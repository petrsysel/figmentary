import { type GlobalSettings } from "./settings";

export type CommandId = "file.save" | "edit.undo" | "edit.redo" | "search.find" | "command.palette";

export type CommandDefinition = { id: CommandId; labelKey: string; defaultShortcut: string };

export const commandRegistry: readonly CommandDefinition[] = [
  { id: "file.save", labelKey: "command.save", defaultShortcut: "Ctrl+S" },
  { id: "edit.undo", labelKey: "command.undo", defaultShortcut: "Ctrl+Z" },
  { id: "edit.redo", labelKey: "command.redo", defaultShortcut: "Ctrl+Y" },
  { id: "search.find", labelKey: "command.find", defaultShortcut: "Ctrl+F" },
  { id: "command.palette", labelKey: "command.palette", defaultShortcut: "Ctrl+Shift+P" },
];

export function shortcutFor(command: CommandDefinition, settings: GlobalSettings) {
  return settings.shortcutOverrides[command.id] ?? command.defaultShortcut;
}
