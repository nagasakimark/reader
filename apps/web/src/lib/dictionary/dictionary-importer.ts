/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { BlobReader, ZipReader, TextWriter } from '@zip.js/zip.js';
import { bulkInsertTerms, saveDictionaryMeta, type DictionaryTerm } from './dictionary-database';
import {
  convertKatakanaToHiragana,
  convertHalfWidthKanaToFullWidth
} from '$lib/japanese/japanese-utils';

export type ImportProgressCallback = (progress: {
  phase: 'reading' | 'parsing' | 'inserting';
  done: number;
  total: number;
  message: string;
}) => void;

export class DictionaryImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DictionaryImportError';
  }
}

/**
 * Import a Yomitan dictionary ZIP file.
 *
 * @param file    The .zip File object
 * @param onProgress Optional progress callback
 * @returns The title of the imported dictionary
 */
export async function importDictionary(
  file: File,
  onProgress?: ImportProgressCallback
): Promise<string> {
  onProgress?.({ phase: 'reading', done: 0, total: 1, message: 'Reading ZIP…' });

  const zipReader = new ZipReader(new BlobReader(file));
  let entries;
  try {
    entries = await zipReader.getEntries();
  } catch {
    throw new DictionaryImportError('Failed to open ZIP file. Is it a valid Yomitan dictionary?');
  }

  const entryMap = new Map(entries.map((e) => [e.filename, e]));

  // Read index.json
  const indexEntry = entryMap.get('index.json');
  if (!indexEntry) {
    throw new DictionaryImportError('Missing index.json — not a valid Yomitan dictionary.');
  }

  onProgress?.({ phase: 'reading', done: 0, total: 1, message: 'Parsing index.json…' });
  const indexText = await indexEntry.getData!(new TextWriter());
  const index = JSON.parse(indexText) as {
    title: string;
    revision?: string;
    format?: number;
  };

  if (!index.title) {
    throw new DictionaryImportError('index.json is missing a "title" field.');
  }

  const dictionaryName = file.name;
  const dictionaryTitle = index.title;

  // Collect all term_bank_N.json filenames
  const termBankFiles = [...entryMap.keys()]
    .filter((name) => /^term_bank_\d+\.json$/.test(name))
    .sort();

  if (termBankFiles.length === 0) {
    throw new DictionaryImportError('No term_bank files found in this dictionary.');
  }

  let totalTerms = 0;
  let processedTerms = 0;

  // First pass: count terms for progress reporting
  onProgress?.({
    phase: 'parsing',
    done: 0,
    total: termBankFiles.length,
    message: 'Counting entries…'
  });

  // Second pass: parse and insert
  for (let fileIdx = 0; fileIdx < termBankFiles.length; fileIdx++) {
    const filename = termBankFiles[fileIdx];
    const entry = entryMap.get(filename)!;

    onProgress?.({
      phase: 'parsing',
      done: fileIdx,
      total: termBankFiles.length,
      message: `Parsing ${filename}…`
    });

    const text = await entry.getData!(new TextWriter());
    let termArray: unknown[];
    try {
      termArray = JSON.parse(text) as unknown[];
    } catch {
      throw new DictionaryImportError(`Failed to parse ${filename}.`);
    }

    const batch: Omit<DictionaryTerm, 'id'>[] = termArray.map((row) => {
      const r = row as [
        string,
        string,
        string,
        string,
        number,
        (string | Record<string, unknown>)[],
        number,
        string
      ];
      const expression: string = r[0] ?? '';
      const reading: string = r[1] ?? '';
      return {
        dictionary: dictionaryName,
        expression,
        reading,
        definitionTags: r[2] ?? '',
        rules: r[3] ?? '',
        score: r[4] ?? 0,
        definitions: r[5] ?? [],
        sequence: r[6] ?? 0,
        termTags: r[7] ?? '',
        expressionNorm: normalizeText(expression),
        readingNorm: normalizeText(reading || expression)
      };
    });

    onProgress?.({
      phase: 'inserting',
      done: processedTerms,
      total: totalTerms || batch.length * termBankFiles.length,
      message: `Inserting ${batch.length} terms from ${filename}…`
    });

    await bulkInsertTerms(batch);
    processedTerms += batch.length;
    totalTerms = processedTerms;
  }

  // Save metadata
  await saveDictionaryMeta({
    name: dictionaryName,
    title: dictionaryTitle,
    revision: index.revision ?? 'unknown',
    termCount: totalTerms,
    importedAt: Date.now()
  });

  await zipReader.close();

  onProgress?.({
    phase: 'inserting',
    done: totalTerms,
    total: totalTerms,
    message: `Imported ${totalTerms.toLocaleString()} terms from "${dictionaryTitle}".`
  });

  return dictionaryTitle;
}

function normalizeText(text: string): string {
  return convertKatakanaToHiragana(convertHalfWidthKanaToFullWidth(text));
}
