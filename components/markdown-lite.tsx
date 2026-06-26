import { Fragment } from "react";

/**
 * Minimal, safe Markdown renderer for AI chat replies. Supports headings,
 * bold, inline code, fenced code blocks, and bullet lists. No raw HTML is
 * ever rendered, so it is XSS-safe by construction.
 */
export function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split(/```/);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        // Odd indexes are fenced code blocks.
        if (i % 2 === 1) {
          const cleaned = block.replace(/^[a-zA-Z]*\n/, "");
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-xl bg-foreground/5 border border-border/50 p-3 text-xs font-mono custom-scrollbar"
            >
              <code>{cleaned.trimEnd()}</code>
            </pre>
          );
        }
        return <Fragment key={i}>{renderProse(block)}</Fragment>;
      })}
    </div>
  );
}

function renderProse(text: string) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = (key: string) => {
    if (list.length === 0) return;
    out.push(
      <ul key={key} className="list-disc pl-5 space-y-1">
        {list.map((item, idx) => (
          <li key={idx}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    list = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`ul-${idx}`);
      return;
    }
    const bullet = /^[-*]\s+(.*)/.exec(trimmed);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList(`ul-${idx}`);

    const heading = /^(#{1,3})\s+(.*)/.exec(trimmed);
    if (heading) {
      out.push(
        <p key={idx} className="font-bold text-foreground">
          {renderInline(heading[2])}
        </p>
      );
      return;
    }
    out.push(
      <p key={idx} className="text-foreground/90">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList("ul-end");
  return <>{out}</>;
}

/** Inline formatting: **bold** and `code`. */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-foreground/10 px-1.5 py-0.5 text-[0.85em] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
