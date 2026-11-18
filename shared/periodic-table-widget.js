/**
 * Shared Interactive "Model Periodic Table" UI Widget.
 * Supports:
 * - Shadow DOM isolation (for Chrome Extension & Userscript on gemini.google.com)
 * - Floating modal mode (anchored to Gemini's input bar / model button)
 * - Inline / Sidecar mode (for Antigravity Auxiliary Pane & standalone Web Demo)
 */
(function (root) {
  'use strict';

  const DATA = root.GeminiPeriodicTableData;
  if (!DATA) {
    throw new Error('GeminiPeriodicTableData must be loaded before GeminiPeriodicTableWidget.');
  }

  const WIDGET_CSS = `
    :host {
      all: initial;
      font-family: 'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color-scheme: dark;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    .gpt-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2147483640;
      background: transparent;
      display: none;
    }

    .gpt-backdrop.is-open {
      display: block;
    }

    .gpt-modal-anchor {
      position: fixed;
      z-index: 2147483645;
      width: min(95vw, 884px);
      pointer-events: none;
      opacity: 0;
      transform: translateY(8px) scale(0.985);
      transition: opacity 0.18s cubic-bezier(0.2, 0, 0, 1), transform 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .gpt-modal-anchor.is-open {
      pointer-events: auto;
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .gpt-inline-wrap {
      position: relative;
      width: 100%;
      max-width: 884px;
      margin: 0 auto;
    }

    .gpt-surface {
      position: relative;
      background: #1a1b1f;
      border: 1px solid rgba(255, 255, 255, 0.11);
      border-radius: 20px;
      padding: 16px 18px 16px 14px;
      color: #e8eaed;
      box-shadow:
        0 24px 68px rgba(0, 0, 0, 0.72),
        0 4px 18px rgba(0, 0, 0, 0.42),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      user-select: none;
      -webkit-user-select: none;
      font-family: 'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Header */
    .gpt-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2px 12px 6px;
    }

    .gpt-title-group {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .gpt-sparkle {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .gpt-title {
      font-size: 16px;
      font-weight: 500;
      color: #f1f3f4;
      letter-spacing: -0.01em;
      margin: 0;
    }

    .gpt-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .gpt-JumpHint {
      font-size: 11px;
      color: #7b808a;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      opacity: 0;
      transform: translateY(-2px);
      transition: opacity 0.15s ease, transform 0.15s ease;
      pointer-events: none;
    }

    .gpt-JumpHint.is-active {
      opacity: 1;
      transform: translateY(0);
      color: #c6dafc;
      border-color: rgba(82, 148, 255, 0.35);
      background: rgba(82, 148, 255, 0.14);
    }

    .gpt-close-btn {
      appearance: none;
      background: transparent;
      border: none;
      color: #9aa0a6;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
      padding: 0;
    }

    .gpt-close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f1f3f4;
    }

    .gpt-close-btn.is-hidden {
      display: none;
    }

    /* Scroll wrapper for narrow panes */
    .gpt-scroll-x {
      overflow-x: auto;
      overflow-y: visible;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
    }

    /* 19-column periodic grid: col 1 = period label, cols 2..19 = groups 1..18 */
    .gpt-grid {
      display: grid;
      grid-template-columns: 16px repeat(18, minmax(34px, 1fr));
      grid-template-rows: 16px repeat(7, minmax(36px, 42px)) 8px repeat(2, minmax(36px, 42px));
      gap: 4px;
      min-width: 710px;
      align-items: stretch;
    }

    .gpt-col-label {
      font-size: 10px;
      color: #6e737b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
    }

    .gpt-row-label {
      font-size: 10px;
      color: #6e737b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
    }

    .gpt-series-label {
      font-size: 10.5px;
      color: #787d86;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 6px;
      font-weight: 500;
    }

    /* Center Hero Block ("Gemini 4" + Legend) */
    .gpt-hero {
      grid-column: 5 / 14;
      grid-row: 2 / 5;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 0 0 8px 2px;
      pointer-events: none;
    }

    .gpt-hero-heading {
      font-size: 27px;
      font-weight: 500;
      color: #f1f3f4;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin: 0 0 6px 0;
    }

    .gpt-legend {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 11.5px;
      color: #9aa0a6;
    }

    .gpt-legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .gpt-dot-released {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #669df6;
      box-shadow: 0 0 6px rgba(102, 157, 246, 0.7);
    }

    .gpt-dot-coming {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      border: 1.3px solid #80868b;
      background: transparent;
    }

    /* Range cells (57-71, 89-103) */
    .gpt-range-cell {
      border-radius: 7px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      color: #6e737b;
      font-size: 9px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: -0.02em;
    }

    /* Element Tile */
    .gpt-tile {
      position: relative;
      appearance: none;
      background: #23252b;
      border: 1px solid rgba(255, 255, 255, 0.055);
      border-radius: 7px;
      padding: 0;
      margin: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c4c7c5;
      transition:
        background 0.14s ease,
        border-color 0.14s ease,
        transform 0.12s ease,
        box-shadow 0.14s ease;
      outline: none;
    }

    .gpt-tile:hover {
      background: #2c2f37;
      border-color: rgba(255, 255, 255, 0.18);
      color: #f1f3f4;
      z-index: 2;
    }

    .gpt-tile:focus-visible {
      box-shadow: 0 0 0 2px #669df6;
      z-index: 3;
    }

    .gpt-tile:active {
      transform: scale(0.95);
    }

    .gpt-tile-z {
      position: absolute;
      top: 3px;
      left: 4.5px;
      font-size: 8.5px;
      line-height: 1;
      color: #7c818a;
      font-weight: 500;
    }

    .gpt-tile-sym {
      font-size: 13.5px;
      font-weight: 600;
      line-height: 1;
      margin-top: 5px;
      letter-spacing: -0.01em;
    }

    .gpt-tile-dot {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 4.5px;
      height: 4.5px;
      border-radius: 50%;
      background: #d2dae4;
      opacity: 0;
      transform: scale(0.5);
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .gpt-tile.is-selected {
      border-color: rgba(255, 255, 255, 0.42);
      background: #2e313a;
      color: #ffffff;
    }

    .gpt-tile.is-selected .gpt-tile-dot {
      opacity: 1;
      transform: scale(1);
    }

    .gpt-tile.is-key-match {
      box-shadow: 0 0 0 2px #fbbf24;
      z-index: 4;
    }

    /* Released Element Themes: H (blue), C (purple), Ar (teal) */
    .gpt-tile[data-theme="blue"] {
      background: #1c3352;
      border: 1.5px solid #4f92ff;
      color: #eef5ff;
      box-shadow: 0 0 14px rgba(79, 146, 255, 0.16);
    }
    .gpt-tile[data-theme="blue"]:hover {
      background: #234067;
      border-color: #76acff;
    }
    .gpt-tile[data-theme="blue"] .gpt-tile-z {
      color: #8ab8ff;
    }
    .gpt-tile[data-theme="blue"] .gpt-tile-dot {
      background: #9ec5ff;
      box-shadow: 0 0 6px rgba(158, 197, 255, 0.9);
    }

    .gpt-tile[data-theme="purple"] {
      background: #332249;
      border: 1.5px solid #a86af9;
      color: #f6edff;
      box-shadow: 0 0 14px rgba(168, 106, 249, 0.16);
    }
    .gpt-tile[data-theme="purple"]:hover {
      background: #3f2a5b;
      border-color: #bf8dff;
    }
    .gpt-tile[data-theme="purple"] .gpt-tile-z {
      color: #d2afff;
    }
    .gpt-tile[data-theme="purple"] .gpt-tile-dot {
      background: #dbbfff;
      box-shadow: 0 0 6px rgba(219, 191, 255, 0.9);
    }

    .gpt-tile[data-theme="teal"] {
      background: #163b39;
      border: 1.5px solid #2dd4bf;
      color: #e6fffb;
      box-shadow: 0 0 14px rgba(45, 212, 191, 0.16);
    }
    .gpt-tile[data-theme="teal"]:hover {
      background: #1c4a47;
      border-color: #5eead4;
    }
    .gpt-tile[data-theme="teal"] .gpt-tile-z {
      color: #6ee7d8;
    }
    .gpt-tile[data-theme="teal"] .gpt-tile-dot {
      background: #8af8e9;
      box-shadow: 0 0 6px rgba(138, 248, 233, 0.9);
    }

    /* Footer: Older / Other Models */
    .gpt-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
      padding: 8px 4px 0 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .gpt-older-group {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .gpt-older-label {
      font-size: 11.5px;
      color: #80868b;
      margin-right: 4px;
    }

    .gpt-older-chip {
      appearance: none;
      background: #23252b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #bdc1c6;
      font-size: 11.5px;
      font-weight: 500;
      padding: 4px 11px;
      border-radius: 999px;
      cursor: pointer;
      transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
      font-family: inherit;
    }

    .gpt-older-chip:hover {
      background: #2e3139;
      border-color: rgba(255, 255, 255, 0.2);
      color: #f1f3f4;
    }

    .gpt-older-chip.is-selected {
      background: rgba(102, 157, 246, 0.18);
      border-color: #669df6;
      color: #d2e3fc;
    }

    .gpt-status-note {
      font-size: 11px;
      color: #747982;
    }

    /* Floating Popover Card */
    .gpt-popover {
      position: absolute;
      z-index: 30;
      background: #22242a;
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 16px;
      padding: 14px 16px;
      box-shadow:
        0 18px 44px rgba(0, 0, 0, 0.68),
        0 2px 10px rgba(0, 0, 0, 0.45);
      opacity: 0;
      pointer-events: none;
      transform: translateY(6px) scale(0.97);
      transition:
        opacity 0.15s cubic-bezier(0.2, 0, 0, 1),
        transform 0.16s cubic-bezier(0.2, 0, 0, 1),
        left 0.16s cubic-bezier(0.2, 0, 0, 1),
        top 0.16s cubic-bezier(0.2, 0, 0, 1);
      min-width: 196px;
    }

    .gpt-popover.is-open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .gpt-popover.is-released {
      width: 276px;
    }

    .gpt-popover.is-released.has-4-levels {
      width: 304px;
    }

    .gpt-pop-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .gpt-pop-badge {
      position: relative;
      width: 46px;
      height: 46px;
      border-radius: 10px;
      background: #2b2e36;
      border: 1.5px solid rgba(255, 255, 255, 0.14);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #e8eaed;
    }

    .gpt-pop-badge[data-theme="blue"] {
      background: #1c3352;
      border-color: #4f92ff;
      color: #eef5ff;
    }
    .gpt-pop-badge[data-theme="purple"] {
      background: #332249;
      border-color: #a86af9;
      color: #f6edff;
    }
    .gpt-pop-badge[data-theme="teal"] {
      background: #163b39;
      border-color: #2dd4bf;
      color: #e6fffb;
    }

    .gpt-pop-badge-z {
      position: absolute;
      top: 4px;
      left: 6px;
      font-size: 9.5px;
      font-weight: 600;
      opacity: 0.78;
      line-height: 1;
    }

    .gpt-pop-badge-sym {
      font-size: 18px;
      font-weight: 700;
      margin-top: 4px;
      line-height: 1;
    }

    .gpt-pop-meta {
      min-width: 0;
      flex: 1;
    }

    .gpt-pop-name {
      font-size: 15px;
      font-weight: 600;
      color: #f1f3f4;
      line-height: 1.25;
      margin: 0 0 2px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .gpt-pop-sub {
      font-size: 12.5px;
      color: #9aa0a6;
      line-height: 1.25;
      margin: 0;
    }

    .gpt-thinking-wrap {
      margin-top: 13px;
    }

    .gpt-thinking-label {
      font-size: 11.5px;
      color: #9aa0a6;
      margin: 0 0 7px 1px;
      font-weight: 500;
    }

    .gpt-thinking-track {
      display: grid;
      grid-template-columns: repeat(var(--level-count, 3), minmax(0, 1fr));
      background: #1a1c21;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      padding: 3px;
      gap: 2px;
    }

    .gpt-thinking-btn {
      appearance: none;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 999px;
      color: #c4c7c5;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 6px;
      cursor: pointer;
      transition: background 0.14s ease, color 0.14s ease, border-color 0.14s ease;
      font-family: inherit;
      text-align: center;
    }

    .gpt-thinking-btn:hover {
      color: #ffffff;
    }

    .gpt-thinking-btn.is-active[data-theme="blue"] {
      background: #25446d;
      border-color: rgba(79, 146, 255, 0.45);
      color: #d7e8ff;
    }
    .gpt-thinking-btn.is-active[data-theme="purple"] {
      background: #432b63;
      border-color: rgba(168, 106, 249, 0.45);
      color: #eeddff;
    }
    .gpt-thinking-btn.is-active[data-theme="teal"] {
      background: #1b4b48;
      border-color: rgba(45, 212, 191, 0.45);
      color: #c5fbf4;
    }
  `;

  const SPARKLE_SVG = `
    <svg class="gpt-sparkle" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="gptSparkle" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#669df6"/>
          <stop offset="55%" stop-color="#a78bfa"/>
          <stop offset="100%" stop-color="#5eead4"/>
        </linearGradient>
      </defs>
      <path d="M12 2C12.4 7.8 16.2 11.6 22 12C16.2 12.4 12.4 16.2 12 22C11.6 16.2 7.8 12.4 2 12C7.8 11.6 11.6 7.8 12 2Z" fill="url(#gptSparkle)"/>
    </svg>
  `;

  const CLOSE_SVG = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  `;

  class PeriodicTableWidget {
    /**
     * @param {object} options
     * @param {'modal' | 'inline'} [options.mode='modal']
     * @param {'gemini' | 'antigravity'} [options.platform='gemini']
     * @param {HTMLElement} [options.mountTarget]
     * @param {boolean} [options.useShadowDom=true]
     * @param {boolean} [options.showCloseButton=true]
     * @param {string} [options.olderLabel]
     * @param {Array<{id: string, label: string}>} [options.olderModels]
     * @param {object} [options.initialState]
     * @param {(selection: object) => void} [options.onSelect]
     * @param {(isOpen: boolean) => void} [options.onOpenChange]
     */
    constructor(options = {}) {
      this.mode = options.mode || 'modal';
      this.platform = options.platform || 'gemini';
      this.useShadowDom = options.useShadowDom !== false;
      this.showCloseButton = options.showCloseButton !== false;
      this.olderLabel =
        options.olderLabel || (this.platform === 'antigravity' ? 'Other models' : 'Older models');
      this.olderModels =
        options.olderModels ||
        (this.platform === 'antigravity'
          ? DATA.DEFAULT_OTHER_MODELS_ANTIGRAVITY
          : DATA.DEFAULT_OLDER_MODELS_GEMINI);
      this.onSelect = typeof options.onSelect === 'function' ? options.onSelect : () => {};
      this.onOpenChange = typeof options.onOpenChange === 'function' ? options.onOpenChange : () => {};

      const init = options.initialState || {};
      this.state = {
        isOpen: this.mode === 'inline',
        selectedType: init.selectedType || 'element', // 'element' | 'older'
        selectedSymbol: init.selectedSymbol || 'H',
        olderModelId: init.olderModelId || null,
        thinkingBySymbol: {
          H: init.thinkingBySymbol?.H || 'Medium',
          C: init.thinkingBySymbol?.C || 'High',
          Ar: init.thinkingBySymbol?.Ar || 'High',
        },
        activePopoverSymbol: null,
      };

      this.tileElements = new Map();
      this.olderChipElements = new Map();
      this.keyBuffer = '';
      this.keyTimer = null;

      this._mount(options.mountTarget || document.body);
      this._bindGlobalKeys();
      this._syncSelectionStyles();
    }

    _mount(target) {
      this.hostEl = document.createElement('div');
      this.hostEl.className = 'gemini-periodic-table-host';
      target.appendChild(this.hostEl);

      if (this.useShadowDom && this.hostEl.attachShadow) {
        this.root = this.hostEl.attachShadow({ mode: 'open' });
      } else {
        this.root = this.hostEl;
      }

      const styleEl = document.createElement('style');
      styleEl.textContent = WIDGET_CSS;
      this.root.appendChild(styleEl);

      if (this.mode === 'modal') {
        this.backdropEl = document.createElement('div');
        this.backdropEl.className = 'gpt-backdrop';
        this.backdropEl.addEventListener('click', () => this.close());
        this.root.appendChild(this.backdropEl);

        this.wrapperEl = document.createElement('div');
        this.wrapperEl.className = 'gpt-modal-anchor';
        this.root.appendChild(this.wrapperEl);
      } else {
        this.wrapperEl = document.createElement('div');
        this.wrapperEl.className = 'gpt-inline-wrap';
        this.root.appendChild(this.wrapperEl);
      }

      this.surfaceEl = document.createElement('div');
      this.surfaceEl.className = 'gpt-surface';
      this.surfaceEl.setAttribute('role', 'dialog');
      this.surfaceEl.setAttribute('aria-label', 'Model periodic table');
      this.wrapperEl.appendChild(this.surfaceEl);

      this._buildHeader();
      this._buildGrid();
      this._buildFooter();
      this._buildPopover();

      // Clicking empty area inside surface closes open element popover
      this.surfaceEl.addEventListener('click', (e) => {
        const path = e.composedPath();
        const clickedTile = path.some((el) => el?.classList?.contains?.('gpt-tile'));
        const clickedPopover = path.some((el) => el === this.popoverEl);
        if (!clickedTile && !clickedPopover && this.state.activePopoverSymbol) {
          this.closePopover();
        }
      });
    }

    _buildHeader() {
      const header = document.createElement('div');
      header.className = 'gpt-header';
      header.innerHTML = `
        <div class="gpt-title-group">
          ${SPARKLE_SVG}
          <h2 class="gpt-title">Model periodic table</h2>
        </div>
        <div class="gpt-header-actions">
          <span class="gpt-JumpHint"></span>
          <button type="button" class="gpt-close-btn ${this.showCloseButton ? '' : 'is-hidden'}" aria-label="Close periodic table">
            ${CLOSE_SVG}
          </button>
        </div>
      `;
      this.jumpHintEl = header.querySelector('.gpt-JumpHint');
      const closeBtn = header.querySelector('.gpt-close-btn');
      closeBtn.addEventListener('click', () => this.close());
      this.surfaceEl.appendChild(header);
    }

    _buildGrid() {
      const scrollWrap = document.createElement('div');
      scrollWrap.className = 'gpt-scroll-x';

      const grid = document.createElement('div');
      grid.className = 'gpt-grid';
      this.gridEl = grid;

      // Group numbers 1..18 in Row 1 (gridRow = 1, gridColumn = col + 1)
      for (let col = 1; col <= 18; col++) {
        const lbl = document.createElement('div');
        lbl.className = 'gpt-col-label';
        lbl.style.gridRow = '1';
        lbl.style.gridColumn = String(col + 1);
        lbl.textContent = String(col);
        grid.appendChild(lbl);
      }

      // Period numbers 1..7 in Column 1 (gridRow = row + 1, gridColumn = 1)
      for (let row = 1; row <= 7; row++) {
        const lbl = document.createElement('div');
        lbl.className = 'gpt-row-label';
        lbl.style.gridRow = String(row + 1);
        lbl.style.gridColumn = '1';
        lbl.textContent = String(row);
        grid.appendChild(lbl);
      }

      // Center Hero ("Gemini 4" + 3 released / Coming soon)
      const hero = document.createElement('div');
      hero.className = 'gpt-hero';
      hero.innerHTML = `
        <div class="gpt-hero-heading">Gemini 4</div>
        <div class="gpt-legend">
          <span class="gpt-legend-item"><span class="gpt-dot-released"></span>3 released</span>
          <span class="gpt-legend-item"><span class="gpt-dot-coming"></span>Coming soon</span>
        </div>
      `;
      grid.appendChild(hero);

      // Lanthanide & Actinide placeholders in Group 3, Periods 6 & 7
      const lnRange = document.createElement('div');
      lnRange.className = 'gpt-range-cell';
      lnRange.style.gridRow = '7';
      lnRange.style.gridColumn = '4';
      lnRange.textContent = '57–71';
      grid.appendChild(lnRange);

      const anRange = document.createElement('div');
      anRange.className = 'gpt-range-cell';
      anRange.style.gridRow = '8';
      anRange.style.gridColumn = '4';
      anRange.textContent = '89–103';
      grid.appendChild(anRange);

      // Series labels Ln & An in Rows 10 & 11 (since row 9 is 8px spacer)
      const lnLabel = document.createElement('div');
      lnLabel.className = 'gpt-series-label';
      lnLabel.style.gridRow = '10';
      lnLabel.style.gridColumn = '3 / 5';
      lnLabel.textContent = 'Ln';
      grid.appendChild(lnLabel);

      const anLabel = document.createElement('div');
      anLabel.className = 'gpt-series-label';
      anLabel.style.gridRow = '11';
      anLabel.style.gridColumn = '3 / 5';
      anLabel.textContent = 'An';
      grid.appendChild(anLabel);

      // Render all 118 Element Tiles
      for (const el of DATA.ELEMENTS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gpt-tile';
        btn.dataset.symbol = el.symbol;
        btn.dataset.z = String(el.z);
        if (el.model) {
          btn.dataset.theme = el.model.theme;
        }
        // Rows 1..7 -> gridRow 2..8; Row 9 (Ln) -> gridRow 10; Row 10 (An) -> gridRow 11
        const cssRow = el.row <= 7 ? el.row + 1 : el.row + 1;
        btn.style.gridRow = String(cssRow);
        btn.style.gridColumn = String(el.col + 1);
        btn.title = el.model
          ? `${el.model.fullName} — ${el.model.tagline}`
          : `${el.z} ${el.name} (${el.nameZh}) — Coming soon`;
        btn.setAttribute(
          'aria-label',
          el.model ? `${el.model.fullName}, ${el.model.tagline}` : `${el.name}, Coming soon`
        );

        btn.innerHTML = `
          <span class="gpt-tile-z">${el.z}</span>
          <span class="gpt-tile-dot"></span>
          <span class="gpt-tile-sym">${el.symbol}</span>
        `;

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._handleElementClick(el, btn);
        });

        this.tileElements.set(el.symbol, btn);
        grid.appendChild(btn);
      }

      scrollWrap.appendChild(grid);
      this.surfaceEl.appendChild(scrollWrap);
    }

    _buildFooter() {
      this.footerEl = document.createElement('div');
      this.footerEl.className = 'gpt-footer';

      this.olderGroupEl = document.createElement('div');
      this.olderGroupEl.className = 'gpt-older-group';
      this.footerEl.appendChild(this.olderGroupEl);

      this.statusNoteEl = document.createElement('div');
      this.statusNoteEl.className = 'gpt-status-note';
      this.footerEl.appendChild(this.statusNoteEl);

      this.surfaceEl.appendChild(this.footerEl);
      this.setOlderModels(this.olderModels);
    }

    setOlderModels(models) {
      this.olderModels = Array.isArray(models) ? models : [];
      this.olderChipElements.clear();
      this.olderGroupEl.innerHTML = '';

      if (!this.olderModels.length) {
        this.footerEl.style.display = 'none';
        return;
      }
      this.footerEl.style.display = 'flex';

      const lbl = document.createElement('span');
      lbl.className = 'gpt-older-label';
      lbl.textContent = this.olderLabel;
      this.olderGroupEl.appendChild(lbl);

      for (const m of this.olderModels) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'gpt-older-chip';
        chip.textContent = m.label;
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closePopover();
          this.state.selectedType = 'older';
          this.state.olderModelId = m.id;
          this._syncSelectionStyles();
          this._emitSelection();
          if (this.mode === 'modal') {
            this.close();
          }
        });
        this.olderChipElements.set(m.id, chip);
        this.olderGroupEl.appendChild(chip);
      }
      this._syncSelectionStyles();
    }

    _buildPopover() {
      this.popoverEl = document.createElement('div');
      this.popoverEl.className = 'gpt-popover';
      this.surfaceEl.appendChild(this.popoverEl);
    }

    _handleElementClick(el, tileBtn) {
      this.state.selectedType = 'element';
      this.state.selectedSymbol = el.symbol;
      this.state.olderModelId = null;
      this.state.activePopoverSymbol = el.symbol;

      this._syncSelectionStyles();
      this._renderPopover(el, tileBtn);
      this._emitSelection();
    }

    _getThinkingLevelsFor(model) {
      if (this.platform === 'antigravity' && Array.isArray(model.antigravityThinkingLevels)) {
        return model.antigravityThinkingLevels;
      }
      return model.thinkingLevels;
    }

    _renderPopover(el, tileBtn) {
      const model = el.model;
      if (model) {
        const levels = this._getThinkingLevelsFor(model);
        const currentThinking = this.state.thinkingBySymbol[el.symbol] || model.defaultThinking;
        this.popoverEl.className = `gpt-popover is-released ${levels.length >= 4 ? 'has-4-levels' : ''}`;
        this.popoverEl.innerHTML = `
          <div class="gpt-pop-top">
            <div class="gpt-pop-badge" data-theme="${model.theme}">
              <span class="gpt-pop-badge-z">${el.z}</span>
              <span class="gpt-pop-badge-sym">${el.symbol}</span>
            </div>
            <div class="gpt-pop-meta">
              <div class="gpt-pop-name">${model.fullName}</div>
              <div class="gpt-pop-sub">${model.tagline}</div>
            </div>
          </div>
          <div class="gpt-thinking-wrap">
            <div class="gpt-thinking-label">Thinking level</div>
            <div class="gpt-thinking-track" style="--level-count: ${levels.length}">
              ${levels
                .map(
                  (lvl) => `
                <button
                  type="button"
                  class="gpt-thinking-btn ${lvl === currentThinking ? 'is-active' : ''}"
                  data-level="${lvl}"
                  data-theme="${model.theme}"
                >${lvl}</button>
              `
                )
                .join('')}
            </div>
          </div>
        `;

        this.popoverEl.querySelectorAll('.gpt-thinking-btn').forEach((btn) => {
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const level = btn.dataset.level;
            this.state.thinkingBySymbol[el.symbol] = level;
            this.popoverEl.querySelectorAll('.gpt-thinking-btn').forEach((b) => {
              b.classList.toggle('is-active', b.dataset.level === level);
            });
            this._syncSelectionStyles();
            this._emitSelection({ triggeredByThinkingLevel: true });
          });
        });
      } else {
        this.popoverEl.className = 'gpt-popover';
        this.popoverEl.innerHTML = `
          <div class="gpt-pop-top">
            <div class="gpt-pop-badge">
              <span class="gpt-pop-badge-z">${el.z}</span>
              <span class="gpt-pop-badge-sym">${el.symbol}</span>
            </div>
            <div class="gpt-pop-meta">
              <div class="gpt-pop-name">${el.name}</div>
              <div class="gpt-pop-sub">Coming soon</div>
            </div>
          </div>
        `;
      }

      // Position popover relative to surfaceEl, anchored smoothly above/near tileBtn
      requestAnimationFrame(() => {
        this._positionPopover(tileBtn);
        this.popoverEl.classList.add('is-open');
      });
    }

    _positionPopover(tileBtn) {
      if (!tileBtn || !this.surfaceEl) return;
      const surfaceRect = this.surfaceEl.getBoundingClientRect();
      const tileRect = tileBtn.getBoundingClientRect();
      const popWidth = this.popoverEl.offsetWidth || 220;
      const popHeight = this.popoverEl.offsetHeight || 96;

      const tileCenterX = tileRect.left - surfaceRect.left + tileRect.width / 2;
      const tileTopY = tileRect.top - surfaceRect.top;
      const tileBottomY = tileRect.bottom - surfaceRect.top;

      let left = tileCenterX - popWidth / 2;
      const minLeft = -6;
      const maxLeft = surfaceRect.width - popWidth + 6;
      left = Math.max(minLeft, Math.min(maxLeft, left));

      // Prefer placing above the tile (matching the video), unless too close to top of viewport
      let top = tileTopY - popHeight - 10;
      const viewportTopIfAbove = surfaceRect.top + top;
      if (viewportTopIfAbove < 10) {
        top = tileBottomY + 10;
      }

      this.popoverEl.style.left = `${Math.round(left)}px`;
      this.popoverEl.style.top = `${Math.round(top)}px`;
    }

    closePopover() {
      this.state.activePopoverSymbol = null;
      if (this.popoverEl) {
        this.popoverEl.classList.remove('is-open');
      }
    }

    _syncSelectionStyles() {
      const isElement = this.state.selectedType === 'element';
      for (const [sym, btn] of this.tileElements.entries()) {
        btn.classList.toggle('is-selected', isElement && sym === this.state.selectedSymbol);
      }
      for (const [id, chip] of this.olderChipElements.entries()) {
        chip.classList.toggle('is-selected', !isElement && id === this.state.olderModelId);
      }

      const sel = this.getCurrentSelection();
      if (this.statusNoteEl) {
        if (sel.type === 'released') {
          this.statusNoteEl.textContent = `${sel.fullName} · ${sel.thinkingLevel}`;
        } else if (sel.type === 'coming_soon') {
          this.statusNoteEl.textContent = `${sel.element.z} ${sel.element.name} · Coming soon`;
        } else if (sel.type === 'older') {
          this.statusNoteEl.textContent = sel.label;
        }
      }
    }

    getCurrentSelection() {
      if (this.state.selectedType === 'older' && this.state.olderModelId) {
        const older = this.olderModels.find((m) => m.id === this.state.olderModelId) || {
          id: this.state.olderModelId,
          label: this.state.olderModelId,
        };
        return {
          type: 'older',
          id: older.id,
          label: older.label,
          pillLabel: older.label,
          comingSoon: false,
          olderModel: older,
          antigravityModelId: older.id,
        };
      }

      const el = DATA.ELEMENTS_BY_SYMBOL[this.state.selectedSymbol] || DATA.ELEMENTS_BY_SYMBOL.H;
      if (el.model) {
        const thinkingLevel =
          this.state.thinkingBySymbol[el.symbol] || el.model.defaultThinking || 'Medium';
        return {
          type: 'released',
          symbol: el.symbol,
          z: el.z,
          element: el,
          model: el.model,
          fullName: el.model.fullName,
          pillLabel: el.model.elementName,
          thinkingLevel,
          comingSoon: false,
          antigravityModelId:
            el.model.antigravityModelIds[thinkingLevel] ||
            el.model.antigravityModelIds[el.model.defaultThinking],
        };
      }

      return {
        type: 'coming_soon',
        symbol: el.symbol,
        z: el.z,
        element: el,
        fullName: el.name,
        pillLabel: el.name,
        comingSoon: true,
        antigravityModelId: null,
      };
    }

    _emitSelection(extra = {}) {
      this.onSelect({
        ...this.getCurrentSelection(),
        ...extra,
      });
    }

    selectSymbol(symbol, thinkingLevel) {
      const el = DATA.ELEMENTS_BY_SYMBOL[symbol];
      if (!el) return;
      this.state.selectedType = 'element';
      this.state.selectedSymbol = el.symbol;
      if (thinkingLevel && el.model) {
        this.state.thinkingBySymbol[el.symbol] = thinkingLevel;
      }
      this._syncSelectionStyles();
    }

    /**
     * Opens the floating periodic table modal anchored near `anchorRect` (DOMRect).
     */
    open(anchorRect) {
      if (this.mode !== 'modal') return;
      this.state.isOpen = true;
      this.backdropEl.classList.add('is-open');
      this.wrapperEl.classList.add('is-open');
      this.positionModal(anchorRect);
      this.onOpenChange(true);
    }

    positionModal(anchorRect) {
      if (this.mode !== 'modal' || !this.wrapperEl) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const modalWidth = Math.min(vw * 0.95, 884);
      const modalHeight = this.surfaceEl.offsetHeight || 470;

      let left = (vw - modalWidth) / 2;
      if (anchorRect) {
        // Center horizontally near the composer/anchor, clamped safely inside viewport
        const preferredCenter = anchorRect.left + anchorRect.width / 2;
        if (anchorRect.width > 360) {
          left = preferredCenter - modalWidth / 2;
        }
      }
      left = Math.max(12, Math.min(vw - modalWidth - 12, left));

      let top = Math.max(16, (vh - modalHeight) / 2);
      if (anchorRect) {
        const spaceBelow = vh - anchorRect.bottom;
        const spaceAbove = anchorRect.top;
        // Just like the video: if the input bar is in the upper/middle screen, open right below it!
        // If docked at the bottom of a chat thread, open cleanly right above the input bar!
        if (spaceBelow >= modalHeight + 20 || spaceBelow >= spaceAbove) {
          top = Math.min(vh - modalHeight - 12, anchorRect.bottom + 10);
        } else {
          top = Math.max(12, anchorRect.top - modalHeight - 10);
        }
      }

      this.wrapperEl.style.left = `${Math.round(left)}px`;
      this.wrapperEl.style.top = `${Math.round(top)}px`;
    }

    close() {
      this.closePopover();
      if (this.mode !== 'modal') return;
      if (!this.state.isOpen) return;
      this.state.isOpen = false;
      this.backdropEl.classList.remove('is-open');
      this.wrapperEl.classList.remove('is-open');
      this.onOpenChange(false);
    }

    toggle(anchorRect) {
      if (this.state.isOpen) {
        this.close();
      } else {
        this.open(anchorRect);
      }
    }

    _bindGlobalKeys() {
      this._onKeyDown = (e) => {
        if (this.mode === 'modal' && !this.state.isOpen) return;
        // Ignore typing inside input/textarea/contenteditable
        const path = e.composedPath ? e.composedPath() : [e.target];
        const inInput = path.some(
          (node) =>
            node &&
            (node.tagName === 'INPUT' ||
              node.tagName === 'TEXTAREA' ||
              node.isContentEditable)
        );
        if (inInput) return;

        if (e.key === 'Escape') {
          if (this.state.activePopoverSymbol) {
            e.preventDefault();
            this.closePopover();
          } else if (this.mode === 'modal' && this.state.isOpen) {
            e.preventDefault();
            this.close();
          }
          return;
        }

        // Quick chemical symbol jump (e.g., type "Fe", "Ar", "C", "Au")
        if (!e.metaKey && !e.ctrlKey && !e.altKey && /^[a-zA-Z]$/.test(e.key)) {
          clearTimeout(this.keyTimer);
          this.keyBuffer = (this.keyBuffer + e.key).slice(-2);
          const candidate2 =
            this.keyBuffer.charAt(0).toUpperCase() + this.keyBuffer.slice(1).toLowerCase();
          const candidate1 = e.key.toUpperCase();
          const matched =
            DATA.ELEMENTS_BY_SYMBOL[candidate2] || DATA.ELEMENTS_BY_SYMBOL[candidate1];

          if (matched) {
            const tile = this.tileElements.get(matched.symbol);
            this.tileElements.forEach((b) => b.classList.remove('is-key-match'));
            if (tile) {
              tile.classList.add('is-key-match');
              tile.focus({ preventScroll: true });
              if (this.jumpHintEl) {
                this.jumpHintEl.textContent = `${matched.z} ${matched.symbol} · ${matched.name}`;
                this.jumpHintEl.classList.add('is-active');
              }
            }
          }

          this.keyTimer = setTimeout(() => {
            this.keyBuffer = '';
            this.tileElements.forEach((b) => b.classList.remove('is-key-match'));
            if (this.jumpHintEl) {
              this.jumpHintEl.classList.remove('is-active');
            }
          }, 1100);
        }
      };
      window.addEventListener('keydown', this._onKeyDown);
    }

    destroy() {
      window.removeEventListener('keydown', this._onKeyDown);
      this.hostEl?.remove();
    }
  }

  const API = {
    PeriodicTableWidget,
    SPARKLE_SVG,
  };

  root.GeminiPeriodicTableWidget = API;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
