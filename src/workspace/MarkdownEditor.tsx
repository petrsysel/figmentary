import { defaultValueCtx, Editor, rootCtx } from "@milkdown/core";
import { history } from "@milkdown/plugin-history";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { commonmark } from "@milkdown/preset-commonmark";
import { nord } from "@milkdown/theme-nord";
import { useEffect, useRef } from "react";

export function MarkdownEditor({ markdown, onChange }: { markdown: string; onChange: (value: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const changeRef = useRef(onChange);
  const initialMarkdown = useRef(markdown);
  useEffect(() => { changeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!root.current) return;
    const editor = Editor.make().config((ctx) => {
      ctx.set(rootCtx, root.current);
      ctx.set(defaultValueCtx, initialMarkdown.current);
      ctx.get(listenerCtx).markdownUpdated((_ctx, value) => changeRef.current(value));
      nord(ctx);
    }).use(commonmark).use(history).use(listener);
    void editor.create();
    return () => { void editor.destroy(); };
  // The parent holds the current Markdown for autosave. Recreating Milkdown
  // for each such update destroys the active selection and its undo history.
  // A different document has a different React key at the call site.
  }, []);
  return <div className="workspace-editor" ref={root} data-editor-live />;
}
