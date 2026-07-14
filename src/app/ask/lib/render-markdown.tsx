import React from 'react';

/** Inline **bold** handling. */
export function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          return (
            <strong key={i} className="font-medium text-[var(--text-primary)]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}

/** Minimal markdown → React for the patterns Claude actually emits:
 *  bold, bullets, numbered lists, bold-only section headers, # headers. */
export function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Empty line → spacer
    if (line.trim() === '') {
      nodes.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Markdown # / ## / ### headers → section header
    const hashMatch = line.match(/^#{1,3}\s+(.*)/);
    if (hashMatch) {
      nodes.push(
        <p key={key++} className="font-medium text-[var(--text-primary)] mt-3 mb-1 first:mt-0">
          {renderInline(hashMatch[1].replace(/\*\*/g, ''))}
        </p>
      );
      continue;
    }

    // Bullet point: starts with - or •
    if (/^[-•]\s/.test(line)) {
      nodes.push(
        <div key={key++} className="flex items-start gap-2 my-0.5">
          <span className="text-[var(--text-secondary)] mt-0.5 flex-shrink-0">•</span>
          <span>{renderInline(line.replace(/^[-•]\s/, ''))}</span>
        </div>
      );
      continue;
    }

    // Numbered list: starts with 1. 2. etc
    const numMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      nodes.push(
        <div key={key++} className="flex items-start gap-2 my-0.5">
          <span className="text-[var(--text-secondary)] flex-shrink-0 text-xs mt-0.5 min-w-[16px]">
            {numMatch[1]}.
          </span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Section header: bold-only line
    if (/^\*\*[^*]+\*\*:?\s*$/.test(line.trim())) {
      const headerText = line.replace(/\*\*/g, '').replace(/:$/, '');
      nodes.push(
        <p key={key++} className="font-medium text-[var(--text-primary)] mt-3 mb-1 first:mt-0">
          {headerText}
        </p>
      );
      continue;
    }

    // Normal paragraph
    nodes.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  return nodes;
}
