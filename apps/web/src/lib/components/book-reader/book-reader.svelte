<script lang="ts">
  import {
    animationFrameScheduler,
    combineLatest,
    debounceTime,
    filter,
    map,
    mergeMap,
    of,
    ReplaySubject,
    share,
    shareReplay,
    startWith,
    Subject,
    tap
  } from 'rxjs';
  import BookReaderContinuous from '$lib/components/book-reader/book-reader-continuous/book-reader-continuous.svelte';
  import { pxReader } from '$lib/components/book-reader/css-classes';
  import type { BooksDbBookmarkData } from '$lib/data/database/books-db/versions/books-db';
  import type { FuriganaStyle } from '$lib/data/furigana-style';
  import { ViewMode } from '$lib/data/view-mode';
  import { iffBrowser } from '$lib/functions/rxjs/iff-browser';
  import { reduceToEmptyString } from '$lib/functions/rxjs/reduce-to-empty-string';
  import { writableSubject } from '$lib/functions/svelte/store';
  import { convertRemToPixels } from '$lib/functions/utils';
  import { logger } from '$lib/data/logger';
  import { imageLoadingState } from './image-loading-state';
  import { reactiveElements } from './reactive-elements';
  import type { AutoScroller, BookmarkManager, PageManager } from './types';
  import BookReaderPaginated from './book-reader-paginated/book-reader-paginated.svelte';
  import {
    dictPopupActivation$,
    dictPopupEnabled$,
    enableReaderWakeLock$,
    enableTapEdgeToFlip$
  } from '$lib/data/store';
  import { onDestroy } from 'svelte';
  import PopupDictionary from '$lib/components/popup/PopupDictionary.svelte';
  import DictionaryImportModal from '$lib/components/popup/DictionaryImportModal.svelte';
  import {
    scanTextAtPoint,
    applyWordHighlight,
    clearWordHighlight
  } from '$lib/japanese/dom-text-scanner';
  import { deinflect } from '$lib/japanese/deinflector';
  import {
    findTerms,
    hasDictionaries,
    type DictionaryTerm
  } from '$lib/dictionary/dictionary-database';
  import { isStringPartiallyJapanese } from '$lib/japanese/japanese-utils';

  export let htmlContent: string;

  export let width: number;

  export let height: number;

  export let verticalMode: boolean;

  export let fontFeatureSettings: string;

  export let verticalTextOrientation: string;

  export let prioritizeReaderStyles: boolean;

  export let enableTextJustification: boolean;

  export let enableTextWrapPretty: boolean;

  export let textIndentation: number;

  export let textMarginValue: number;

  export let fontColor: string;

  export let backgroundColor: string;

  export let hintFuriganaFontColor: string;

  export let hintFuriganaShadowColor: string;

  export let fontFamilyGroupOne: string;

  export let fontFamilyGroupTwo: string;

  export let fontSize: number;

  export let lineHeight: number;

  export let hideSpoilerImage: boolean;

  export let hideFurigana: boolean;

  export let furiganaStyle: FuriganaStyle;

  export let secondDimensionMaxValue: number;

  export let firstDimensionMargin: number;

  export let autoPositionOnResize: boolean;

  export let avoidPageBreak: boolean;

  export let pageColumns: number;

  export let autoBookmark: boolean;

  export let autoBookmarkTime: number;

  export let viewMode: ViewMode;

  export let exploredCharCount: number;

  export let bookCharCount: number;

  export let multiplier: number;

  export let bookmarkData: Promise<BooksDbBookmarkData | undefined>;

  export let autoScroller: AutoScroller | undefined;

  export let bookmarkManager: BookmarkManager | undefined;

  export let pageManager: PageManager | undefined;

  export let isBookmarkScreen: boolean;

  export let customReadingPoint: number;

  export let customReadingPointTop: number;

  export let customReadingPointLeft: number;

  export let customReadingPointScrollOffset: number;

  export let customReadingPointRange: Range | undefined;

  export let showCustomReadingPoint: boolean;

  let showBlurMessage = false;

  let wakeLock: WakeLockSentinel | undefined;

  let visibilityState: DocumentVisibilityState;

  const mutationObserver: MutationObserver = new MutationObserver(handleMutation);

  const width$ = new Subject<number>();

  const height$ = new Subject<number>();

  const containerEl$ = writableSubject<HTMLElement | null>(null);

  let _scanTimer: ReturnType<typeof setTimeout> | null = null;

  $: heightModifer =
    firstDimensionMargin && ViewMode.Paginated === viewMode && !verticalMode
      ? firstDimensionMargin * 2
      : 0;

  $: if ($enableReaderWakeLock$ && visibilityState === 'visible') {
    setTimeout(requestWakeLock, 500);
  }

  onDestroy(() => {
    mutationObserver.disconnect();

    releaseWakeLock();
    if (_scanTimer) clearTimeout(_scanTimer);
    detachViewportListenersForHighlight?.();
  });

  const computedStyle$ = combineLatest([
    containerEl$.pipe(filter((el): el is HTMLElement => !!el)),
    combineLatest([width$, height$]).pipe(startWith(0))
  ]).pipe(
    debounceTime(0, animationFrameScheduler),
    map(([el]) => getComputedStyle(el)),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  const contentEl$ = new ReplaySubject<HTMLElement>(1);

  const contentViewportWidth$ = computedStyle$.pipe(
    map((style) =>
      getAdjustedWidth(
        width -
          parsePx(style.paddingLeft) -
          parsePx(style.paddingRight) -
          ($enableTapEdgeToFlip$ && ViewMode.Paginated === viewMode && !verticalMode
            ? convertRemToPixels(window, 1.75)
            : 0)
      )
    )
  );

  const contentViewportHeight$ = computedStyle$.pipe(
    map((style) =>
      getAdjustedHeight(
        height - parsePx(style.paddingTop) - parsePx(style.paddingBottom) - heightModifer
      )
    )
  );

  const reactiveElements$ = iffBrowser(() => of(document)).pipe(
    mergeMap((document) => {
      const reactiveElementsFn = reactiveElements(
        document,
        furiganaStyle,
        hideSpoilerImage,
        navigator.standalone || window.matchMedia('(display-mode: fullscreen)').matches
      );
      return contentEl$.pipe(mergeMap((contentEl) => reactiveElementsFn(contentEl)));
    }),
    reduceToEmptyString()
  );

  const imageLoadingState$ = contentEl$.pipe(
    mergeMap((contentEl) => imageLoadingState(contentEl)),
    share()
  );

  const blurListener$ = contentEl$.pipe(
    tap((contentEl) => {
      mutationObserver.disconnect();
      mutationObserver.observe(contentEl, { attributes: true });
    }),
    reduceToEmptyString()
  );

  $: width$.next(width);

  $: height$.next(height);

  function getAdjustedWidth(widthValue: number) {
    if (ViewMode.Paginated === viewMode && !verticalMode && secondDimensionMaxValue) {
      return Math.min(secondDimensionMaxValue, widthValue);
    }
    return widthValue;
  }

  function getAdjustedHeight(heightValue: number) {
    if (ViewMode.Paginated === viewMode && verticalMode && secondDimensionMaxValue) {
      return Math.min(secondDimensionMaxValue, heightValue);
    }
    return heightValue;
  }

  function parsePx(px: string) {
    return Number(px.replace(/px$/, ''));
  }

  function handleMutation([mutation]: MutationRecord[]) {
    if (!(mutation.target instanceof HTMLElement)) {
      showBlurMessage = false;
      return;
    }

    showBlurMessage = mutation.target.style.filter.includes('blur');
  }

  async function requestWakeLock() {
    if (wakeLock && !wakeLock.released) {
      return;
    }

    wakeLock = await navigator.wakeLock.request().catch(({ message }) => {
      logger.error(`failed to request wakelock: ${message}`);

      return undefined;
    });

    if (wakeLock) {
      wakeLock.addEventListener('release', releaseWakeLock, false);
    }
  }

  async function releaseWakeLock() {
    if (wakeLock && !wakeLock.released) {
      await wakeLock.release().catch(() => {
        // no-op
      });
    }

    wakeLock = undefined;
  }

  // ---- Built-in dictionary popup ----

  let dictPopupVisible = false;
  let dictPopupQuery = '';
  let dictPopupEntries: DictionaryTerm[] = [];
  let dictPopupAnchorRect: DOMRect | null = null;
  let dictPopupHasDicts = true;
  let showImportModal = false;

  /** Viewport rects for highlight underlay (CSS Highlight is not universal) */
  let dictHighlightRects: { left: number; top: number; width: number; height: number }[] = [];
  let dictHighlightRangeRef: Range | null = null;

  /** Keep highlight aligned when any scroll container moves (continuous window scroll or paginated overflow) */
  let detachViewportListenersForHighlight: (() => void) | null = null;

  function attachViewportListenersForHighlight() {
    detachViewportListenersForHighlight?.();
    const fn = () => refreshHighlightRects();
    document.addEventListener('scroll', fn, true);
    window.addEventListener('resize', fn);
    detachViewportListenersForHighlight = () => {
      document.removeEventListener('scroll', fn, true);
      window.removeEventListener('resize', fn);
      detachViewportListenersForHighlight = null;
    };
  }

  function refreshHighlightRects() {
    if (!dictHighlightRangeRef) {
      dictHighlightRects = [];
      return;
    }
    try {
      dictHighlightRects = Array.from(dictHighlightRangeRef.getClientRects())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ left: r.left, top: r.top, width: r.width, height: r.height }));
    } catch {
      dictHighlightRects = [];
    }
  }

  function applyDomHighlight(range: Range) {
    dictHighlightRangeRef = range.cloneRange();
    refreshHighlightRects();
    applyWordHighlight(range);
    attachViewportListenersForHighlight();
  }

  function clearDomHighlight() {
    dictHighlightRangeRef = null;
    dictHighlightRects = [];
    clearWordHighlight();
    detachViewportListenersForHighlight?.();
  }

  async function handlePointerMove(e: PointerEvent) {
    if (!$dictPopupEnabled$) return;
    if ($dictPopupActivation$ === 'shift' && !e.shiftKey) {
      if (dictPopupVisible) dictPopupVisible = false;
      clearDomHighlight();
      return;
    }
    if (e.pointerType === 'touch') return;

    if (_scanTimer) clearTimeout(_scanTimer);
    _scanTimer = setTimeout(() => runScan(e.clientX, e.clientY), 80);
  }

  async function runScan(x: number, y: number) {
    const scan = scanTextAtPoint(x, y, 32);
    if (!scan || !isStringPartiallyJapanese(scan.text)) {
      if (dictPopupVisible) dictPopupVisible = false;
      clearDomHighlight();
      return;
    }

    const candidates = deinflect(scan.text.slice(0, 16));
    const seen = new Set<string>();
    const allEntries: DictionaryTerm[] = [];

    for (const candidate of candidates) {
      if (seen.has(candidate.text)) continue;
      seen.add(candidate.text);
      const found = await findTerms(candidate.text);
      allEntries.push(...found);
    }

    const hasDicts = await hasDictionaries();
    dictPopupHasDicts = hasDicts;

    const byId = new Map<number, DictionaryTerm>();
    for (const ent of allEntries) byId.set(ent.id!, ent);
    const deduped = [...byId.values()].sort((a, b) => b.score - a.score).slice(0, 20);

    const wordLen = deduped[0]?.expression.length ?? Math.min(16, scan.text.length);
    dictPopupQuery = scan.text.slice(0, wordLen);
    dictPopupEntries = deduped;
    dictPopupAnchorRect = scan.range.getBoundingClientRect();
    dictPopupVisible = true;
    applyDomHighlight(scan.range);
  }

  $: if (!$dictPopupEnabled$) {
    dictPopupVisible = false;
    clearDomHighlight();
  }
