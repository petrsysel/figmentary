export type Locale = "cs-CZ" | "en-US";

const translations = {
  "cs-CZ": {
    "proof.eyebrow": "FigmentFell · Technický proof 0",
    "proof.title": "Virtuální okno dlouhého Markdownu",
    "proof.description": "Izolovaný experiment s blokově členěným syntetickým žurnálem. Nejde o produktový editor ani o finální architekturu.",
    "proof.runtime": "Nativní bridge",
    "proof.runtime.pending": "Ověřuji…",
    "proof.runtime.ready": "Ověřeno: {os} / {architecture}",
    "proof.journal": "Syntetický žurnál",
    "proof.chunks": "chunků",
    "proof.blocks": "bloků",
    "proof.window": "Připojené okno",
    "proof.previous": "Načíst starší okno",
    "proof.next": "Načíst novější okno",
    "proof.editor": "Milkdown / ProseMirror – aktivní chunk",
    "proof.search": "Hledat v celém žurnálu",
    "proof.search.placeholder": "Např. záznam 480",
    "proof.search.summary": "{matches} shod v {chunks} chuncech",
    "proof.notice": "Hledání prochází i nenahrané chunky a výsledek otevře cílové okno. Pohyb mezi chunky ale v tomto proofu záměrně ukazuje hranici editoru: každé okno je samostatná instance. Phase 0 musí ověřit, zda lze tyto hranice před uživatelem skrýt bez ztráty selekce, IME a historie undo/redo.",
  },
  "en-US": {
    "proof.eyebrow": "FigmentFell · Technical proof 0",
    "proof.title": "Long Markdown virtual window",
    "proof.description": "An isolated experiment with a block-aware synthetic journal. This is neither product UI nor a final editor architecture.",
    "proof.runtime": "Native bridge",
    "proof.runtime.pending": "Checking…",
    "proof.runtime.ready": "Verified: {os} / {architecture}",
    "proof.journal": "Synthetic journal",
    "proof.chunks": "chunks",
    "proof.blocks": "blocks",
    "proof.window": "Mounted window",
    "proof.previous": "Load earlier window",
    "proof.next": "Load later window",
    "proof.editor": "Milkdown / ProseMirror – active chunk",
    "proof.search": "Search the whole journal",
    "proof.search.placeholder": "For example, entry 480",
    "proof.search.summary": "{matches} matches in {chunks} chunks",
    "proof.notice": "Search covers unmounted chunks and a result opens the target window. Moving between chunks intentionally still exposes an editor boundary in this proof: each window is a distinct instance. Phase 0 must determine whether those boundaries can be hidden without losing selection, IME, and undo/redo history.",
  },
} as const;

type TranslationKey = keyof (typeof translations)["cs-CZ"];

export function t(locale: Locale, key: TranslationKey, values: Record<string, string | number> = {}) {
  return translations[locale][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
}
