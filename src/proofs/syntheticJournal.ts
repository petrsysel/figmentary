export type MarkdownChunk = {
  id: string;
  markdown: string;
  blockCount: number;
};

export type JournalSearchResult = {
  chunkId: string;
  chunkIndex: number;
  matches: number;
};

const paragraph = (index: number) =>
  `Záznam ${index} zachovává tok vyprávění, i když jeho zdroj zůstává uložený v samostatném interním chunku. Hranice chunku nesmí být součástí uživatelského zážitku.`;

/**
 * Phase 0 fixture: every unit is constructed from complete Markdown blocks.
 * It deliberately avoids splitting lists and fenced blocks, allowing the editor
 * experiment to focus on virtual-window behavior rather than unsafe slicing.
 */
export function buildSyntheticJournal(chunkTotal = 640): MarkdownChunk[] {
  return Array.from({ length: chunkTotal }, (_, index) => {
    const entry = index + 1;
    const fencedBlock = entry % 16 === 0 ? "\n```text\nA stable fenced block stays wholly inside one chunk.\n```\n" : "";
    const list = entry % 9 === 0 ? "\n- bezpečná položka seznamu\n- druhá položka seznamu\n" : "";
    const markdown = `## Zápis ${entry}\n\n${paragraph(entry)}\n\n${paragraph(entry + 1)}${list}${fencedBlock}`;

    return {
      id: `chunk-${entry.toString().padStart(4, "0")}`,
      markdown,
      blockCount: 3 + Number(Boolean(list)) + Number(Boolean(fencedBlock)),
    };
  });
}

/**
 * Phase 0 index stand-in. It deliberately searches every persisted chunk,
 * including chunks outside the mounted editor window.
 */
export function searchJournal(chunks: MarkdownChunk[], query: string): JournalSearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];

  return chunks.flatMap((chunk, chunkIndex) => {
    const matches = chunk.markdown.toLocaleLowerCase().split(normalizedQuery).length - 1;
    return matches > 0 ? [{ chunkId: chunk.id, chunkIndex, matches }] : [];
  });
}
