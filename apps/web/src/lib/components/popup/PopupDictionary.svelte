<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import DictionaryEntry from './DictionaryEntry.svelte';
  import type { DictionaryTerm } from '$lib/dictionary/dictionary-database';

  /** The word that was scanned */
  export let query: string = '';
  /** Matching dictionary entries */
  export let entries: DictionaryTerm[] = [];
  /** Whether any dictionaries are installed at all */
  export let hasDictionaries: boolean = true;
  /** Anchor rect of the scanned text (page coordinates) */
  export let anchorRect: DOMRect | null = null;
  /** Whether the popup is visible */
  export let visible: boolean = false;

  const dispatch = createEventDispatcher<{
    close: void;
    importRequest: void;
  }>();

  let popupEl: HTMLDivElement;
  let left = 0;
  let top = 0;
  const POPUP_WIDTH = 340;
  const POPUP_MAX_HEIGHT = 380;
  const MARGIN = 8;

  $: if (visible && anchorRect && popupEl) {
    positionPopup(anchorRect);
  }

  function positionPopup(rect: DOMRect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Try to appear below the anchor; fall back to above
    let t = rect.bottom + MARGIN + window.scrollY;
    let l = rect.left + window.scrollX;

    // Clamp horizontally
    if (l + POPUP_WIDTH > vw + window.scrollX - MARGIN) {
      l = vw + window.scrollX - POPUP_WIDTH - MARGIN;
    }
    if (l < MARGIN) l = MARGIN;

    // If not enough room below, flip above
    if (rect.bottom + POPUP_MAX_HEIGHT + MARGIN > vh) {
      t = rect.top + window.scrollY - POPUP_MAX_HEIGHT - MARGIN;
      if (t < window.scrollY + MARGIN) {
        t = window.scrollY + MARGIN;
      }
    }

    left = l;
    top = t;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      dispatch('close');
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (popupEl && !popupEl.contains(e.target as Node)) {
      dispatch('close');
    }
  }

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleClickOutside);
  });

  $: if (visible) {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
  } else {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleClickOutside);
  }
</script>

{#if visible}
  <div
    bind:this={popupEl}
    class="dict-popup"
    style:left="{left}px"
    style:top="{top}px"
    style:writing-mode="horizontal-tb"
    role="dialog"
    aria-label="Dictionary"
  >
    <div class="dict-popup-header">
      <span class="dict-query">{query}</span>
      <button class="dict-close" on:click={() => dispatch('close')} aria-label="Close dictionary"
        >✕</button
      >
    </div>

    <div class="dict-popup-body">
      {#if !hasDictionaries}
        <div class="dict-empty">
          <p>No dictionaries installed.</p>
          <button class="dict-import-btn" on:click={() => dispatch('importRequest')}>
            Import a dictionary
          </button>
          <p class="dict-hint">
            Download a free Yomitan-format dictionary (e.g.
            <a
              href="https://github.com/themoeway/jmdict-yomitan/releases"
              target="_blank"
              rel="noopener noreferrer">JMdict</a
            >) and import the .zip file.
          </p>
        </div>
      {:else if entries.length === 0}
        <div class="dict-empty">
          <p>No results for <strong>{query}</strong></p>
        </div>
      {:else}
        {#each entries as entry (entry.id)}
          <DictionaryEntry {entry} {query} />
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .dict-popup {
    position: absolute;
    z-index: 9999;
    width: 340px;
    max-height: 380px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.35),
      0 2px 8px rgba(0, 0, 0, 0.2);
    background: #1e1e2e;
    color: #cdd6f4;
    font-family: 'Noto Serif JP', 'Noto Sans JP', serif;
    font-size: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    user-select: text;
    -webkit-user-select: text;
  }

  .dict-popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .dict-query {
    font-size: 1rem;
    font-weight: 600;
    opacity: 0.9;
  }

  .dict-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 0.9rem;
    opacity: 0.6;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    line-height: 1;
  }
  .dict-close:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }

  .dict-popup-body {
    overflow-y: auto;
    flex: 1 1 auto;
    overscroll-behavior: contain;
  }

  .dict-empty {
    padding: 1rem 0.75rem;
    text-align: center;
    font-size: 0.85rem;
    opacity: 0.8;
    line-height: 1.6;
  }

  .dict-import-btn {
    display: inline-block;
    margin: 0.5rem auto;
    padding: 0.35rem 1rem;
    background: #89b4fa;
    color: #1e1e2e;
    border: none;
    border-radius: 5px;
    font-size: 0.85rem;
    cursor: pointer;
    font-weight: 600;
  }
  .dict-import-btn:hover {
    background: #b4d0fc;
  }

  .dict-hint {
    font-size: 0.75rem;
    opacity: 0.65;
    margin-top: 0.5rem;
  }

  .dict-hint a {
    color: #89b4fa;
  }
</style>
