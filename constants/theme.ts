import { Platform } from 'react-native';

export const Colors = {
  // Official KaAyos Web Brand Palette (aligned with resources/css/app.css & landing.css)
  primary: '#042C53',        // var(--b9) Deep Navy (KaAyos Brand Primary)
  primaryHover: '#0C447C',   // var(--b8) Medium Navy
  primaryAccent: '#1A6FC4',  // var(--b6) Royal Blue for buttons & action links
  primaryLight: '#E6F1FB',   // var(--b0) Soft Light Blue for chips & icon backgrounds
  primaryBorder: '#B5D4F4',  // var(--b1) Border for highlighted cards

  // Neutrals & Surfaces
  text: '#1B2430',           // var(--g9) Crisp Dark Charcoal
  textSecondary: '#4B5563',  // var(--g6) Medium Gray
  textMuted: '#8C97A4',      // var(--g4) Subtle Gray
  background: '#F7F8FA',     // var(--off) Clean Warm-Off-White background
  surface: '#FFFFFF',        // var(--white) Pure White Surface
  border: '#E8ECF0',         // var(--g1) Border Gray
  cardShadow: 'rgba(4, 44, 83, 0.06)',

  // Brand Accents
  amber: '#f5a623',          // var(--amber) Warm KaAyos Amber
  amberLight: '#fef3cd',     // var(--amber-light)
  star: '#f5a623',           // var(--amber)

  // Status & Utility
  tint: '#042C53',
  icon: '#8C97A4',
  iconActive: '#1A6FC4',
  tabIconDefault: '#8C97A4',
  tabIconSelected: '#042C53',
  success: '#16a34a',        // var(--green)
  successLight: '#d1fae5',   // var(--green-light)
  warning: '#d97706',        // var(--cal-new-dot)
  warningLight: '#fef3c7',   // var(--cal-new-bg)
  error: '#dc2626',          // var(--red)
  errorLight: '#fee2e2',     // var(--red-light)
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
