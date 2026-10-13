import { invoke } from "@tauri-apps/api/core";

export type StorySummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
};

export type StoryDocument = {
  id: string;
  documentType: "markdown" | "pdf" | "image";
  title: string;
  markdown: string | null;
  updatedAt: number;
};

export type StoryWorkspace = {
  story: StorySummary;
  documents: StoryDocument[];
  workspaceLayoutJson: string;
};

export const storyApi = {
  list: () => invoke<StorySummary[]>("list_stories"),
  create: (title: string) => invoke<StorySummary>("create_story", { title }),
  open: (id: string) => invoke<StorySummary>("open_story", { id }),
  import: () => invoke<StorySummary | null>("import_story"),
  export: (id: string) => invoke<boolean>("export_story", { id }),
  loadWorkspace: (id: string) => invoke<StoryWorkspace>("load_story_workspace", { id }),
  saveMarkdown: (id: string, documentId: string, markdown: string) => invoke<void>("save_markdown_document", { id, documentId, markdown }),
  createMarkdown: (id: string, title: string) => invoke<StoryDocument>("create_markdown_document", { id, title }),
  saveLayout: (id: string, workspaceLayoutJson: string) => invoke<void>("save_workspace_layout", { id, workspaceLayoutJson }),
};
