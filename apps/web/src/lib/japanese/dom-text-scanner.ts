/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

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

/** Unicode-property regex may fail on older engines — fallback below */
let delimiterRegex: RegExp;
try {
  delimiterRegex = /[^\w\p{L}\p{N}]/u;
  delimiterRegex.test('あ');
} catch {
  delimiterRegex = /(?:\s|[\u3000-\u303f]|[!"#$%&'()*+,./:;<=>?^_`{|}~-]|〜)/;
}

export interface ScanResult {
  text: string;
  range: Range;
}

interface CharHit {
  node: Text;
  startUtf16: number;
  units: number;
}

export function scanTextAtPoint(x: number, y: number, maxSpanUtf16 = 64): ScanResult | null {
  let caretRange = getCaretRange(x, y);
  if (!caretRange) caretRange = fallbackCaretRangeFromPoint(x, y);
  if (!caretRange) return null;

  const textNode = resolveTextNode(caretRange);
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null;

  const tn = textNode as Text;
  const caretUtf16 =
    caretRange.startContainer === tn
      ? caretRange.startOffset
      : Math.min(tn.nodeValue?.length ?? 0, caretRange.startOffset);

  const backwardMax = Math.floor(maxSpanUtf16 / 2);
  const forwardMax = maxSpanUtf16 - backwardMax;

  const leftHits = collectBackwardHits(tn, caretUtf16, backwardMax);
  const rightHits = collectForwardHits(tn, caretUtf16, forwardMax);

  const hits = [...leftHits, ...rightHits];
  if (!hits.length) return null;

  const combined = hits
    .map((h) => readUnits(h.node.nodeValue ?? '', h.startUtf16, h.units))
    .join('');
  const caretCombinedUtf16 = utfLenHits(leftHits);

  const slice =
    clipWordWithIntlSegmenter(combined, caretCombinedUtf16) ??
    clipWordSegmentUtf16(combined, caretCombinedUtf16);
  if (!slice || slice.end <= slice.start) return null;

  const range = utf16SliceToDomRange(hits, slice.start, slice.end);
  if (!range) return null;

  return { text: combined.slice(slice.start, slice.end), range };
}

/** Merge rects — improves vertical-writing overlay alignment */
export function unionClientRects(rects: DOMRect[]): DOMRect[] {
  const valid = rects.filter((r) => r.width > 0 && r.height > 0);
  if (valid.length <= 1) return valid;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const r of valid) {
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return [new DOMRect(left, top, right - left, bottom - top)];
}

export function rangeHasVerticalWritingMode(range: Range): boolean {
  let el: Element | null =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;
  for (let i = 0; i < 24 && el; i++, el = el.parentElement) {
    const wm = getComputedStyle(el).writingMode;
    if (
      wm === 'vertical-rl' ||
      wm === 'vertical-lr' ||
      wm === 'sideways-rl' ||
      wm === 'sideways-lr'
    ) {
      return true;
    }
  }
  return false;
}

const HIGHLIGHT_NAME = 'dict-scan';

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

// ---------------------------------------------------------------------------

function utfLenHits(hits: CharHit[]): number {
  let n = 0;
  for (const h of hits) n += h.units;
  return n;
}

function readUnits(val: string, start: number, units: number): string {
  return val.slice(start, start + units);
}

/** Characters strictly BEFORE caret offset */
function collectBackwardHits(startNode: Text, caretUtf16: number, maxUtf16: number): CharHit[] {
  const hitsRev: CharHit[] = [];
  let spent = 0;
  let cur: Node | null = startNode;
  let idx = caretUtf16;

  outer: while (cur && spent < maxUtf16) {
    if (cur.nodeType !== Node.TEXT_NODE) {
      cur = prevDomNode(cur);
      continue;
    }

    const tn = cur as Text;
    const val = tn.nodeValue ?? '';
    let i = idx - 1;

    while (i >= 0 && spent < maxUtf16) {
      const lead = utf16LeadingIndexBackward(val, i);
      const cp = val.codePointAt(lead)!;
      const units = cp > 0xffff ? 2 : 1;
      const start = lead;
      const ch = String.fromCodePoint(cp);
      if (ch === '\n' || ch === '\r') break outer;

      hitsRev.push({ node: tn, startUtf16: start, units });
      spent += units;
      i = start - 1;
    }

    idx = Number.MAX_SAFE_INTEGER;
    cur = prevDomNode(cur);
    if (cur?.nodeType === Node.TEXT_NODE) idx = (cur as Text).length;
  }

  return hitsRev.reverse();
}

/** Characters AT caret offset and forward */
function collectForwardHits(startNode: Text, caretUtf16: number, maxUtf16: number): CharHit[] {
  const hits: CharHit[] = [];
  let spent = 0;
  let cur: Node | null = startNode;
  let idx = caretUtf16;

  outer: while (cur && spent < maxUtf16) {
    if (cur.nodeType !== Node.TEXT_NODE) {
      if (
        cur.nodeType === Node.ELEMENT_NODE &&
        BLOCK_TAGS.has((cur as Element).tagName.toUpperCase()) &&
        hits.length
      ) {
        break outer;
      }
      cur = nextDomNode(cur);
      idx = 0;
      continue;
    }

    const tn = cur as Text;
    const val = tn.nodeValue ?? '';
    let i = idx;

    while (i < val.length && spent < maxUtf16) {
      const cp = val.codePointAt(i)!;
      const units = cp > 0xffff ? 2 : 1;
      const ch = String.fromCodePoint(cp);

      if (ch === '\n' || ch === '\r') break outer;

      hits.push({ node: tn, startUtf16: i, units });
      spent += units;
      i += units;
    }

    idx = 0;
    cur = nextDomNode(cur);
  }

  return hits;
}

function utf16LeadingIndexBackward(val: string, fromInclusive: number): number {
  const i = fromInclusive;
  const c = val.charCodeAt(i);
  if (c >= 0xdc00 && c <= 0xdfff && i > 0) {
    const lead = val.charCodeAt(i - 1);
    if (lead >= 0xd800 && lead <= 0xdbff) return i - 1;
  }
  return i;
}

function clipWordSegmentUtf16(
  combined: string,
  caretUtf16: number
): { start: number; end: number } | null {
  const caret = Math.min(Math.max(0, caretUtf16), combined.length);

  const beforeCh = caret > 0 ? sliceBefore(combined, caret) : '';
  const atCh = caret < combined.length ? sliceAt(combined, caret) : '';

  if (
    caret < combined.length &&
    atCh &&
    isDelimiter(atCh) &&
    (!beforeCh || isDelimiter(beforeCh))
  ) {
    return null;
  }

  let lo = caret;
  while (lo > 0) {
    const prevStart = prevUtf16CharStart(combined, lo);
    const ch = combined.slice(prevStart, lo);
    if (isDelimiter(ch)) break;
    lo = prevStart;
  }

  let hi = caret;
  while (hi < combined.length) {
    const ch = sliceAt(combined, hi);
    if (!ch || isDelimiter(ch)) break;
    hi += utf16LenChar(combined, hi);
  }

  return { start: lo, end: hi };
}

/**
 * One entry per UTF-16 index into `combined`, plus terminal end offset.
 * Fixes sparse-boundary bugs with surrogate pairs (previous impl broke boundaries[n]).
 */
function buildDenseBoundaries(hits: CharHit[]): Array<{ node: Text; offset: number }> | null {
  if (!hits.length) return null;
  const total = utfLenHits(hits);
  const dense: Array<{ node: Text; offset: number }> = new Array(total + 1);
  let cum = 0;
  for (const h of hits) {
    for (let u = 0; u < h.units; u++) {
      dense[cum + u] = { node: h.node, offset: h.startUtf16 + u };
    }
    cum += h.units;
  }
  const last = hits[hits.length - 1];
  dense[cum] = { node: last.node, offset: last.startUtf16 + last.units };
  return dense;
}

/** Prefer native word segmentation when available (Chrome 102+, Safari 16.4+, Firefox 125+). */
function clipWordWithIntlSegmenter(
  combined: string,
  caretUtf16: number
): { start: number; end: number } | null {
  try {
    const SegmenterCtor = (
      Intl as typeof Intl & {
        Segmenter?: new (
          locales: string | string[],
          options?: { granularity?: string }
        ) => {
          segment: (
            input: string
          ) => Iterable<{ segment: string; index: number; isWordLike?: boolean }>;
        };
      }
    ).Segmenter;
    if (typeof SegmenterCtor !== 'function') return null;

    const caret = Math.min(Math.max(0, caretUtf16), combined.length);
    const segmenter = new SegmenterCtor('ja', { granularity: 'word' });

    for (const seg of segmenter.segment(combined)) {
      const start = seg.index;
      const end = start + seg.segment.length;
      if (caret >= start && caret < end) {
        return { start, end };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function utf16SliceToDomRange(hits: CharHit[], lo: number, hi: number): Range | null {
  try {
    const boundaries = buildDenseBoundaries(hits);
    if (!boundaries) return null;
    const startAnchor = boundaries[lo];
    const endAnchor = boundaries[hi];
    if (!startAnchor || !endAnchor) return null;
    const r = document.createRange();
    r.setStart(startAnchor.node, startAnchor.offset);
    r.setEnd(endAnchor.node, endAnchor.offset);
    return r;
  } catch {
    return null;
  }
}

function isDelimiter(ch: string): boolean {
  return ch.length > 0 && delimiterRegex.test(ch);
}

function sliceAt(s: string, utf16: number): string {
  if (utf16 >= s.length) return '';
  const cp = s.codePointAt(utf16)!;
  return String.fromCodePoint(cp);
}

function utf16LenChar(s: string, utf16: number): number {
  const cp = s.codePointAt(utf16)!;
  return cp > 0xffff ? 2 : 1;
}

function sliceBefore(s: string, endExclusive: number): string {
  if (endExclusive <= 0) return '';
  const start = prevUtf16CharStart(s, endExclusive);
  return s.slice(start, endExclusive);
}

function prevUtf16CharStart(s: string, endExclusive: number): number {
  const i = endExclusive - 1;
  const c = s.charCodeAt(i);
  if (c >= 0xdc00 && c <= 0xdfff && i > 0) {
    const lead = s.charCodeAt(i - 1);
    if (lead >= 0xd800 && lead <= 0xdbff) return i - 1;
  }
  return i;
}

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

function fallbackCaretRangeFromPoint(x: number, y: number): Range | null {
  const raw = document.elementFromPoint(x, y);
  if (!raw) return null;

  let el: Element | null =
    raw.nodeType === Node.ELEMENT_NODE ? (raw as Element) : raw.parentElement;
  while (el && shouldRejectSubtree(el)) {
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

  let bestContained: { node: Text; offset: number; dist: number } | null = null;
  let bestDist: { node: Text; offset: number; dist: number } | null = null;
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

      const inside =
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom && rect.width > 0;

      if (inside) {
        if (!bestContained || d < bestContained.dist) {
          bestContained = { node: t, offset: i, dist: d };
        }
      } else if (!bestContained && (!bestDist || d < bestDist.dist)) {
        bestDist = { node: t, offset: i, dist: d };
      }
    }
  }

  const pick = bestContained ?? bestDist;
  return pick ? { node: pick.node, offset: pick.offset } : null;
}

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

function prevDomNode(node: Node): Node | null {
  const prevSibling = node.previousSibling;
  if (prevSibling) {
    let cur: Node | null = prevSibling;
    while (cur?.lastChild) {
      const last = cur.lastChild;
      if (last.nodeType === Node.ELEMENT_NODE && shouldRejectSubtree(last as Element)) break;
      cur = last;
    }
    return cur;
  }

  const parent = node.parentNode;
  if (!parent || parent === document.documentElement) return null;
  return parent;
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
