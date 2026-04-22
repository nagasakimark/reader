<script lang="ts">
  import type { DictionaryTerm } from '$lib/dictionary/dictionary-database';

  export let entry: DictionaryTerm;
  export let query: string;

  function getReadingDisplay(entry: DictionaryTerm): string {
    if (!entry.reading || entry.reading === entry.expression) return '';
    return entry.reading;
  }

  function formatTags(tags: string): string[] {
    return tags ? tags.split(/\s+/).filter(Boolean) : [];
  }

  function renderDefinition(def: string | Record<string, unknown>): string {
    if (typeof def === 'string') return def;
    // Handle Yomitan structured content: use "content" field recursively
    if (typeof def === 'object' && def !== null) {
      const sc = def as Record<string, unknown>;
      if (typeof sc['content'] === 'string') return sc['content'];
      if (Array.isArray(sc['content'])) {
        return (sc['content'] as (string | Record<string, unknown>)[])
          .map(renderDefinition)
          .join('; ');
      }
      if (typeof sc['text'] === 'string') return sc['text'];
    }
    return '';
  }

  $: reading = getReadingDisplay(entry);
  $: ruleTags = formatTags(entry.rules);
  $: defTags = formatTags(entry.definitionTags);
  $: definitions = entry.definitions.map(renderDefinition).filter(Boolean);
</script>

<div class="dict-entry">
  <div class="dict-entry-header">
    <span class="dict-expression">{entry.expression}</span>
    {#if reading}
      <span class="dict-reading">【{reading}】</span>
    {/if}
    {#if ruleTags.length > 0}
      <span class="dict-tags">
        {#each ruleTags as tag}
          <span class="dict-tag dict-tag-rule">{tag}</span>
        {/each}
      </span>
    {/if}
    {#if defTags.length > 0}
      <span class="dict-tags">
        {#each defTags as tag}
          <span class="dict-tag">{tag}</span>
        {/each}
      </span>
    {/if}
  </div>
  {#if definitions.length > 0}
    <ol class="dict-definitions">
      {#each definitions as def}
        <li>{def}</li>
      {/each}
    </ol>
  {/if}
  <div class="dict-source">{entry.dictionary.replace(/\.zip$/i, '')}</div>
</div>

<style>
  .dict-entry {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid rgba(128, 128, 128, 0.2);
  }
  .dict-entry:last-child {
    border-bottom: none;
  }
  .dict-entry-header {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-bottom: 0.2rem;
  }
  .dict-expression {
    font-size: 1.2rem;
    font-weight: 600;
    writing-mode: horizontal-tb;
  }
  .dict-reading {
    font-size: 0.85rem;
    opacity: 0.8;
    writing-mode: horizontal-tb;
  }
  .dict-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem;
  }
  .dict-tag {
    font-size: 0.65rem;
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
    background: rgba(128, 128, 128, 0.2);
    white-space: nowrap;
  }
  .dict-tag-rule {
    background: rgba(59, 130, 246, 0.25);
  }
  .dict-definitions {
    margin: 0.2rem 0 0.2rem 1rem;
    padding: 0;
    font-size: 0.85rem;
    line-height: 1.4;
    writing-mode: horizontal-tb;
  }
  .dict-definitions li {
    margin-bottom: 0.1rem;
  }
  .dict-source {
    font-size: 0.65rem;
    opacity: 0.45;
    text-align: right;
    writing-mode: horizontal-tb;
  }
</style>
