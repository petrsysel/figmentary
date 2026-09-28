import { defaultValueCtx, Editor, rootCtx } from "@milkdown/core";
import { history } from "@milkdown/plugin-history";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { commonmark } from "@milkdown/preset-commonmark";
import { nord } from "@milkdown/theme-nord";
import { useEffect, useRef } from "react";

type MilkdownChunkEditorProps = {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  onEditorCreated: () => void;
};

export function MilkdownChunkEditor({ markdown, onMarkdownChange, onEditorCreated }: MilkdownChunkEditorProps) {
  const root = useRef<HTMLDivElement>(null);
  const onMarkdownChangeRef = useRef(onMarkdownChange);

  useEffect(() => {
    onMarkdownChangeRef.current = onMarkdownChange;
  }, [onMarkdownChange]);

  useEffect(() => {
    if (!root.current) return;

    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root.current);
        ctx.set(defaultValueCtx, markdown);
        ctx.get(listenerCtx).markdownUpdated((_ctx, nextMarkdown) => {
          onMarkdownChangeRef.current(nextMarkdown);
        });
        nord(ctx);
      })
      .use(commonmark)
      .use(history)
      .use(listener);

    let isCurrent = true;
    void editor.create().then(() => {
      if (isCurrent) onEditorCreated();
    });

    return () => {
      isCurrent = false;
      void editor.destroy();
    };
  }, [onEditorCreated]);

  return <div className="proof-editor" ref={root} />;
}
