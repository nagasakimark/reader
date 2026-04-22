/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

export interface InflectionRule {
  /** The inflected suffix to match (e.g. 'た') */
  inflectedSuffix: string;
  /** The dictionary-form suffix to replace it with (e.g. 'る') */
  dictionarySuffix: string;
  /** The condition tags required on the input form */
  conditionsIn: string[];
  /** The condition tags produced on the output form */
  conditionsOut: string[];
}

function suffixInflection(
  inflectedSuffix: string,
  dictionarySuffix: string,
  conditionsIn: string[],
  conditionsOut: string[]
): InflectionRule {
  return { inflectedSuffix, dictionarySuffix, conditionsIn, conditionsOut };
}

export const japaneseTransformRules: InflectionRule[] = [
  // ---- -た (past tense) ----
  suffixInflection('た', 'る', ['-た'], ['v1']),
  suffixInflection('いた', 'く', ['-た'], ['v5']),
  suffixInflection('いだ', 'ぐ', ['-た'], ['v5']),
  suffixInflection('した', 'す', ['-た'], ['v5']),
  suffixInflection('った', 'う', ['-た'], ['v5']),
  suffixInflection('った', 'つ', ['-た'], ['v5']),
  suffixInflection('った', 'る', ['-た'], ['v5']),
  suffixInflection('んだ', 'ぬ', ['-た'], ['v5']),
  suffixInflection('んだ', 'ぶ', ['-た'], ['v5']),
  suffixInflection('んだ', 'む', ['-た'], ['v5']),
  suffixInflection('した', 'する', ['-た'], ['vs']),
  suffixInflection('きた', 'くる', ['-た'], ['vk']),
  suffixInflection('来た', '来る', ['-た'], ['vk']),
  suffixInflection('じた', 'じる', ['-た'], ['v1']),
  suffixInflection('した', 'ずる', ['-た'], ['vz']),
  suffixInflection('かった', 'い', ['-た'], ['adj-i']),

  // ---- -て (te-form) ----
  suffixInflection('て', 'る', ['-て'], ['v1']),
  suffixInflection('いて', 'く', ['-て'], ['v5']),
  suffixInflection('いで', 'ぐ', ['-て'], ['v5']),
  suffixInflection('して', 'す', ['-て'], ['v5']),
  suffixInflection('って', 'う', ['-て'], ['v5']),
  suffixInflection('って', 'つ', ['-て'], ['v5']),
  suffixInflection('って', 'る', ['-て'], ['v5']),
  suffixInflection('んで', 'ぬ', ['-て'], ['v5']),
  suffixInflection('んで', 'ぶ', ['-て'], ['v5']),
  suffixInflection('んで', 'む', ['-て'], ['v5']),
  suffixInflection('して', 'する', ['-て'], ['vs']),
  suffixInflection('きて', 'くる', ['-て'], ['vk']),
  suffixInflection('来て', '来る', ['-て'], ['vk']),
  suffixInflection('くて', 'い', ['-て'], ['adj-i']),

  // ---- -ない (negative) ----
  suffixInflection('ない', 'る', ['-ない'], ['v1']),
  suffixInflection('かない', 'く', ['-ない'], ['v5']),
  suffixInflection('がない', 'ぐ', ['-ない'], ['v5']),
  suffixInflection('さない', 'す', ['-ない'], ['v5']),
  suffixInflection('たない', 'つ', ['-ない'], ['v5']),
  suffixInflection('なない', 'ぬ', ['-ない'], ['v5']),
  suffixInflection('ばない', 'ぶ', ['-ない'], ['v5']),
  suffixInflection('まない', 'む', ['-ない'], ['v5']),
  suffixInflection('らない', 'る', ['-ない'], ['v5']),
  suffixInflection('わない', 'う', ['-ない'], ['v5']),
  suffixInflection('しない', 'する', ['-ない'], ['vs']),
  suffixInflection('こない', 'くる', ['-ない'], ['vk']),
  suffixInflection('来ない', '来る', ['-ない'], ['vk']),
  suffixInflection('くない', 'い', ['-ない'], ['adj-i']),

  // ---- -ます (polite form) ----
  suffixInflection('ます', 'る', ['-ます'], ['v1']),
  suffixInflection('きます', 'く', ['-ます'], ['v5']),
  suffixInflection('ぎます', 'ぐ', ['-ます'], ['v5']),
  suffixInflection('します', 'す', ['-ます'], ['v5']),
  suffixInflection('ちます', 'つ', ['-ます'], ['v5']),
  suffixInflection('にます', 'ぬ', ['-ます'], ['v5']),
  suffixInflection('びます', 'ぶ', ['-ます'], ['v5']),
  suffixInflection('みます', 'む', ['-ます'], ['v5']),
  suffixInflection('ります', 'る', ['-ます'], ['v5']),
  suffixInflection('います', 'う', ['-ます'], ['v5']),
  suffixInflection('します', 'する', ['-ます'], ['vs']),
  suffixInflection('きます', 'くる', ['-ます'], ['vk']),
  suffixInflection('来ます', '来る', ['-ます'], ['vk']),

  // ---- -ません (polite negative) ----
  suffixInflection('ません', 'る', ['-ません'], ['v1']),
  suffixInflection('きません', 'く', ['-ません'], ['v5']),
  suffixInflection('ぎません', 'ぐ', ['-ません'], ['v5']),
  suffixInflection('しません', 'す', ['-ません'], ['v5']),
  suffixInflection('ちません', 'つ', ['-ません'], ['v5']),
  suffixInflection('にません', 'ぬ', ['-ません'], ['v5']),
  suffixInflection('びません', 'ぶ', ['-ません'], ['v5']),
  suffixInflection('みません', 'む', ['-ません'], ['v5']),
  suffixInflection('りません', 'る', ['-ません'], ['v5']),
  suffixInflection('いません', 'う', ['-ません'], ['v5']),
  suffixInflection('しません', 'する', ['-ません'], ['vs']),
  suffixInflection('きません', 'くる', ['-ません'], ['vk']),
  suffixInflection('来ません', '来る', ['-ません'], ['vk']),

  // ---- -ている / -てる (progressive) ----
  suffixInflection('ている', 'る', ['-てる'], ['v1']),
  suffixInflection('いている', 'く', ['-てる'], ['v5']),
  suffixInflection('いでいる', 'ぐ', ['-てる'], ['v5']),
  suffixInflection('している', 'す', ['-てる'], ['v5']),
  suffixInflection('っている', 'う', ['-てる'], ['v5']),
  suffixInflection('っている', 'つ', ['-てる'], ['v5']),
  suffixInflection('っている', 'る', ['-てる'], ['v5']),
  suffixInflection('んでいる', 'ぬ', ['-てる'], ['v5']),
  suffixInflection('んでいる', 'ぶ', ['-てる'], ['v5']),
  suffixInflection('んでいる', 'む', ['-てる'], ['v5']),
  suffixInflection('している', 'する', ['-てる'], ['vs']),
  suffixInflection('きている', 'くる', ['-てる'], ['vk']),
  suffixInflection('来ている', '来る', ['-てる'], ['vk']),
  // contracted form -てる
  suffixInflection('てる', 'る', ['-てる'], ['v1']),
  suffixInflection('いてる', 'く', ['-てる'], ['v5']),
  suffixInflection('いでる', 'ぐ', ['-てる'], ['v5']),
  suffixInflection('してる', 'す', ['-てる'], ['v5']),
  suffixInflection('ってる', 'う', ['-てる'], ['v5']),
  suffixInflection('ってる', 'つ', ['-てる'], ['v5']),
  suffixInflection('ってる', 'る', ['-てる'], ['v5']),
  suffixInflection('んでる', 'ぬ', ['-てる'], ['v5']),
  suffixInflection('んでる', 'ぶ', ['-てる'], ['v5']),
  suffixInflection('んでる', 'む', ['-てる'], ['v5']),
  suffixInflection('してる', 'する', ['-てる'], ['vs']),
  suffixInflection('きてる', 'くる', ['-てる'], ['vk']),
  suffixInflection('来てる', '来る', ['-てる'], ['vk']),

  // ---- potential ----
  suffixInflection('られる', 'る', ['v1'], ['v1']),
  suffixInflection('ける', 'く', ['v5'], ['v1']),
  suffixInflection('げる', 'ぐ', ['v5'], ['v1']),
  suffixInflection('せる', 'す', ['v5'], ['v1']),
  suffixInflection('てる', 'つ', ['v5'], ['v1']),
  suffixInflection('ねる', 'ぬ', ['v5'], ['v1']),
  suffixInflection('べる', 'ぶ', ['v5'], ['v1']),
  suffixInflection('める', 'む', ['v5'], ['v1']),
  suffixInflection('れる', 'る', ['v5'], ['v1']),
  suffixInflection('える', 'う', ['v5'], ['v1']),
  suffixInflection('できる', 'する', ['vs'], ['v1']),
  suffixInflection('こられる', 'くる', ['vk'], ['v1']),
  suffixInflection('来られる', '来る', ['vk'], ['v1']),

  // ---- passive ----
  suffixInflection('られる', 'る', ['v1'], ['v1']),
  suffixInflection('かれる', 'く', ['v5'], ['v1']),
  suffixInflection('がれる', 'ぐ', ['v5'], ['v1']),
  suffixInflection('される', 'す', ['v5'], ['v1']),
  suffixInflection('たれる', 'つ', ['v5'], ['v1']),
  suffixInflection('なれる', 'ぬ', ['v5'], ['v1']),
  suffixInflection('ばれる', 'ぶ', ['v5'], ['v1']),
  suffixInflection('まれる', 'む', ['v5'], ['v1']),
  suffixInflection('られる', 'る', ['v5'], ['v1']),
  suffixInflection('われる', 'う', ['v5'], ['v1']),
  suffixInflection('される', 'する', ['vs'], ['v1']),
  suffixInflection('こられる', 'くる', ['vk'], ['v1']),
  suffixInflection('来られる', '来る', ['vk'], ['v1']),

  // ---- causative ----
  suffixInflection('させる', 'る', ['v1'], ['v1']),
  suffixInflection('かせる', 'く', ['v5'], ['v1']),
  suffixInflection('がせる', 'ぐ', ['v5'], ['v1']),
  suffixInflection('させる', 'す', ['v5'], ['v1']),
  suffixInflection('たせる', 'つ', ['v5'], ['v1']),
  suffixInflection('なせる', 'ぬ', ['v5'], ['v1']),
  suffixInflection('ばせる', 'ぶ', ['v5'], ['v1']),
  suffixInflection('ませる', 'む', ['v5'], ['v1']),
  suffixInflection('らせる', 'る', ['v5'], ['v1']),
  suffixInflection('わせる', 'う', ['v5'], ['v1']),
  suffixInflection('させる', 'する', ['vs'], ['v1']),
  suffixInflection('こさせる', 'くる', ['vk'], ['v1']),
  suffixInflection('来させる', '来る', ['vk'], ['v1']),

  // ---- volitional (-よう/-おう) ----
  suffixInflection('よう', 'る', ['v1'], []),
  suffixInflection('こう', 'く', ['v5'], []),
  suffixInflection('ごう', 'ぐ', ['v5'], []),
  suffixInflection('そう', 'す', ['v5'], []),
  suffixInflection('とう', 'つ', ['v5'], []),
  suffixInflection('のう', 'ぬ', ['v5'], []),
  suffixInflection('ぼう', 'ぶ', ['v5'], []),
  suffixInflection('もう', 'む', ['v5'], []),
  suffixInflection('ろう', 'る', ['v5'], []),
  suffixInflection('おう', 'う', ['v5'], []),
  suffixInflection('しよう', 'する', ['vs'], []),
  suffixInflection('こよう', 'くる', ['vk'], []),
  suffixInflection('来よう', '来る', ['vk'], []),

  // ---- imperative ----
  suffixInflection('ろ', 'る', ['v1'], []),
  suffixInflection('よ', 'る', ['v1'], []),
  suffixInflection('け', 'く', ['v5'], []),
  suffixInflection('げ', 'ぐ', ['v5'], []),
  suffixInflection('せ', 'す', ['v5'], []),
  suffixInflection('て', 'つ', ['v5'], []),
  suffixInflection('ね', 'ぬ', ['v5'], []),
  suffixInflection('べ', 'ぶ', ['v5'], []),
  suffixInflection('め', 'む', ['v5'], []),
  suffixInflection('れ', 'る', ['v5'], []),
  suffixInflection('え', 'う', ['v5'], []),
  suffixInflection('しろ', 'する', ['vs'], []),
  suffixInflection('せよ', 'する', ['vs'], []),
  suffixInflection('こい', 'くる', ['vk'], []),
  suffixInflection('来い', '来る', ['vk'], []),

  // ---- -たい (desiderative) ----
  suffixInflection('たい', 'る', ['v1'], ['adj-i']),
  suffixInflection('きたい', 'く', ['v5'], ['adj-i']),
  suffixInflection('ぎたい', 'ぐ', ['v5'], ['adj-i']),
  suffixInflection('したい', 'す', ['v5'], ['adj-i']),
  suffixInflection('ちたい', 'つ', ['v5'], ['adj-i']),
  suffixInflection('にたい', 'ぬ', ['v5'], ['adj-i']),
  suffixInflection('びたい', 'ぶ', ['v5'], ['adj-i']),
  suffixInflection('みたい', 'む', ['v5'], ['adj-i']),
  suffixInflection('りたい', 'る', ['v5'], ['adj-i']),
  suffixInflection('いたい', 'う', ['v5'], ['adj-i']),
  suffixInflection('したい', 'する', ['vs'], ['adj-i']),
  suffixInflection('きたい', 'くる', ['vk'], ['adj-i']),
  suffixInflection('来たい', '来る', ['vk'], ['adj-i']),

  // ---- -たら (conditional) ----
  suffixInflection('たら', 'る', ['-たら'], ['v1']),
  suffixInflection('いたら', 'く', ['-たら'], ['v5']),
  suffixInflection('いだら', 'ぐ', ['-たら'], ['v5']),
  suffixInflection('したら', 'す', ['-たら'], ['v5']),
  suffixInflection('ったら', 'う', ['-たら'], ['v5']),
  suffixInflection('ったら', 'つ', ['-たら'], ['v5']),
  suffixInflection('ったら', 'る', ['-たら'], ['v5']),
  suffixInflection('んだら', 'ぬ', ['-たら'], ['v5']),
  suffixInflection('んだら', 'ぶ', ['-たら'], ['v5']),
  suffixInflection('んだら', 'む', ['-たら'], ['v5']),
  suffixInflection('したら', 'する', ['-たら'], ['vs']),
  suffixInflection('きたら', 'くる', ['-たら'], ['vk']),
  suffixInflection('来たら', '来る', ['-たら'], ['vk']),
  suffixInflection('かったら', 'い', ['-たら'], ['adj-i']),

  // ---- -ば (conditional) ----
  suffixInflection('れば', 'る', ['v1'], []),
  suffixInflection('けば', 'く', ['v5'], []),
  suffixInflection('げば', 'ぐ', ['v5'], []),
  suffixInflection('せば', 'す', ['v5'], []),
  suffixInflection('てば', 'つ', ['v5'], []),
  suffixInflection('ねば', 'ぬ', ['v5'], []),
  suffixInflection('べば', 'ぶ', ['v5'], []),
  suffixInflection('めば', 'む', ['v5'], []),
  suffixInflection('れば', 'る', ['v5'], []),
  suffixInflection('えば', 'う', ['v5'], []),
  suffixInflection('すれば', 'する', ['vs'], []),
  suffixInflection('くれば', 'くる', ['vk'], []),
  suffixInflection('来れば', '来る', ['vk'], []),
  suffixInflection('ければ', 'い', ['adj-i'], []),

  // ---- -く (adverbial adj) ----
  suffixInflection('く', 'い', ['adj-i'], []),

  // ---- -さ (noun form adj) ----
  suffixInflection('さ', 'い', ['adj-i'], []),

  // ---- -すぎる (excessive) ----
  suffixInflection('すぎる', 'る', ['v1'], ['v1']),
  suffixInflection('すぎる', 'い', ['adj-i'], ['v1']),

  // ---- -そう (hearsay/appearance) ----
  suffixInflection('そう', 'い', ['adj-i'], []),

  // ---- -がる (showing signs of) ----
  suffixInflection('がる', 'い', ['adj-i'], ['v5']),
  suffixInflection('がっている', 'い', ['adj-i'], ['v5']),

  // ---- continuative (連用形 stem) ----
  suffixInflection('い', 'いる', ['v1'], []),
  suffixInflection('き', 'く', ['v5'], []),
  suffixInflection('ぎ', 'ぐ', ['v5'], []),
  suffixInflection('し', 'す', ['v5'], []),
  suffixInflection('ち', 'つ', ['v5'], []),
  suffixInflection('に', 'ぬ', ['v5'], []),
  suffixInflection('び', 'ぶ', ['v5'], []),
  suffixInflection('み', 'む', ['v5'], []),
  suffixInflection('り', 'る', ['v5'], []),
  suffixInflection('い', 'う', ['v5'], []),
  suffixInflection('し', 'する', ['vs'], []),
  suffixInflection('き', 'くる', ['vk'], []),
  suffixInflection('来', '来る', ['vk'], []),

  // ---- -ず (classical negative) ----
  suffixInflection('ず', 'る', ['v1'], []),
  suffixInflection('かず', 'く', ['v5'], []),
  suffixInflection('がず', 'ぐ', ['v5'], []),
  suffixInflection('さず', 'す', ['v5'], []),
  suffixInflection('たず', 'つ', ['v5'], []),
  suffixInflection('なず', 'ぬ', ['v5'], []),
  suffixInflection('ばず', 'ぶ', ['v5'], []),
  suffixInflection('まず', 'む', ['v5'], []),
  suffixInflection('らず', 'る', ['v5'], []),
  suffixInflection('わず', 'う', ['v5'], []),
  suffixInflection('せず', 'する', ['vs'], []),
  suffixInflection('こず', 'くる', ['vk'], []),
  suffixInflection('来ず', '来る', ['vk'], []),

  // ---- -てしまう (completion/regret) ----
  suffixInflection('てしまう', 'る', ['v1'], ['v5']),
  suffixInflection('いてしまう', 'く', ['v5'], ['v5']),
  suffixInflection('いでしまう', 'ぐ', ['v5'], ['v5']),
  suffixInflection('してしまう', 'す', ['v5'], ['v5']),
  suffixInflection('ってしまう', 'う', ['v5'], ['v5']),
  suffixInflection('ってしまう', 'つ', ['v5'], ['v5']),
  suffixInflection('ってしまう', 'る', ['v5'], ['v5']),
  suffixInflection('んでしまう', 'ぬ', ['v5'], ['v5']),
  suffixInflection('んでしまう', 'ぶ', ['v5'], ['v5']),
  suffixInflection('んでしまう', 'む', ['v5'], ['v5']),
  suffixInflection('してしまう', 'する', ['vs'], ['v5']),
  suffixInflection('きてしまう', 'くる', ['vk'], ['v5']),
  // contracted ちゃう
  suffixInflection('ちゃう', 'る', ['v1'], ['v5']),
  suffixInflection('いちゃう', 'く', ['v5'], ['v5']),
  suffixInflection('しちゃう', 'す', ['v5'], ['v5']),
  suffixInflection('っちゃう', 'う', ['v5'], ['v5']),
  suffixInflection('っちゃう', 'つ', ['v5'], ['v5']),
  suffixInflection('っちゃう', 'る', ['v5'], ['v5']),
  suffixInflection('んじゃう', 'ぬ', ['v5'], ['v5']),
  suffixInflection('んじゃう', 'ぶ', ['v5'], ['v5']),
  suffixInflection('んじゃう', 'む', ['v5'], ['v5']),
  suffixInflection('しちゃう', 'する', ['vs'], ['v5']),
  suffixInflection('きちゃう', 'くる', ['vk'], ['v5']),

  // ---- -てくる / -ていく (coming/going) ----
  suffixInflection('てくる', 'る', ['v1'], ['vk']),
  suffixInflection('いてくる', 'く', ['v5'], ['vk']),
  suffixInflection('いでくる', 'ぐ', ['v5'], ['vk']),
  suffixInflection('してくる', 'す', ['v5'], ['vk']),
  suffixInflection('ってくる', 'う', ['v5'], ['vk']),
  suffixInflection('ってくる', 'つ', ['v5'], ['vk']),
  suffixInflection('ってくる', 'る', ['v5'], ['vk']),
  suffixInflection('んでくる', 'ぬ', ['v5'], ['vk']),
  suffixInflection('んでくる', 'ぶ', ['v5'], ['vk']),
  suffixInflection('んでくる', 'む', ['v5'], ['vk']),
  suffixInflection('してくる', 'する', ['vs'], ['vk']),
  suffixInflection('てくる', 'くる', ['vk'], ['vk']),

  // ---- Kansai-ben negative (へん) ----
  suffixInflection('えへん', 'う', ['v5'], []),
  suffixInflection('かへん', 'く', ['v5'], []),
  suffixInflection('がへん', 'ぐ', ['v5'], []),
  suffixInflection('さへん', 'す', ['v5'], []),
  suffixInflection('たへん', 'つ', ['v5'], []),
  suffixInflection('なへん', 'ぬ', ['v5'], []),
  suffixInflection('ばへん', 'ぶ', ['v5'], []),
  suffixInflection('まへん', 'む', ['v5'], []),
  suffixInflection('らへん', 'る', ['v5'], []),
  suffixInflection('へん', 'る', ['v1'], []),
  suffixInflection('しゃへん', 'する', ['vs'], []),
  suffixInflection('けーへん', 'くる', ['vk'], []),
  suffixInflection('きーへん', 'くる', ['vk'], []),

  // ---- -なさい (polite imperative) ----
  suffixInflection('なさい', 'る', ['v1'], []),
  suffixInflection('きなさい', 'く', ['v5'], []),
  suffixInflection('ぎなさい', 'ぐ', ['v5'], []),
  suffixInflection('しなさい', 'す', ['v5'], []),
  suffixInflection('ちなさい', 'つ', ['v5'], []),
  suffixInflection('になさい', 'ぬ', ['v5'], []),
  suffixInflection('びなさい', 'ぶ', ['v5'], []),
  suffixInflection('みなさい', 'む', ['v5'], []),
  suffixInflection('りなさい', 'る', ['v5'], []),
  suffixInflection('いなさい', 'う', ['v5'], []),
  suffixInflection('しなさい', 'する', ['vs'], []),
  suffixInflection('きなさい', 'くる', ['vk'], []),
  suffixInflection('来なさい', '来る', ['vk'], []),

  // ---- -てみる (try doing) ----
  suffixInflection('てみる', 'る', ['v1'], ['v1']),
  suffixInflection('いてみる', 'く', ['v5'], ['v1']),
  suffixInflection('いでみる', 'ぐ', ['v5'], ['v1']),
  suffixInflection('してみる', 'す', ['v5'], ['v1']),
  suffixInflection('ってみる', 'う', ['v5'], ['v1']),
  suffixInflection('ってみる', 'つ', ['v5'], ['v1']),
  suffixInflection('ってみる', 'る', ['v5'], ['v1']),
  suffixInflection('んでみる', 'ぬ', ['v5'], ['v1']),
  suffixInflection('んでみる', 'ぶ', ['v5'], ['v1']),
  suffixInflection('んでみる', 'む', ['v5'], ['v1']),
  suffixInflection('してみる', 'する', ['vs'], ['v1']),
  suffixInflection('きてみる', 'くる', ['vk'], ['v1'])
];
