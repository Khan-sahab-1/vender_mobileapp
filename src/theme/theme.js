import { Platform } from 'react-native';

export const colors = {
  primary: '#4353F0',
  primaryDark: '#3543D6',
  primaryLight: '#EEF0FD',
  secondary: '#00B894',
  secondarySoft: '#E6FAF5',
  danger: '#E74C3C',
  dangerSoft: '#FFF0F0',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  amber: '#FFB63D',
  amberSoft: '#FFF3DC',
  amberText: '#8A5A00',
  background: '#F4F6FC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8F9FD',
  border: '#E1E5F2',
  borderFocused: '#4353F0',
  text: '#12163A',
  textMuted: '#6B7297',
  textInverted: '#FFFFFF',
  disabled: '#D8DCED',
  comingSoonBg: '#FFF3DC',
  ink: '#12163A',
  inkSoft: '#2A3070',
  onInk: '#FFFFFF',
  onInkMuted: '#AEB4E0',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodyBold: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  captionBold: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  tiny: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
};

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#12163A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#12163A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#4353F0',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 18,
    },
    android: { elevation: 8 },
  }),
};
