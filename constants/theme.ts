import { Platform } from 'react-native';

export const Colors = {
  text: '#0d1b2a',
  textSecondary: '#6b7885',
  textMuted: '#9aaebf',
  background: '#fafbfc',
  surface: '#ffffff',
  tint: '#2b516f',
  icon: '#9aaebf',
  iconActive: '#2b516f',
  tabIconDefault: '#c8d6e0',
  tabIconSelected: '#2b516f',
  border: '#edf2f7',
  primary: '#2b516f',
  primaryLight: '#eef4f8',
  success: '#16a34a',
  successLight: '#f0fdf4',
  warning: '#d97706',
  warningLight: '#fffbeb',
  error: '#dc2626',
  star: '#f59e0b',
  cardShadow: 'rgba(0, 0, 0, 0.04)',
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
