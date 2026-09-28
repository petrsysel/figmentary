import { defaultValueCtx, Editor, editorViewCtx, rootCtx } from "@milkdown/core";
import { history } from "@milkdown/plugin-history";
import { commonmark } from "@milkdown/preset-commonmark";
import { nord } from "@milkdown/theme-nord";
import { TextSelection } from "@milkdown/prose/state";
import type { EditorView } from "@milkdown/prose/view";
import { useEffect, useRef } from "react";

export type PerformanceEditorMetrics = {
  readyMilliseconds: number;
  domElementCount: number;
  heapBytes?: number;
};

export type PerformanceEditorControls = {
  jump: (target: "start" | "middle" | "end") => void;
  selectLargeRange: () => void;
};

type PerformanceMilkdownEditorProps = {
  markdown: string;
  onReady: (metrics: PerformanceEditorMetrics, controls: PerformanceEditorControls) => void;
  onInputLatency: (milliseconds: number) => void;
  onScrollLatency: (milliseconds: number) => void;
};

export function PerformanceMilkdownEditor({ markdown, onReady, onInputLatency, onScrollLatency }: PerformanceMilkdownEditorProps) {
  const root = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onInputLatencyRef = useRef(onInputLatency);
  const onScrollLatencyRef = useRef(onScrollLatency);

  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onInputLatencyRef.current = onInputLatency; }, [onInputLatency]);
  useEffect(() => { onScrollLatencyRef.current = onScrollLatency; }, [onScrollLatency]);

  useEffect(() => {
    if (!root.current) return;
    const startedAt = performance.now();
    let isCurrent = true;
    let beforeInputAt = 0;
    let scrollFramePending = false;
    let view: EditorView | undefined;
    let removeListeners: (() => void) | undefined;

    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root.current);
        ctx.set(defaultValueCtx, markdown);
        nord(ctx);
      })
      .use(commonmark)
      .use(history);

    void editor.create().then(() => {
      if (!isCurrent) return;
      view = editor.action((ctx) => ctx.get(editorViewCtx));
      const editorDom = view.dom;
      const onBeforeInput = () => { beforeInputAt = performance.now(); };
      const onInput = () => {
        if (beforeInputAt) onInputLatencyRef.current(performance.now() - beforeInputAt);
      };
      const onScroll = () => {
        if (scrollFramePending) return;
        const started = performance.now();
        scrollFramePending = true;
        requestAnimationFrame(() => {
          scrollFramePending = false;
          onScrollLatencyRef.current(performance.now() - started);
        });
      };
      editorDom.addEventListener("beforeinput", onBeforeInput);
      editorDom.addEventListener("input", onInput);
      root.current?.addEventListener("scroll", onScroll);
      removeListeners = () => {
        editorDom.removeEventListener("beforeinput", onBeforeInput);
        editorDom.removeEventListener("input", onInput);
        root.current?.removeEventListener("scroll", onScroll);
      };

      const controls: PerformanceEditorControls = {
        jump(target) {
          if (!view) return;
          const size = view.state.doc.content.size;
          const position = target === "start" ? 1 : target === "middle" ? Math.floor(size / 2) : Math.max(1, size - 1);
          view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(position))).scrollIntoView());
          view.focus();
        },
        selectLargeRange() {
          if (!view) return;
          const size = view.state.doc.content.size;
          const from = Math.max(1, Math.floor(size * 0.2));
          const to = Math.max(from + 1, Math.floor(size * 0.8));
          view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)).scrollIntoView());
          view.focus();
        },
      };
      const heapBytes = "memory" in performance
        ? (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize
        : undefined;
      requestAnimationFrame(() => {
        if (!isCurrent) return;
        onReadyRef.current({
          readyMilliseconds: performance.now() - startedAt,
          domElementCount: editorDom.querySelectorAll("*").length,
          heapBytes,
        }, controls);
      });
    });

    return () => {
      isCurrent = false;
      removeListeners?.();
      void editor.destroy();
    };
  }, [markdown]);

  return <div className="performance-editor" ref={root} />;
}
