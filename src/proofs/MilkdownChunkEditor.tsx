import { defaultValueCtx, Editor, rootCtx } from "@milkdown/core";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { commonmark } from "@milkdown/preset-commonmark";
import { nord } from "@milkdown/theme-nord";
import { useEffect, useRef } from "react";

type MilkdownChunkEditorProps = {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
};

export function MilkdownChunkEditor({ markdown, onMarkdownChange }: MilkdownChunkEditorProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;

    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root.current);
        ctx.set(defaultValueCtx, markdown);
        ctx.get(listenerCtx).markdownUpdated((_ctx, nextMarkdown) => {
          onMarkdownChange(nextMarkdown);
        });
        nord(ctx);
      })
      .use(commonmark)
      .use(listener);

    void editor.create();

    return () => {
      void editor.destroy();
    };
  }, [markdown]);

  return <div className="proof-editor" ref={root} />;
}
