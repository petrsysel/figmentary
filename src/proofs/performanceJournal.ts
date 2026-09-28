export type GeneratedJournal = {
  markdown: string;
  wordCount: number;
  blockCount: number;
};

const vocabulary = [
  "poutník", "lesem", "ticho", "měsíční", "světlo", "zápis", "cesta", "věž", "bylina", "srdce",
  "strážce", "mlha", "mapa", "příběh", "hostinec", "zvuk", "řeka", "dar", "tajemství", "stezka",
];

function words(count: number, seed: number) {
  return Array.from({ length: count }, (_, index) => vocabulary[(seed + index * 7) % vocabulary.length]).join(" ");
}

/** Generates varied, valid Markdown blocks while keeping the requested word count exact. */
export function buildPerformanceJournal(targetWords: number): GeneratedJournal {
  const blocks: string[] = [];
  let usedWords = 0;
  let entry = 1;

  const append = (markdown: string, count: number) => {
    blocks.push(markdown);
    usedWords += count;
  };

  while (usedWords < targetWords) {
    const remaining = targetWords - usedWords;
    const paragraphWords = Math.min(86, Math.max(1, remaining));
    const headingLevel = entry % 23 === 0 ? "###" : entry % 7 === 0 ? "##" : "#";
    append(`${headingLevel} Zápis výpravy ${entry}`, 0);
    append(`${words(paragraphWords, entry)} *${words(Math.min(4, Math.max(0, remaining - paragraphWords)), entry + 3)}* **${words(Math.min(3, Math.max(0, remaining - paragraphWords - 4)), entry + 5)}**`, paragraphWords + Math.min(4, Math.max(0, remaining - paragraphWords)) + Math.min(3, Math.max(0, remaining - paragraphWords - 4)));

    if (entry % 5 === 0 && usedWords < targetWords) {
      const listWords = Math.min(18, targetWords - usedWords);
      const first = Math.ceil(listWords / 2);
      append(`- ${words(first, entry + 11)}\n- ${words(listWords - first, entry + 17)}`, listWords);
    }
    if (entry % 9 === 0 && usedWords < targetWords) {
      const quoteWords = Math.min(16, targetWords - usedWords);
      append(`> ${words(quoteWords, entry + 23)}`, quoteWords);
    }
    if (entry % 17 === 0) blocks.push(`![Nákres výpravy](ffdrawing://journal-${entry})`);
    entry += 1;
  }

  return { markdown: blocks.join("\n\n"), wordCount: usedWords, blockCount: blocks.length };
}
