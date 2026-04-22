/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { isCodePointJapanese } from './japanese-utils';

/** Tags whose entire subtree should be skipped */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'HEAD', 'NOSCRIPT', 'TEMPLATE', 'IFRAME']);
/** Tags that count as a newline / word boundary */
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
  range: Range;
}

/**
 * Scan up to `maxLength` characters of text forward from (x, y).
 * Returns the extracted text and the DOM Range it spans, or null if
 * the point doesn't hit any text.
 */
export function scanTextAtPoint(x: number, y: number, maxLength = 32): ScanResult | null {
  const range = getRangeAtPoint(x, y);
  if (!range) return null;

  const { node, offset } = getStartPosition(range);
  if (!node) return null;

  const result = walkForward(node, offset, maxLength);
  if (!result.text) return null;

  const outRange = document.createRange();
  outRange.setStart(result.startNode, result.startOffset);
  outRange.setEnd(result.endNode, result.endOffset);

  return { text: result.text, range: outRange };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getRangeAtPoint(x: number, y: number): Range | null {
  // Standard (Chrome/Edge/Safari)
  if (typeof document.caretRangeFromPoint === 'function') {
    return document.caretRangeFromPoint(x, y);
  }
  // Firefox
  if ('caretPositionFromPoint' in document) {
    const pos = (
      document as Document & {
        caretPositionFromPoint(x: number, y: number): { offsetNode: Node; offset: number } | null;
      }
    ).caretPositionFromPoint(x, y);
    if (!pos) return null;
    const r = document.createRange();
    r.setStart(pos.offsetNode, pos.offset);
    r.collapse(true);
    return r;
  }
  return null;
}

function getStartPosition(range: Range): { node: Node | null; offset: number } {
  let node: Node | null = range.startContainer;
  let offset = range.startOffset;

  // If we landed inside a <ruby>, move to start of the ruby's base text
  while (node && node.nodeType !== Node.TEXT_NODE) {
    const el = node as Element;
    if (el.tagName === 'RT' || el.tagName === 'RP') {
      // Move up to <ruby> element and use first text child
      const ruby = el.closest('ruby');
      if (ruby) {
        node = firstTextDescendant(ruby);
        offset = 0;
      } else {
        return { node: null, offset: 0 };
      }
      break;
    }
    // Drill into first child
    if (node.firstChild) {
      node = node.firstChild;
      offset = 0;
    } else {
      break;
    }
  }
  return { node, offset };
}

interface WalkResult {
  text: string;
  startNode: Node;
  startOffset: number;
  endNode: Node;
  endOffset: number;
}

function walkForward(startNode: Node, startOffset: number, maxLength: number): WalkResult {
  let text = '';
  let endNode = startNode;
  let endOffset = startOffset;
  const startN = startNode;
  const startOff = startOffset;
  let hitJapanese = false;

  // TreeWalker over text nodes from root
  const walker = document.createTreeWalker(
    document.body ?? document.documentElement,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          const tag = el.tagName.toUpperCase();
          if (SKIP_TAGS.has(tag)) return NodeFilter.FILTER_REJECT;
          if (el.tagName === 'RT' || el.tagName === 'RP') return NodeFilter.FILTER_REJECT;
          // Check visibility
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  // Seek walker to startNode
  let current: Node | null = walker.nextNode();
  while (current && current !== startNode) {
    current = walker.nextNode();
  }

  if (!current) {
    return { text, startNode: startN, startOffset: startOff, endNode: startN, endOffset: startOff };
  }

  // Process starting node from offset
  let charOffset = startOffset;
  while (current && text.length < maxLength) {
    if (current.nodeType === Node.TEXT_NODE) {
      const content = current.nodeValue ?? '';
      for (let i = charOffset; i < content.length && text.length < maxLength; i++) {
        const cp = content.codePointAt(i)!;
        const ch = content[i];

        // Stop at newline
        if (ch === '\n') {
          if (hitJapanese)
            goto_end: {
              endNode = current;
              endOffset = i;
              break goto_end;
            }
          break;
        }

        // Skip zero-width and control characters
        if (cp === 0x200b || cp === 0x00ad || cp < 0x20) continue;

        text += ch;
        endNode = current;
        endOffset = i + 1;

        if (!hitJapanese && isCodePointJapanese(cp)) {
          hitJapanese = true;
        }

        // For surrogate pairs
        if (cp > 0xffff) i++;
      }
      charOffset = 0;
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element;
      if (BLOCK_TAGS.has(el.tagName.toUpperCase())) {
        if (text.length > 0) break; // stop at block boundary after collecting something
      }
    }
    current = walker.nextNode();
  }

  return { text, startNode: startN, startOffset: startOff, endNode, endOffset };
}

function firstTextDescendant(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return node;
  for (const child of node.childNodes) {
    const found = firstTextDescendant(child);
    if (found) return found;
  }
  return null;
}
