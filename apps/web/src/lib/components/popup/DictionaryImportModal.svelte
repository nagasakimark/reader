<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { importDictionary, DictionaryImportError } from '$lib/dictionary/dictionary-importer';

  const dispatch = createEventDispatcher<{ close: void; imported: string }>();

  let dragging = false;
  let importing = false;
  let errorMessage = '';
  let successMessage = '';
  let progress = { phase: '', done: 0, total: 0, message: '' };
  let fileInputEl: HTMLInputElement;

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragging = true;
  }

  function handleDragLeave() {
    dragging = false;
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) await doImport(file);
  }

  async function handleFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) await doImport(file);
  }

  async function doImport(file: File) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      errorMessage = 'Please select a .zip file (Yomitan dictionary format).';
      return;
    }

    errorMessage = '';
    successMessage = '';
    importing = true;

    try {
      const title = await importDictionary(file, (p) => {
        progress = p;
      });
      successMessage = `"${title}" imported successfully!`;
      dispatch('imported', title);
    } catch (err) {
      if (err instanceof DictionaryImportError) {
        errorMessage = err.message;
      } else {
        errorMessage = `Import failed: ${(err as Error).message}`;
      }
    } finally {
      importing = false;
    }
  }

  $: progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
</script>

<!-- Backdrop -->
<div
  class="modal-backdrop"
  role="presentation"
  on:click={() => !importing && dispatch('close')}
  on:keydown={() => {}}
/>

<div class="modal" role="dialog" aria-modal="true" aria-label="Import dictionary">
  <div class="modal-header">
    <h2>Import Dictionary</h2>
    {#if !importing}
      <button class="modal-close" on:click={() => dispatch('close')} aria-label="Close">✕</button>
    {/if}
  </div>

  <div class="modal-body">
    {#if !importing && !successMessage}
      <!-- Drop zone -->
      <div
        class="drop-zone"
        class:dragging
        role="button"
        tabindex="0"
        on:dragover={handleDragOver}
        on:dragleave={handleDragLeave}
        on:drop={handleDrop}
        on:click={() => fileInputEl.click()}
        on:keydown={(e) => e.key === 'Enter' && fileInputEl.click()}
      >
        <div class="drop-icon">📚</div>
        <p class="drop-title">Drop a Yomitan dictionary ZIP here</p>
        <p class="drop-sub">or click to browse</p>
        <input
          bind:this={fileInputEl}
          type="file"
          accept=".zip"
          class="file-input"
          on:change={handleFileInput}
        />
      </div>

      {#if errorMessage}
        <p class="error-msg">{errorMessage}</p>
      {/if}

      <div class="hint">
        <strong>Where to get free dictionaries:</strong><br />
        Download a Yomitan-format .zip from
        <a
          href="https://github.com/themoeway/jmdict-yomitan/releases"
          target="_blank"
          rel="noopener noreferrer">github.com/themoeway/jmdict-yomitan</a
        >
        (JMdict English) — free, CC BY-SA.
      </div>
    {:else if importing}
      <div class="progress-wrap">
        <p class="progress-msg">{progress.message || 'Importing…'}</p>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style:width="{progressPct}%" />
        </div>
        <p class="progress-pct">{progressPct}%</p>
      </div>
    {:else if successMessage}
      <div class="success-wrap">
        <div class="success-icon">✅</div>
        <p>{successMessage}</p>
        <button class="btn-primary" on:click={() => dispatch('close')}>Done</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 10000;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10001;
    width: min(480px, 92vw);
    background: #1e1e2e;
    color: #cdd6f4;
    border-radius: 10px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-family: system-ui, sans-serif;
    writing-mode: horizontal-tb;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .modal-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.6;
    font-size: 1rem;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
  }
  .modal-close:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }

  .modal-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .drop-zone {
    border: 2px dashed rgba(137, 180, 250, 0.4);
    border-radius: 8px;
    padding: 2rem 1rem;
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .drop-zone:hover,
  .drop-zone.dragging {
    border-color: #89b4fa;
    background: rgba(137, 180, 250, 0.06);
  }

  .drop-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .drop-title {
    margin: 0 0 0.25rem;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .drop-sub {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.6;
  }

  .file-input {
    display: none;
  }

  .hint {
    font-size: 0.78rem;
    opacity: 0.65;
    line-height: 1.5;
  }

  .hint a {
    color: #89b4fa;
  }

  .error-msg {
    color: #f38ba8;
    font-size: 0.85rem;
    margin: 0;
  }

  .progress-wrap {
    text-align: center;
    padding: 1rem 0;
  }

  .progress-msg {
    font-size: 0.85rem;
    margin: 0 0 0.75rem;
    opacity: 0.85;
  }

  .progress-bar-bg {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    height: 8px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: #89b4fa;
    transition: width 0.2s;
    border-radius: 4px;
  }

  .progress-pct {
    font-size: 0.8rem;
    opacity: 0.7;
    margin: 0.4rem 0 0;
  }

  .success-wrap {
    text-align: center;
    padding: 0.5rem 0;
  }

  .success-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .success-wrap p {
    margin: 0 0 1rem;
    font-size: 0.95rem;
  }

  .btn-primary {
    padding: 0.45rem 1.5rem;
    background: #89b4fa;
    color: #1e1e2e;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-primary:hover {
    background: #b4d0fc;
  }
</style>
