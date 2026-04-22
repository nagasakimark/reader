/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { japaneseTransformRules, type InflectionRule } from './japanese-transforms';
import { normalizeForLookup } from './japanese-utils';

export interface DeinflectionCandidate {
  /** The (possibly partially deinflected) text to look up */
  text: string;
  /** The original inflected text (before any transforms) */
  originalText: string;
  /** Human-readable description of applied transforms */
  reasons: string[];
}

const MAX_DEPTH = 20;

/**
 * Given an inflected string, return every possible dictionary form
 * together with the transform chain that produced it.
 */
export function deinflect(inflected: string): DeinflectionCandidate[] {
  const seen = new Set<string>();
  const results: DeinflectionCandidate[] = [];

  function recurse(text: string, reasons: string[], depth: number, conditions: string[]) {
    if (depth > MAX_DEPTH) return;

    // Always include the current form as a direct lookup candidate
    const norm = normalizeForLookup(text);
    if (!seen.has(norm)) {
      seen.add(norm);
      results.push({ text: norm, originalText: inflected, reasons: [...reasons] });
    }
    if (text !== norm && !seen.has(text)) {
      seen.add(text);
      results.push({ text, originalText: inflected, reasons: [...reasons] });
    }

    for (const rule of japaneseTransformRules) {
      // Conditions must be compatible: if input has conditions, the rule's
      // conditionsIn must share at least one; if input has no conditions (root),
      // any rule fires.
      if (conditions.length > 0 && rule.conditionsIn.length > 0) {
        const matches = rule.conditionsIn.some((c) => conditions.includes(c));
        if (!matches) continue;
      }

      if (!text.endsWith(rule.inflectedSuffix)) continue;
      if (rule.inflectedSuffix === rule.dictionarySuffix) continue;

      const stem = text.slice(0, text.length - rule.inflectedSuffix.length);
      const newText = stem + rule.dictionarySuffix;
      if (newText.length === 0) continue;

      const newReasons = [describeRule(rule), ...reasons];
      recurse(newText, newReasons, depth + 1, rule.conditionsOut);
    }
  }

  recurse(inflected, [], 0, []);
  return results;
}

function describeRule(rule: InflectionRule): string {
  if (rule.inflectedSuffix === '' && rule.dictionarySuffix !== '') {
    return `+${rule.dictionarySuffix}`;
  }
  return `${rule.inflectedSuffix}→${rule.dictionarySuffix}`;
}
