/**
 * RESUMESETU SYSTEM TOKENS
 * Corporate Cloud Palette:
 * - Canvas/Cloud: #F7F9FC (RGB 247, 249, 252)
 * - Corporate Navy: #0B2545 (RGB 11, 37, 69)
 * - Corporate Royal Blue: #1D4ED8 (RGB 29, 78, 216)
 * - Slate Steel Blue: #8DA9C4 (RGB 141, 169, 196)
 */
export const tokens = {
  colors: {
    // Exact Corporate Cloud Reference Swatches
    corporateCloud: '#F7F9FC',
    corporateNavy: '#0B2545',
    corporateBlue: '#1D4ED8',
    corporateSteel: '#8DA9C4',

    canvas: '#F7F9FC',
    surface: {
      base: '#FFFFFF',
      muted: '#F0F4F8',
      subtle: '#F7F9FC',
      navy: '#0B2545',
      steelLight: 'rgba(141, 169, 196, 0.12)',
    },
    borders: {
      subtle: 'rgba(141, 169, 196, 0.35)',
      steel: '#8DA9C4',
      strong: '#CBD5E1',
      navy: '#0B2545',
    },
    text: {
      primary: '#0B2545',
      secondary: '#334E68',
      muted: '#627D98',
      light: '#F7F9FC',
    },
    accent: {
      primary: '#0B2545',
      blue: '#1D4ED8',
      royal: '#1D4ED8',
      steel: '#8DA9C4',
      emerald: '#059669',
      amber: '#D97706',
      rose: '#E11D48',
    },
  },
  fonts: {
    display: "'Plus Jakarta Sans', sans-serif",
    body: "'Plus Jakarta Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
} as const;

