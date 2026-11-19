// ==UserScript==
// @name         Gemini Model Periodic Table
// @namespace    https://github.com/BACKSPACEGH/periodic-model-picker
// @version      1.1.0
// @author       Meow
// @description  Select Gemini 4 models (Hydrogen, Carbon, Neon, Argon + Thinking levels) on an interactive 118-element Periodic Table!
// @match        https://gemini.google.com/*
// @downloadURL  https://raw.githubusercontent.com/BACKSPACEGH/periodic-model-picker/main/userscript/gemini-periodic-table.user.js
// @updateURL    https://raw.githubusercontent.com/BACKSPACEGH/periodic-model-picker/main/userscript/gemini-periodic-table.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/**
 * Complete 118-element IUPAC Periodic Table + Gemini 4 & Antigravity Model Mapping.
 * Attaches to `globalThis.GeminiPeriodicTableData` so it runs identically in
 * Chrome Extension content scripts, Userscripts, Antigravity Sidecars, and Node.js.
 */
(function (root) {
  'use strict';

  // Compact tuple: [atomicNumber, symbol, nameEn, nameZh, row, col]
  // Rows 1-7 = Periods 1-7; Row 9 = Lanthanides (Ln); Row 10 = Actinides (An).
  const RAW_ELEMENTS = [
    // Period 1
    [1, 'H', 'Hydrogen', '氢', 1, 1],
    [2, 'He', 'Helium', '氦', 1, 18],

    // Period 2
    [3, 'Li', 'Lithium', '锂', 2, 1],
    [4, 'Be', 'Beryllium', '铍', 2, 2],
    [5, 'B', 'Boron', '硼', 2, 13],
    [6, 'C', 'Carbon', '碳', 2, 14],
    [7, 'N', 'Nitrogen', '氮', 2, 15],
    [8, 'O', 'Oxygen', '氧', 2, 16],
    [9, 'F', 'Fluorine', '氟', 2, 17],
    [10, 'Ne', 'Neon', '氖', 2, 18],

    // Period 3
    [11, 'Na', 'Sodium', '钠', 3, 1],
    [12, 'Mg', 'Magnesium', '镁', 3, 2],
    [13, 'Al', 'Aluminum', '铝', 3, 13],
    [14, 'Si', 'Silicon', '硅', 3, 14],
    [15, 'P', 'Phosphorus', '磷', 3, 15],
    [16, 'S', 'Sulfur', '硫', 3, 16],
    [17, 'Cl', 'Chlorine', '氯', 3, 17],
    [18, 'Ar', 'Argon', '氩', 3, 18],

    // Period 4
    [19, 'K', 'Potassium', '钾', 4, 1],
    [20, 'Ca', 'Calcium', '钙', 4, 2],
    [21, 'Sc', 'Scandium', '钪', 4, 3],
    [22, 'Ti', 'Titanium', '钛', 4, 4],
    [23, 'V', 'Vanadium', '钒', 4, 5],
    [24, 'Cr', 'Chromium', '铬', 4, 6],
    [25, 'Mn', 'Manganese', '锰', 4, 7],
    [26, 'Fe', 'Iron', '铁', 4, 8],
    [27, 'Co', 'Cobalt', '钴', 4, 9],
    [28, 'Ni', 'Nickel', '镍', 4, 10],
    [29, 'Cu', 'Copper', '铜', 4, 11],
    [30, 'Zn', 'Zinc', '锌', 4, 12],
    [31, 'Ga', 'Gallium', '镓', 4, 13],
    [32, 'Ge', 'Germanium', '锗', 4, 14],
    [33, 'As', 'Arsenic', '砷', 4, 15],
    [34, 'Se', 'Selenium', '硒', 4, 16],
    [35, 'Br', 'Bromine', '溴', 4, 17],
    [36, 'Kr', 'Krypton', '氪', 4, 18],

    // Period 5
    [37, 'Rb', 'Rubidium', '铷', 5, 1],
    [38, 'Sr', 'Strontium', '锶', 5, 2],
    [39, 'Y', 'Yttrium', '钇', 5, 3],
    [40, 'Zr', 'Zirconium', '锆', 5, 4],
    [41, 'Nb', 'Niobium', '铌', 5, 5],
    [42, 'Mo', 'Molybdenum', '钼', 5, 6],
    [43, 'Tc', 'Technetium', '锝', 5, 7],
    [44, 'Ru', 'Ruthenium', '钌', 5, 8],
    [45, 'Rh', 'Rhodium', '铑', 5, 9],
    [46, 'Pd', 'Palladium', '钯', 5, 10],
    [47, 'Ag', 'Silver', '银', 5, 11],
    [48, 'Cd', 'Cadmium', '镉', 5, 12],
    [49, 'In', 'Indium', '铟', 5, 13],
    [50, 'Sn', 'Tin', '锡', 5, 14],
    [51, 'Sb', 'Antimony', '锑', 5, 15],
    [52, 'Te', 'Tellurium', '碲', 5, 16],
    [53, 'I', 'Iodine', '碘', 5, 17],
    [54, 'Xe', 'Xenon', '氙', 5, 18],

    // Period 6 (57-71 in Lanthanide row 9)
    [55, 'Cs', 'Cesium', '铯', 6, 1],
    [56, 'Ba', 'Barium', '钡', 6, 2],
    [72, 'Hf', 'Hafnium', '铪', 6, 4],
    [73, 'Ta', 'Tantalum', '钽', 6, 5],
    [74, 'W', 'Tungsten', '钨', 6, 6],
    [75, 'Re', 'Rhenium', '铼', 6, 7],
    [76, 'Os', 'Osmium', '锇', 6, 8],
    [77, 'Ir', 'Iridium', '铱', 6, 9],
    [78, 'Pt', 'Platinum', '铂', 6, 10],
    [79, 'Au', 'Gold', '金', 6, 11],
    [80, 'Hg', 'Mercury', '汞', 6, 12],
    [81, 'Tl', 'Thallium', '铊', 6, 13],
    [82, 'Pb', 'Lead', '铅', 6, 14],
    [83, 'Bi', 'Bismuth', '铋', 6, 15],
    [84, 'Po', 'Polonium', '钋', 6, 16],
    [85, 'At', 'Astatine', '砹', 6, 17],
    [86, 'Rn', 'Radon', '氡', 6, 18],

    // Period 7 (89-103 in Actinide row 10)
    [87, 'Fr', 'Francium', '钫', 7, 1],
    [88, 'Ra', 'Radium', '镭', 7, 2],
    [104, 'Rf', 'Rutherfordium', '𬬻', 7, 4],
    [105, 'Db', 'Dubnium', '𬭊', 7, 5],
    [106, 'Sg', 'Seaborgium', '𬭳', 7, 6],
    [107, 'Bh', 'Bohrium', '𬭛', 7, 7],
    [108, 'Hs', 'Hassium', '𬭶', 7, 8],
    [109, 'Mt', 'Meitnerium', '鿏', 7, 9],
    [110, 'Ds', 'Darmstadtium', '𫟼', 7, 10],
    [111, 'Rg', 'Roentgenium', '𬬭', 7, 11],
    [112, 'Cn', 'Copernicium', '鎶', 7, 12],
    [113, 'Nh', 'Nihonium', '鉨', 7, 13],
    [114, 'Fl', 'Flerovium', '𫓧', 7, 14],
    [115, 'Mc', 'Moscovium', '镆', 7, 15],
    [116, 'Lv', 'Livermorium', '𫟷', 7, 16],
    [117, 'Ts', 'Tennessine', '鿬', 7, 17],
    [118, 'Og', 'Oganesson', '鿫', 7, 18],

    // Lanthanides (Row 9, Cols 4..18)
    [57, 'La', 'Lanthanum', '镧', 9, 4],
    [58, 'Ce', 'Cerium', '铈', 9, 5],
    [59, 'Pr', 'Praseodymium', '镨', 9, 6],
    [60, 'Nd', 'Neodymium', '钕', 9, 7],
    [61, 'Pm', 'Promethium', '钷', 9, 8],
    [62, 'Sm', 'Samarium', '钐', 9, 9],
    [63, 'Eu', 'Europium', '铕', 9, 10],
    [64, 'Gd', 'Gadolinium', '钆', 9, 11],
    [65, 'Tb', 'Terbium', ' terbium/铽'.replace(' terbium/', ''), 9, 12],
    [66, 'Dy', 'Dysprosium', '镝', 9, 13],
    [67, 'Ho', 'Holmium', '钬', 9, 14],
    [68, 'Er', 'Erbium', '铒', 9, 15],
    [69, 'Tm', 'Thulium', '铥', 9, 16],
    [70, 'Yb', 'Ytterbium', '镱', 9, 17],
    [71, 'Lu', 'Lutetium', '镥', 9, 18],

    // Actinides (Row 10, Cols 4..18)
    [89, 'Ac', 'Actinium', '锕', 10, 4],
    [90, 'Th', 'Thorium', ' thorium/钍'.replace(' thorium/', ''), 10, 5],
    [91, 'Pa', 'Protactinium', '镤', 10, 6],
    [92, 'U', 'Uranium', '铀', 10, 7],
    [93, 'Np', 'Neptunium', '镎', 10, 8],
    [94, 'Pu', 'Plutonium', '钚', 10, 9],
    [95, 'Am', 'Americium', '镅', 10, 10],
    [96, 'Cm', 'Curium', '锔', 10, 11],
    [97, 'Bk', 'Berkelium', '锫', 10, 12],
    [98, 'Cf', 'Californium', '锎', 10, 13],
    [99, 'Es', 'Einsteinium', '锿', 10, 14],
    [100, 'Fm', 'Fermium', '镄', 10, 15],
    [101, 'Md', 'Mendelevium', '钔', 10, 16],
    [102, 'No', 'Nobelium', '锘', 10, 17],
    [103, 'Lr', 'Lawrencium', '铹', 10, 18],
  ];

  // Released Gemini 4 Element Models (matching the reference video & Antigravity model IDs)
  const RELEASED_MODELS = {
    H: {
      z: 1,
      symbol: 'H',
      elementName: 'Hydrogen',
      fullName: 'Gemini 4 Hydrogen',
      tagline: 'Everyday help',
      taglineZh: '日常全能助手',
      theme: 'blue',
      colors: {
        tileBg: '#1c3352',
        tileBgHover: '#234067',
        tileBorder: '#4f92ff',
        tileText: '#eef5ff',
        tileNumber: '#8ab8ff',
        dot: '#8ab8ff',
        pillActiveBg: '#25446d',
        pillActiveBorder: '#4f92ff',
        pillActiveText: '#d7e8ff',
      },
      defaultThinking: 'Medium',
      thinkingLevels: ['Low', 'Medium', 'High'],
      antigravityThinkingLevels: ['Low', 'Medium', 'High', 'XHigh'],
      antigravityModelIds: {
        Low: 'gemini-4-hydrogen-low',
        Medium: 'gemini-4-hydrogen-medium',
        High: 'gemini-4-hydrogen-high',
        XHigh: 'gemini-4-hydrogen-xhigh',
      },
      // Keywords used on gemini.google.com to match the closest available native model option
      geminiWebMatchers: ['hydrogen', 'flash', 'fast', 'everyday', '快速', '日常'],
    },
    C: {
      z: 6,
      symbol: 'C',
      elementName: 'Carbon',
      fullName: 'Gemini 4 Carbon',
      tagline: 'Most complex work',
      taglineZh: '深度推理与复杂任务',
      theme: 'purple',
      colors: {
        tileBg: '#332249',
        tileBgHover: '#3f2a5b',
        tileBorder: '#a86af9',
        tileText: '#f6edff',
        tileNumber: '#d2afff',
        dot: '#d2afff',
        pillActiveBg: '#432b63',
        pillActiveBorder: '#a86af9',
        pillActiveText: '#eeddff',
      },
      defaultThinking: 'High',
      thinkingLevels: ['Low', 'Medium', 'High'],
      antigravityThinkingLevels: ['Low', 'Medium', 'High'],
      antigravityModelIds: {
        Low: 'gemini-4-carbon-low',
        Medium: 'gemini-4-carbon-medium',
        High: 'gemini-4-carbon-high',
      },
      geminiWebMatchers: ['carbon', 'pro', 'ultra', 'advanced', 'complex', '高级', '专业'],
    },
    Ne: {
      z: 10,
      symbol: 'Ne',
      elementName: 'Neon',
      fullName: 'Gemini 4 Neon',
      tagline: 'Fast deep reasoning',
      taglineZh: '高速深度推理与代码',
      theme: 'coral',
      colors: {
        tileBg: '#46241b',
        tileBgHover: '#582d22',
        tileBorder: '#fb923c',
        tileText: '#fff4ed',
        tileNumber: '#fdba74',
        dot: '#fdba74',
        pillActiveBg: '#5e2e20',
        pillActiveBorder: '#fb923c',
        pillActiveText: '#ffedd5',
      },
      defaultThinking: 'High',
      thinkingLevels: ['Low', 'Medium', 'High'],
      antigravityThinkingLevels: ['Low', 'Medium', 'High', 'XHigh'],
      antigravityModelIds: {
        Low: 'gemini-4-neon-low',
        Medium: 'gemini-4-neon-medium',
        High: 'gemini-4-neon-high',
        XHigh: 'gemini-4-neon-xhigh',
      },
      geminiWebMatchers: ['neon', 'thinking', 'reasoning', 'pro', 'code', '思考', '推理'],
    },
    Ar: {
      z: 18,
      symbol: 'Ar',
      elementName: 'Argon',
      fullName: 'Gemini 4 Argon',
      tagline: 'Code and analysis',
      taglineZh: '代码工程与逻辑分析',
      theme: 'teal',
      colors: {
        tileBg: '#163b39',
        tileBgHover: '#1c4a47',
        tileBorder: '#2dd4bf',
        tileText: '#e6fffb',
        tileNumber: '#6ee7d8',
        dot: '#6ee7d8',
        pillActiveBg: '#1b4b48',
        pillActiveBorder: '#2dd4bf',
        pillActiveText: '#c5fbf4',
      },
      defaultThinking: 'High',
      thinkingLevels: ['Low', 'Medium', 'High'],
      antigravityThinkingLevels: ['Low', 'Medium', 'High'],
      antigravityModelIds: {
        Low: 'gemini-4-argon-low',
        Medium: 'gemini-4-argon-medium',
        High: 'gemini-4-argon-high',
      },
      geminiWebMatchers: ['argon', 'thinking', 'code', 'reasoning', '思考', '推理'],
    },
  };

  // Bottom-left Legacy / Other models for Gemini Web & Demo (matches video frame_1.5)
  const DEFAULT_OLDER_MODELS_GEMINI = [
    { id: 'gemini-3.1-flash-lite', label: '3.1 Flash-Lite', matchers: ['flash-lite', 'lite', '3.1 flash'] },
    { id: 'gemini-3.1-pro', label: '3.1 Pro', matchers: ['3.1 pro', '2.5 pro', 'pro'] },
  ];

  // Bottom-left Other models available in Antigravity
  const DEFAULT_OTHER_MODELS_ANTIGRAVITY = [
    { id: 'gemini-pro-orchestrator-neon', label: 'Orchestrator (Ne)' },
    { id: 'gemini-pro-orchestrator-g1-pro', label: 'Orchestrator (Ar)' },
    { id: 'gemini-3.8-flash-high', label: '3.8 Flash (High)' },
    { id: 'gemini-3.8-flash-medium', label: '3.8 Flash (Med)' },
    { id: 'claude-sonnet-5-5-medium', label: 'Claude Sonnet 5.5' },
    { id: 'claude-opus-5-5-medium', label: 'Claude Opus 5.5' },
    { id: 'gpt-oss-120b-medium', label: 'GPT-OSS 120B' },
  ];

  const ELEMENTS = RAW_ELEMENTS.map(([z, symbol, name, nameZh, row, col]) => {
    const released = RELEASED_MODELS[symbol] || null;
    return {
      z,
      symbol,
      name,
      nameZh,
      row,
      col,
      released: Boolean(released),
      model: released,
    };
  }).sort((a, b) => a.z - b.z);

  const ELEMENTS_BY_SYMBOL = Object.fromEntries(ELEMENTS.map((el) => [el.symbol, el]));
  const ELEMENTS_BY_Z = Object.fromEntries(ELEMENTS.map((el) => [el.z, el]));

  const API = {
    ELEMENTS,
    ELEMENTS_BY_SYMBOL,
    ELEMENTS_BY_Z,
    RELEASED_MODELS,
    DEFAULT_OLDER_MODELS_GEMINI,
    DEFAULT_OTHER_MODELS_ANTIGRAVITY,
  };

  root.GeminiPeriodicTableData = API;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

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

    .gpt-tile[data-theme="coral"] {
      background: #46241b;
      border: 1.5px solid #fb923c;
      color: #fff4ed;
      box-shadow: 0 0 14px rgba(251, 146, 60, 0.18);
    }
    .gpt-tile[data-theme="coral"]:hover {
      background: #582d22;
      border-color: #fdba74;
    }
    .gpt-tile[data-theme="coral"] .gpt-tile-z {
      color: #fdba74;
    }
    .gpt-tile[data-theme="coral"] .gpt-tile-dot {
      background: #fed7aa;
      box-shadow: 0 0 6px rgba(254, 215, 170, 0.9);
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
    .gpt-pop-badge[data-theme="coral"] {
      background: #46241b;
      border-color: #fb923c;
      color: #fff4ed;
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
    .gpt-thinking-btn.is-active[data-theme="coral"] {
      background: #5e2e20;
      border-color: rgba(251, 146, 60, 0.48);
      color: #ffedd5;
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
          Ne: init.thinkingBySymbol?.Ne || 'High',
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

      // Center Hero ("Gemini 4" + released count / Coming soon)
      const releasedCount = Object.keys(DATA.RELEASED_MODELS).length;
      const hero = document.createElement('div');
      hero.className = 'gpt-hero';
      hero.innerHTML = `
        <div class="gpt-hero-heading">Gemini 4</div>
        <div class="gpt-legend">
          <span class="gpt-legend-item"><span class="gpt-dot-released"></span>${releasedCount} released</span>
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

/**
 * Content script for https://gemini.google.com/*
 * Hooks Gemini's model selector (and/or injects the composer model pill matching the
 * Gemini 4 Periodic Table UI) to open the 118-element Model Periodic Table modal.
 */
(function () {
  'use strict';

  if (window.__geminiPeriodicTableLoaded) return;
  window.__geminiPeriodicTableLoaded = true;

  const STORAGE_KEY = 'gemini_periodic_table_state_v1';
  const ENABLED_KEY = 'gemini_periodic_table_enabled_v1';

  let enabled = true;
  let widget = null;
  let injectedPillBtn = null;
  let hookedNativeBtn = null;
  let bypassNextNativeClick = false;

  // Inject minimal host styles for the composer pill button (when Gemini places its native
  // switcher in the header instead of inside the input bar)
  const hostStyle = document.createElement('style');
  hostStyle.id = 'gpt-gemini-host-style';
  hostStyle.textContent = `
    .gpt-composer-pill {
      appearance: none;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.11);
      color: #e3e3e3;
      border-radius: 999px;
      height: 36px;
      padding: 0 13px;
      margin: 0 4px;
      font-family: 'Google Sans', 'Inter', Roboto, sans-serif;
      font-size: 13.5px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease, border-color 0.15s ease;
      vertical-align: middle;
      z-index: 5;
    }
    .gpt-composer-pill:hover {
      background: rgba(255, 255, 255, 0.11);
      border-color: rgba(255, 255, 255, 0.22);
    }
    .gpt-composer-pill .gpt-pill-coming-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      border: 1.4px solid #9aa0a6;
      display: inline-block;
    }
    .gpt-composer-pill .gpt-pill-chevron {
      width: 12px;
      height: 12px;
      opacity: 0.82;
      transition: transform 0.18s ease;
    }
    .gpt-composer-pill.is-open .gpt-pill-chevron {
      transform: rotate(180deg);
    }
    html.gpt-suppress-cdk-menu .cdk-overlay-container {
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.documentElement.appendChild(hostStyle);

  function loadStorage(keys) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(keys, (res) => resolve(res || {}));
      } else {
        const out = {};
        for (const k of keys) {
          try {
            const raw = localStorage.getItem(k);
            if (raw !== null) out[k] = JSON.parse(raw);
          } catch {}
        }
        resolve(out);
      }
    });
  }

  function saveStorage(obj) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set(obj);
    } else {
      for (const [k, v] of Object.entries(obj)) {
        try {
          localStorage.setItem(k, JSON.stringify(v));
        } catch {}
      }
    }
  }

  function findComposerContainer() {
    return (
      document.querySelector('input-area-v2') ||
      document.querySelector('.input-area-container') ||
      document.querySelector('[data-node-type="input-area"]') ||
      document.querySelector('rich-textarea')?.closest('.text-input-field, form, fieldset, div') ||
      null
    );
  }

  function findNativeModelButton() {
    const selectors = [
      '[data-test-id="bard-mode-menu-button"]',
      'bard-mode-switcher button',
      '.input-area-switch button',
      'button[aria-label*="model" i]',
      'button[aria-label*="mode" i]',
      'button[aria-label*="模型"]',
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn && btn instanceof HTMLElement) return btn;
    }
    return null;
  }

  function getAnchorRect(triggerEl) {
    const composer = findComposerContainer();
    if (composer) {
      return composer.getBoundingClientRect();
    }
    return triggerEl ? triggerEl.getBoundingClientRect() : null;
  }

  function renderTriggerPillContent(sel) {
    if (!injectedPillBtn) return;
    const prefix = sel.comingSoon ? '<span class="gpt-pill-coming-dot"></span>' : '';
    injectedPillBtn.innerHTML = `
      ${prefix}
      <span>${sel.pillLabel}</span>
      <svg class="gpt-pill-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
  }

  function updateNativeButtonLabel(sel) {
    if (!hookedNativeBtn) return;
    // Update visible text span inside Gemini's model switcher if safe to do so
    const labelSpan =
      hookedNativeBtn.querySelector('[data-test-id="logo-pill-label-container"] span') ||
      hookedNativeBtn.querySelector('.mdc-button__label span') ||
      hookedNativeBtn.querySelector('.mat-mdc-button-touch-target')?.previousElementSibling;
    if (labelSpan && labelSpan.children.length === 0) {
      labelSpan.textContent = sel.comingSoon ? `○ ${sel.pillLabel}` : sel.pillLabel;
    }
  }

  /**
   * Programmatically opens Gemini's native Material menu, matches the selected model
   * (Hydrogen -> Hydrogen/Flash/Fast, Carbon -> Carbon/Pro/Advanced, Neon -> Neon/Thinking/Pro, Argon -> Argon/Thinking),
   * clicks the option, and harvests any legacy/other models into the bottom bar.
   */
  async function syncWithNativeGeminiMenu(sel) {
    if (sel.comingSoon) return;
    const nativeBtn = findNativeModelButton();
    if (!nativeBtn) return;

    document.documentElement.classList.add('gpt-suppress-cdk-menu');
    bypassNextNativeClick = true;
    try {
      nativeBtn.click();
      await new Promise((r) => setTimeout(r, 75));

      const menuItems = Array.from(
        document.querySelectorAll(
          '.cdk-overlay-container [role="menuitem"], .cdk-overlay-container [role="menuitemradio"], .cdk-overlay-container button.bard-mode-list-button, .cdk-overlay-container .mat-mdc-menu-item'
        )
      );

      if (menuItems.length > 0) {
        let matchers = [];
        if (sel.type === 'released' && sel.model?.geminiWebMatchers) {
          matchers = sel.model.geminiWebMatchers;
        } else if (sel.type === 'older') {
          matchers = sel.olderModel?.matchers || [sel.label.toLowerCase()];
        }

        let targetItem = null;
        for (const kw of matchers) {
          targetItem = menuItems.find((item) =>
            (item.textContent || '').toLowerCase().includes(kw.toLowerCase())
          );
          if (targetItem) break;
        }

        if (targetItem) {
          targetItem.click();
        } else {
          // Close overlay cleanly via Escape if no match needed
          document.body.click();
        }
      }
    } catch {
      // Ignore DOM variations silently
    } finally {
      setTimeout(() => {
        bypassNextNativeClick = false;
        document.documentElement.classList.remove('gpt-suppress-cdk-menu');
      }, 60);
    }
  }

  function ensureTriggersMounted() {
    if (!enabled || !widget) return;

    const nativeBtn = findNativeModelButton();
    const composer = findComposerContainer();

    // 1. Hook native model button if present (Alt+Click bypasses to native menu)
    if (nativeBtn && nativeBtn !== hookedNativeBtn) {
      hookedNativeBtn = nativeBtn;
      nativeBtn.addEventListener(
        'click',
        (e) => {
          if (!enabled || bypassNextNativeClick || e.altKey || e.shiftKey) return;
          e.preventDefault();
          e.stopPropagation();
          widget.toggle(getAnchorRect(nativeBtn));
        },
        true
      );
      updateNativeButtonLabel(widget.getCurrentSelection());
    }

    // 2. If native button is NOT inside the composer bar, also mount the sleek composer pill
    // right next to the microphone / send buttons (matching the Gemini 4 video UI!)
    const nativeInsideComposer = composer && nativeBtn && composer.contains(nativeBtn);
    if (composer && !nativeInsideComposer) {
      if (!injectedPillBtn || !document.contains(injectedPillBtn)) {
        const micOrSend =
          composer.querySelector('speech-dictation-mic-button') ||
          composer.querySelector('button[aria-label*="mic" i]') ||
          composer.querySelector('button[aria-label*="voice" i]') ||
          composer.querySelector('.mic-button-container') ||
          composer.querySelector('.send-button-container') ||
          composer.querySelector('button[aria-label*="Send" i]');

        if (micOrSend && micOrSend.parentElement) {
          injectedPillBtn = document.createElement('button');
          injectedPillBtn.type = 'button';
          injectedPillBtn.className = 'gpt-composer-pill';
          injectedPillBtn.title = 'Open Model Periodic Table (Alt+P)';
          renderTriggerPillContent(widget.getCurrentSelection());
          injectedPillBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            widget.toggle(getAnchorRect(injectedPillBtn));
          });
          micOrSend.parentElement.insertBefore(injectedPillBtn, micOrSend);
        }
      }
    }
  }

  async function init() {
    const stored = await loadStorage([STORAGE_KEY, ENABLED_KEY]);
    if (stored[ENABLED_KEY] === false) {
      enabled = false;
    }
    const savedState = stored[STORAGE_KEY] || {
      selectedType: 'element',
      selectedSymbol: 'H',
      thinkingBySymbol: { H: 'Medium', C: 'High', Ne: 'High', Ar: 'High' },
    };

    widget = new window.GeminiPeriodicTableWidget.PeriodicTableWidget({
      mode: 'modal',
      platform: 'gemini',
      mountTarget: document.body,
      useShadowDom: true,
      initialState: savedState,
      onSelect: (sel) => {
        renderTriggerPillContent(sel);
        updateNativeButtonLabel(sel);
        saveStorage({
          [STORAGE_KEY]: {
            selectedType: widget.state.selectedType,
            selectedSymbol: widget.state.selectedSymbol,
            olderModelId: widget.state.olderModelId,
            thinkingBySymbol: widget.state.thinkingBySymbol,
          },
        });
        syncWithNativeGeminiMenu(sel);
      },
      onOpenChange: (isOpen) => {
        if (injectedPillBtn) {
          injectedPillBtn.classList.toggle('is-open', isOpen);
        }
      },
    });

    ensureTriggersMounted();

    // Observe SPA route and composer re-renders on gemini.google.com
    const observer = new MutationObserver(() => {
      ensureTriggersMounted();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Reposition modal on window resize
    window.addEventListener('resize', () => {
      if (widget?.state.isOpen) {
        widget.positionModal(getAnchorRect(injectedPillBtn || hookedNativeBtn));
      }
    });

    // Global shortcut Alt+P to toggle Periodic Table on Gemini
    window.addEventListener('keydown', (e) => {
      if (!enabled) return;
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyP') {
        e.preventDefault();
        widget.toggle(getAnchorRect(injectedPillBtn || hookedNativeBtn));
      }
    });

    // Listen to Extension Popup commands
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type === 'GPT_TOGGLE_MODAL') {
          if (enabled && widget) {
            widget.toggle(getAnchorRect(injectedPillBtn || hookedNativeBtn));
          }
          sendResponse({ ok: true });
        } else if (msg?.type === 'GPT_SET_ENABLED') {
          enabled = Boolean(msg.enabled);
          if (!enabled) {
            widget?.close();
            injectedPillBtn?.remove();
            injectedPillBtn = null;
          } else {
            ensureTriggersMounted();
          }
          sendResponse({ ok: true, enabled });
        } else if (msg?.type === 'GPT_GET_STATUS') {
          sendResponse({
            ok: true,
            enabled,
            selection: widget?.getCurrentSelection() || null,
          });
        }
        return true;
      });
    }
  }

  init();
})();
