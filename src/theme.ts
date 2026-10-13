import { useColorScheme } from 'react-native';

const light = {
  bg: '#F4F7F7',
  card: '#FFFFFF',
  cardAlt: '#EAF4F3',
  text: '#0E1B1A',
  textMuted: '#5C6E6C',
  border: '#E1E9E8',
  primary: '#0FA39B',
  primaryDark: '#0B7A75',
  primarySoft: '#D7F2EF',
  danger: '#E5484D',
  dangerSoft: '#FDE7E8',
  warning: '#F5A524',
  success: '#22A06B',
  overlay: 'rgba(8, 20, 19, 0.55)',
  gradient: ['#13C2B5', '#0B7A75'] as readonly [string, string],
};

const dark: typeof light = {
  bg: '#0A1312',
  card: '#13201F',
  cardAlt: '#182A28',
  text: '#ECF5F4',
  textMuted: '#93A8A6',
  border: '#22332F',
  primary: '#2CD3C6',
  primaryDark: '#14A89D',
  primarySoft: '#123A36',
  danger: '#FF6369',
  dangerSoft: '#3A1A1C',
  warning: '#F5B544',
  success: '#3DD68C',
  overlay: 'rgba(0, 0, 0, 0.65)',
  gradient: ['#1BC7B9', '#0B6E69'] as readonly [string, string],
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { sm: 10, md: 16, lg: 22, xl: 28 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
