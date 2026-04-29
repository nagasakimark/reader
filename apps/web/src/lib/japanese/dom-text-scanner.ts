/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

/** Tags whose entire subtree must be skipped */
const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'HEAD',
  'NOSCRIPT',
  'TEMPLATE',
  'IFRAME',
  'RT',
  'RP'
]);
/** Block-level tags that act as paragraph boundaries */
const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'SECTION',
  'ARTICLE',
  'ASIDE',
  'HEADER',
  'FOOTER',
  'MAIN',
  'NAV',
  'BLOCKQUOTE',
  'LI',
  'TD',
  'TH',
  'DT',
  'DD',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BR',
  'HR',
  'FIGURE',
  'FIGCAPTION'
]);

export interface ScanResult {
  text: string;
  /** Range spanning the scanned characters, for highlight/positioning */
  range: Range;
}

/**
 * Scan up to `maxLength` visible characters forward from (x, y).
 * Returns the text and DOM range, or null if no text is found.
 */
export function scanTextAtPoint(x: number, y: number, maxLength = 32): ScanResult | null {
  let caretRange = getCaretRange(x, y);
  if (!caretRange) {
    caretRange = fallbackCaretRangeFromPoint(x, y);
  }
  if (!caretRange) return null;

  const startNode = resolveTextNode(caretRange);
  if (!startNode) return null;

  const startOffset = caretRange.startContainer === startNode ? caretRange.startOffset : 0;

  const { text, endNode, endOffset } = collectForward(startNode, startOffset, maxLength);
  if (!text) return null;

  const outRange = document.createRange();
  outRange.setStart(startNode, startOffset);
  outRange.setEnd(endNode, endOffset);

  return { text, range: outRange };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getCaretRange(x: number, y: number): Range | null {
  if (typeof document.caretRangeFromPoint === 'function') {
    return document.caretRangeFromPoint(x, y);
  }
  const doc = document as Document & {
    caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null;
  };
  if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const r = document.createRange();
    r.setStart(pos.offsetNode, pos.offset);
    r.collapse(true);
    return r;
  }
  return null;
}

/**
 * When caret APIs miss (some layouts / overlays / browsers), approximate a caret
 * position from elementFromPoint + text-node geometry.
 */
function fallbackCaretRangeFromPoint(x: number, y: number): Range | null {
  const raw = document.elementFromPoint(x, y);
  if (!raw) return null;

  let el: Element | null =
    raw.nodeType === Node.ELEMENT_NODE ? (raw as Element) : raw.parentElement;
  while (el && el.nodeType === Node.ELEMENT_NODE && shouldRejectSubtree(el)) {
    el = el.parentElement;
  }
  if (!el) return null;

  let hops = 0;
  while (el && hops < 12) {
    const hit = findTextOffsetUnderElement(el, x, y);
    if (hit) {
      const r = document.createRange();
      r.setStart(hit.node, hit.offset);
      r.collapse(true);
      return r;
    }
    el = el.parentElement;
    hops++;
  }
  return null;
}

function findTextOffsetUnderElement(
  container: Element,
  x: number,
  y: number
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  let best: { node: Text; offset: number; dist: number } | null = null;
  let charBudget = 800;

  while ((node = walker.nextNode()) && charBudget > 0) {
    const t = node as Text;
    const parent = t.parentElement;
    if (parent && shouldRejectSubtree(parent)) continue;

    const len = t.length;
    if (len === 0) continue;

    const range = document.createRange();
    for (let i = 0; i < len && charBudget > 0; i++, charBudget--) {
      range.setStart(t, i);
      range.setEnd(t, i + 1);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const d = (cx - x) ** 2 + (cy - y) ** 2;
      if (!best || d < best.dist) {
        best = { node: t, offset: i, dist: d };
      }
    }
  }

  return best ? { node: best.node, offset: best.offset } : null;
}

/**
 * Resolve the text node at the caret position, handling ruby elements and
 * element containers (caretRangeFromPoint sometimes returns an element node).
 */
function resolveTextNode(range: Range): Node | null {
  const node: Node | null = range.startContainer;

  if (node.nodeType === Node.TEXT_NODE) return node;

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const tag = el.tagName.toUpperCase();

    if (tag === 'RT' || tag === 'RP') {
      const ruby = el.closest('ruby');
      return ruby ? firstTextDescendant(ruby) : null;
    }

    const child = el.childNodes[range.startOffset];
    if (child) {
      if (child.nodeType === Node.TEXT_NODE) return child;
      return firstTextDescendant(child);
    }
    return firstTextDescendant(el);
  }

  return null;
}

interface CollectResult {
  text: string;
  endNode: Node;
  endOffset: number;
}

function collectForward(startNode: Node, startOffset: number, maxLength: number): CollectResult {
  let text = '';
  let endNode: Node = startNode;
  let endOffset = startOffset;

  let currentNode: Node | null = startNode;
  let charOffset = startOffset;

  while (currentNode && text.length < maxLength) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      const content = currentNode.nodeValue ?? '';
      for (let i = charOffset; i < content.length && text.length < maxLength; i++) {
        const ch = content[i];
        const cp = content.codePointAt(i) ?? 0;

        if (ch === '\n' || ch === '\r') {
          if (text.length > 0) {
            endNode = currentNode;
            endOffset = i;
            return { text, endNode, endOffset };
          }
          break;
        }

        if (cp === 0x200b || cp === 0x00ad || cp < 0x20) continue;

        text += ch;
        endNode = currentNode;
        endOffset = i + 1;

        if (cp > 0xffff) i++;
      }
      charOffset = 0;
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const el = currentNode as Element;
      if (text.length > 0 && BLOCK_TAGS.has(el.tagName.toUpperCase())) {
        return { text, endNode, endOffset };
      }
    }

    currentNode = nextDomNode(currentNode);
  }

  return { text, endNode, endOffset };
}

function nextDomNode(node: Node): Node | null {
  if (
    node.nodeType === Node.ELEMENT_NODE &&
    !shouldRejectSubtree(node as Element) &&
    node.firstChild
  ) {
    return node.firstChild;
  }

  let current: Node | null = node;
  while (current) {
    if (current === document.body || current === document.documentElement) return null;
    const sibling = current.nextSibling;
    if (sibling) return sibling;
    current = current.parentNode;
  }
  return null;
}

function shouldRejectSubtree(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName.toUpperCase())) return true;
  try {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return true;
    if (style.opacity === '0') return true;
  } catch {
    // ignore
  }
  return false;
}

function firstTextDescendant(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return node;
  for (const child of node.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE && shouldRejectSubtree(child as Element)) continue;
    const found = firstTextDescendant(child);
    if (found) return found;
  }
  return null;
}

const HIGHLIGHT_NAME = 'dict-scan';

/** Optional CSS Custom Highlight API (Chrome/Safari); harmless elsewhere */
export function applyWordHighlight(range: Range): void {
  clearWordHighlight();
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return;
  try {
    (CSS as unknown as { highlights: { set: (n: string, h: unknown) => void } }).highlights.set(
      HIGHLIGHT_NAME,
      new (window as unknown as { Highlight: new (r: Range) => unknown }).Highlight(range)
    );
  } catch {
    // unsupported
  }
}

export function clearWordHighlight(): void {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return;
  try {
    (CSS as unknown as { highlights: { delete: (n: string) => void } }).highlights.delete(
      HIGHLIGHT_NAME
    );
  } catch {
    // ignore
  }
}
