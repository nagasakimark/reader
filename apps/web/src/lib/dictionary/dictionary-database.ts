/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface DictionaryMeta {
  /** ZIP filename used as primary key */
  name: string;
  title: string;
  revision: string;
  termCount: number;
  importedAt: number;
}

/**
 * A single term entry as stored in the database.
 * Matches the Yomitan term_bank array layout:
 * [expression, reading, definitionTags, rules, score, definitions, sequence, termTags]
 */
export interface DictionaryTerm {
  /** Auto-increment primary key */
  id?: number;
  /** The dictionary this entry came from */
  dictionary: string;
  /** Surface form: 食べる */
  expression: string;
  /** Reading in hiragana: たべる */
  reading: string;
  /** Pipe-separated definition tags: v1 exp */
  definitionTags: string;
  /** Pipe-separated inflection rules: v1 */
  rules: string;
  /** Relevance score */
  score: number;
  /** Array of definition strings / structured content */
  definitions: (string | Record<string, unknown>)[];
  /** Sequence number within dictionary */
  sequence: number;
  /** Term-specific tags */
  termTags: string;
  /** Normalized (hiragana) form of expression, for fast lookup */
  expressionNorm: string;
  /** Normalized (hiragana) form of reading */
  readingNorm: string;
}

interface DictSchema extends DBSchema {
  terms: {
    key: number;
    value: DictionaryTerm;
    indexes: {
      expression: string;
      expressionNorm: string;
      reading: string;
      readingNorm: string;
      dictionary: string;
    };
  };
  dictionaries: {
    key: string;
    value: DictionaryMeta;
  };
}

// ---------------------------------------------------------------------------
// Singleton DB instance
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBPDatabase<DictSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<DictSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DictSchema>('yomitan-dict', 1, {
      upgrade(db) {
        const termStore = db.createObjectStore('terms', {
          keyPath: 'id',
          autoIncrement: true
        });
        termStore.createIndex('expression', 'expression');
        termStore.createIndex('expressionNorm', 'expressionNorm');
        termStore.createIndex('reading', 'reading');
        termStore.createIndex('readingNorm', 'readingNorm');
        termStore.createIndex('dictionary', 'dictionary');

        db.createObjectStore('dictionaries', { keyPath: 'name' });
      }
    });
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Look up terms by exact expression (also tries reading index) */
export async function findTerms(query: string): Promise<DictionaryTerm[]> {
  const db = await getDb();
  const [byExpr, byReading, byExprNorm, byReadingNorm] = await Promise.all([
    db.getAllFromIndex('terms', 'expression', query),
    db.getAllFromIndex('terms', 'reading', query),
    db.getAllFromIndex('terms', 'expressionNorm', query),
    db.getAllFromIndex('terms', 'readingNorm', query)
  ]);
  // Deduplicate by id
  const seen = new Set<number>();
  const results: DictionaryTerm[] = [];
  for (const t of [...byExpr, ...byReading, ...byExprNorm, ...byReadingNorm]) {
    if (!seen.has(t.id!)) {
      seen.add(t.id!);
      results.push(t);
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

/** Bulk-insert terms; called by DictionaryImporter */
export async function bulkInsertTerms(terms: Omit<DictionaryTerm, 'id'>[]): Promise<void> {
  const db = await getDb();
  const CHUNK = 500;
  for (let i = 0; i < terms.length; i += CHUNK) {
    const tx = db.transaction('terms', 'readwrite');
    const store = tx.objectStore('terms');
    const chunk = terms.slice(i, i + CHUNK);
    await Promise.all(chunk.map((t) => store.add(t as DictionaryTerm)));
    await tx.done;
  }
}

/** Register dictionary metadata */
export async function saveDictionaryMeta(meta: DictionaryMeta): Promise<void> {
  const db = await getDb();
  await db.put('dictionaries', meta);
}

/** List all installed dictionaries */
export async function listDictionaries(): Promise<DictionaryMeta[]> {
  const db = await getDb();
  return db.getAll('dictionaries');
}

/** Delete a dictionary and all its terms */
export async function deleteDictionary(name: string): Promise<void> {
  const db = await getDb();
  // Delete metadata
  await db.delete('dictionaries', name);
  // Delete all terms from this dictionary
  const tx = db.transaction('terms', 'readwrite');
  const index = tx.store.index('dictionary');
  let cursor = await index.openCursor(IDBKeyRange.only(name));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

/** Returns true if at least one dictionary is installed */
export async function hasDictionaries(): Promise<boolean> {
  const db = await getDb();
  const count = await db.count('dictionaries');
  return count > 0;
}
