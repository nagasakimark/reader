/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

// Unicode ranges for Japanese characters
const HIRAGANA_RANGE: [number, number] = [0x3040, 0x309f];
const KATAKANA_RANGE: [number, number] = [0x30a0, 0x30ff];
const HALFWIDTH_KATAKANA_RANGE: [number, number] = [0xff66, 0xff9f];
const KATAKANA_PROLONGED_SOUND_MARK = 0x30fc;

const CJK_IDEOGRAPH_RANGES: [number, number][] = [
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0x3400, 0x4dbf], // CJK Extension A
  [0x20000, 0x2a6df], // CJK Extension B
  [0x2a700, 0x2b73f], // CJK Extension C
  [0x2b740, 0x2b81f], // CJK Extension D
  [0x2b820, 0x2ceaf], // CJK Extension E
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
  [0x2f800, 0x2fa1f] // CJK Compatibility Supplement
];

const JAPANESE_RANGES: [number, number][] = [
  HIRAGANA_RANGE,
  KATAKANA_RANGE,
  HALFWIDTH_KATAKANA_RANGE,
  ...CJK_IDEOGRAPH_RANGES,
  [0x3000, 0x303f], // CJK Symbols and Punctuation
  [0xff01, 0xff60], // Fullwidth ASCII variants
  [0xffe0, 0xffe6] // Fullwidth Signs
];

function isCodePointInRange(cp: number, [lo, hi]: [number, number]): boolean {
  return cp >= lo && cp <= hi;
}

export function isCodePointKanji(cp: number): boolean {
  return CJK_IDEOGRAPH_RANGES.some((range) => isCodePointInRange(cp, range));
}

export function isCodePointKana(cp: number): boolean {
  return isCodePointInRange(cp, HIRAGANA_RANGE) || isCodePointInRange(cp, KATAKANA_RANGE);
}

export function isCodePointJapanese(cp: number): boolean {
  return JAPANESE_RANGES.some((range) => isCodePointInRange(cp, range));
}

export function isStringPartiallyJapanese(str: string): boolean {
  for (const ch of str) {
    if (isCodePointJapanese(ch.codePointAt(0)!)) return true;
  }
  return false;
}

/**
 * Convert katakana to hiragana. The prolonged sound mark ー is kept as-is
 * unless keepProlongedSoundMark=false, in which case it resolves to the
 * previous hiragana vowel (best-effort).
 */
export function convertKatakanaToHiragana(text: string): string {
  let result = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (isCodePointInRange(cp, KATAKANA_RANGE) && cp !== KATAKANA_PROLONGED_SOUND_MARK) {
      result += String.fromCodePoint(cp - 0x60);
    } else {
      result += ch;
    }
  }
  return result;
}

export function convertHiraganaToKatakana(text: string): string {
  let result = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (isCodePointInRange(cp, HIRAGANA_RANGE)) {
      result += String.fromCodePoint(cp + 0x60);
    } else {
      result += ch;
    }
  }
  return result;
}

// Halfwidth katakana → fullwidth katakana mapping
const HALFWIDTH_KATAKANA_MAPPING: Record<number, string> = {
  0xff66: 'ヲ',
  0xff67: 'ァ',
  0xff68: 'ィ',
  0xff69: 'ゥ',
  0xff6a: 'ェ',
  0xff6b: 'ォ',
  0xff6c: 'ャ',
  0xff6d: 'ュ',
  0xff6e: 'ョ',
  0xff6f: 'ッ',
  0xff70: 'ー',
  0xff71: 'ア',
  0xff72: 'イ',
  0xff73: 'ウ',
  0xff74: 'エ',
  0xff75: 'オ',
  0xff76: 'カ',
  0xff77: 'キ',
  0xff78: 'ク',
  0xff79: 'ケ',
  0xff7a: 'コ',
  0xff7b: 'サ',
  0xff7c: 'シ',
  0xff7d: 'ス',
  0xff7e: 'セ',
  0xff7f: 'ソ',
  0xff80: 'タ',
  0xff81: 'チ',
  0xff82: 'ツ',
  0xff83: 'テ',
  0xff84: 'ト',
  0xff85: 'ナ',
  0xff86: 'ニ',
  0xff87: 'ヌ',
  0xff88: 'ネ',
  0xff89: 'ノ',
  0xff8a: 'ハ',
  0xff8b: 'ヒ',
  0xff8c: 'フ',
  0xff8d: 'ヘ',
  0xff8e: 'ホ',
  0xff8f: 'マ',
  0xff90: 'ミ',
  0xff91: 'ム',
  0xff92: 'メ',
  0xff93: 'モ',
  0xff94: 'ヤ',
  0xff95: 'ユ',
  0xff96: 'ヨ',
  0xff97: 'ラ',
  0xff98: 'リ',
  0xff99: 'ル',
  0xff9a: 'レ',
  0xff9b: 'ロ',
  0xff9c: 'ワ',
  0xff9d: 'ン',
  0xff9e: '゛',
  0xff9f: '゜'
};

export function convertHalfWidthKanaToFullWidth(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i)!;
    if (isCodePointInRange(cp, HALFWIDTH_KATAKANA_RANGE)) {
      const mapped = HALFWIDTH_KATAKANA_MAPPING[cp];
      if (mapped) {
        // Handle combining dakuten/handakuten
        const nextCp = text.codePointAt(i + 1);
        if (nextCp === 0xff9e || nextCp === 0xff9f) {
          const combined = applyDakuten(mapped, nextCp === 0xff9f);
          result += combined;
          i++;
        } else {
          result += mapped;
        }
      } else {
        result += text[i];
      }
    } else {
      result += text[i];
    }
  }
  return result;
}

function applyDakuten(char: string, isHandakuten: boolean): string {
  const dakutenMap: Record<string, string> = {
    カ: 'ガ',
    キ: 'ギ',
    ク: 'グ',
    ケ: 'ゲ',
    コ: 'ゴ',
    サ: 'ザ',
    シ: 'ジ',
    ス: 'ズ',
    セ: 'ゼ',
    ソ: 'ゾ',
    タ: 'ダ',
    チ: 'ヂ',
    ツ: 'ヅ',
    テ: 'デ',
    ト: 'ド',
    ハ: 'バ',
    ヒ: 'ビ',
    フ: 'ブ',
    ヘ: 'ベ',
    ホ: 'ボ',
    ウ: 'ヴ'
  };
  const handakutenMap: Record<string, string> = {
    ハ: 'パ',
    ヒ: 'ピ',
    フ: 'プ',
    ヘ: 'ペ',
    ホ: 'ポ'
  };
  return isHandakuten ? (handakutenMap[char] ?? char) : (dakutenMap[char] ?? char);
}

/** Normalize text for dictionary lookup: halfwidth→fullwidth, katakana→hiragana */
export function normalizeForLookup(text: string): string {
  return convertKatakanaToHiragana(convertHalfWidthKanaToFullWidth(text));
}
