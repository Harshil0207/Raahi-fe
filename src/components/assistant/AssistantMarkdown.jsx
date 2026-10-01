import { Fragment, useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * The small part of Markdown an answer is allowed to use, rendered as React.
 *
 * There is no `dangerouslySetInnerHTML` here and no HTML parser, which is the
 * whole security argument: nothing in a model's answer is ever interpreted as
 * markup, so there is no markup to sanitise. The renderer only ever produces
 * elements this file names itself — a paragraph, a list item, a `<strong>`, a
 * link. Anything it does not recognise stays as the literal text it was.
 *
 * Deliberately not supported: headings, tables, images, code blocks and raw
 * HTML. The system instruction asks the model not to produce them; this makes
 * that true rather than hoped for.
 */

/**
 * A link is only a link if it is safe to click.
 *
 * `javascript:`, `data:` and friends are the reason this check exists, and an
 * allow-list of two schemes is the only version of it that cannot be argued
 * with. Anything else renders as plain text — visible, and inert.
 */
function safeHref(raw) {
  try {
    const url = new URL(raw, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function Anchor({ href, children }) {
  const safe = safeHref(href);
  if (!safe) return <>{children}</>;

  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline decoration-[var(--border)] underline-offset-2 hover:decoration-current"
    >
      {children}
    </a>
  );
}

/**
 * Inline marks, in one pass.
 *
 * `**bold**`, `` `code` ``, `[label](url)` and bare http(s) links. The order in
 * the pattern is the precedence, and everything that does not match is text.
 */
const INLINE = /(\*\*[^*\n]+\*\*)|(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\s]+\))|(https?:\/\/[^\s<>()]+)/g;

function inline(text, keyPrefix) {
  const out = [];
  let last = 0;
  let index = 0;

  // A fresh cursor per call: the pattern is module-level and global, so
  // `lastIndex` would otherwise carry over from the previous message and skip
  // the start of this one.
  INLINE.lastIndex = 0;
  let match = INLINE.exec(text);

  while (match) {
    if (match.index > last) out.push(text.slice(last, match.index));

    const [token] = match;
    const key = `${keyPrefix}-${(index += 1)}`;

    if (token.startsWith('**')) {
      out.push(
        <strong key={key} className="font-semibold text-body">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`')) {
      out.push(
        <code key={key} className="rounded bg-sunken px-1 py-0.5 font-mono text-[0.92em]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      const split = token.indexOf('](');
      out.push(
        <Anchor key={key} href={token.slice(split + 2, -1)}>
          {token.slice(1, split)}
        </Anchor>
      );
    } else {
      out.push(
        <Anchor key={key} href={token}>
          {token}
        </Anchor>
      );
    }

    last = match.index + token.length;
    match = INLINE.exec(text);
  }

  if (last < text.length) out.push(text.slice(last));

  return out.map((node, i) =>
    typeof node === 'string' ? <Fragment key={`${keyPrefix}-t${i}`}>{node}</Fragment> : node
  );
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*(\d{1,2})[.)]\s+(.*)$/;

/** Blank-line-separated blocks, each one a paragraph or a list. */
function toBlocks(source) {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];

  let current = null;

  const close = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const line of lines) {
    if (!line.trim()) {
      close();
      continue;
    }

    const bullet = line.match(BULLET);
    const numbered = line.match(NUMBERED);

    if (bullet) {
      if (current?.type !== 'ul') {
        close();
        current = { type: 'ul', items: [] };
      }
      current.items.push(bullet[1]);
      continue;
    }

    if (numbered) {
      if (current?.type !== 'ol') {
        close();
        current = { type: 'ol', items: [] };
      }
      current.items.push(numbered[2]);
      continue;
    }

    // A plain line following a list item is a continuation of it, which is how
    // a wrapped sentence in a bullet reads.
    if (current?.type === 'ul' || current?.type === 'ol') {
      current.items[current.items.length - 1] += ` ${line.trim()}`;
      continue;
    }

    if (current?.type !== 'p') {
      close();
      current = { type: 'p', lines: [] };
    }
    current.lines.push(line.trim());
  }

  close();
  return blocks;
}

export function AssistantMarkdown({ children, className }) {
  const blocks = useMemo(() => toBlocks(children), [children]);

  return (
    <div className={cn('space-y-2 text-[14.5px] leading-[1.55]', className)}>
      {blocks.map((block, i) => {
        if (block.type === 'ul') {
          return (
            <ul key={i} className="ml-1 space-y-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span aria-hidden className="mt-[0.55em] size-1 shrink-0 rounded-full bg-[var(--text-faint)]" />
                  <span className="min-w-0">{inline(item, `${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={i} className="ml-1 space-y-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span aria-hidden className="tabular shrink-0 text-faint">
                    {j + 1}.
                  </span>
                  <span className="min-w-0">{inline(item, `${i}-${j}`)}</span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap break-words">
            {inline(block.lines.join('\n'), String(i))}
          </p>
        );
      })}
    </div>
  );
}
