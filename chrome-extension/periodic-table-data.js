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