</script>

{#if showBlurMessage}
  <div
    class="fixed top-12 right-4 p-2 border max-w-[90vw] z-[1]"
    style:writing-mode="horizontal-tb"
    style:color={fontColor}
    style:background-color={backgroundColor}
    style:border-color={fontColor}
  >
    The reader is currently blurred due to an external application (e. g. exstatic)
  </div>
{/if}
<div bind:this={$containerEl$} class="{pxReader} py-8">
  {#if viewMode === ViewMode.Continuous}
    <BookReaderContinuous
      {htmlContent}
      width={$contentViewportWidth$ ?? 0}
      height={$contentViewportHeight$ ?? 0}
      {verticalMode}
      {fontFeatureSettings}
      {verticalTextOrientation}
      {prioritizeReaderStyles}
      {enableTextJustification}
      {enableTextWrapPretty}
      {fontColor}
      {backgroundColor}
      {hintFuriganaFontColor}
      {hintFuriganaShadowColor}
      {fontFamilyGroupOne}
      {fontFamilyGroupTwo}
      {fontSize}
      {lineHeight}
      {textIndentation}
      {textMarginValue}
      {hideSpoilerImage}
      {hideFurigana}
      {furiganaStyle}
      {secondDimensionMaxValue}
      {firstDimensionMargin}
      {autoPositionOnResize}
      {autoBookmark}
      {autoBookmarkTime}
      {multiplier}
      loadingState={$imageLoadingState$ ?? true}
      bind:exploredCharCount
      bind:bookCharCount
      bind:bookmarkData
      bind:autoScroller
      bind:bookmarkManager
      bind:pageManager
      bind:customReadingPoint
      bind:customReadingPointTop
      bind:customReadingPointLeft
      bind:customReadingPointScrollOffset
      on:contentChange={(ev) => contentEl$.next(ev.detail)}
      on:bookmark
      on:trackerPause
    />
  {:else}
    <BookReaderPaginated
      {htmlContent}
      width={$contentViewportWidth$ ?? 0}
      height={$contentViewportHeight$ ?? 0}
      {verticalMode}
      {fontFeatureSettings}
      {verticalTextOrientation}
      {prioritizeReaderStyles}
      {enableTextJustification}
      {enableTextWrapPretty}
      {fontColor}
      {backgroundColor}
      {hintFuriganaFontColor}
      {hintFuriganaShadowColor}
      {fontFamilyGroupOne}
      {fontFamilyGroupTwo}
      {fontSize}
      {lineHeight}
      {textIndentation}
      {textMarginValue}
      {hideSpoilerImage}
      {hideFurigana}
      {furiganaStyle}
      loadingState={$imageLoadingState$ ?? true}
      {avoidPageBreak}
      {pageColumns}
      {autoBookmark}
      {autoBookmarkTime}
      {firstDimensionMargin}
      bind:exploredCharCount
      bind:bookCharCount
      bind:isBookmarkScreen
      bind:bookmarkData
      bind:bookmarkManager
      bind:pageManager
      bind:customReadingPointRange
      bind:showCustomReadingPoint
      on:contentChange={(ev) => contentEl$.next(ev.detail)}
      on:bookmark
      on:trackerPause
    />
  {/if}
</div>
{$blurListener$ ?? ''}
{$reactiveElements$ ?? ''}
<svelte:document bind:visibilityState />

<svelte:window on:pointermove|capture={handlePointerMove} />

{#each dictHighlightRects as r}
  <div
    class="pointer-events-none fixed z-[9998] rounded-[1px] bg-amber-400/45"
    aria-hidden="true"
    style:left="{r.left}px"
    style:top="{r.top}px"
    style:width="{r.width}px"
    style:height="{r.height}px"
  />
{/each}

<PopupDictionary
  query={dictPopupQuery}
  entries={dictPopupEntries}
  hasDictionaries={dictPopupHasDicts}
  anchorRect={dictPopupAnchorRect}
  visible={dictPopupVisible}
  on:close={() => {
    dictPopupVisible = false;
    clearDomHighlight();
  }}
  on:importRequest={() => {
    dictPopupVisible = false;
    clearDomHighlight();
    showImportModal = true;
  }}
/>

{#if showImportModal}
  <DictionaryImportModal
    on:close={() => (showImportModal = false)}
    on:imported={() => {
      dictPopupHasDicts = true;
      showImportModal = false;
    }}
  />
{/if}

<style>
  /* CSS Custom Highlight API: highlights the scanned word in the reader text */
  :global(::highlight(dict-scan)) {
    background-color: rgba(255, 195, 0, 0.4);
  }
</style>
