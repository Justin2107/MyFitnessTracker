import { useColorScheme } from 'react-native';

const light = {
  bg: '#FFFFFF', surface: '#FFFFFF', sunk: '#F2F2F2', ink: '#111111', muted: '#6B6B6B', line: '#E2E2E2',
  accent: '#0B63E5', accentInk: '#FFFFFF', accentSoft: '#EAF1FD',
  good: '#1A7F37', warn: '#C25E00', bad: '#D1242F',
  pro: '#0B63E5', carb: '#1A7F37', fat: '#C25E00',
};
const dark: typeof light = {
  bg: '#000000', surface: '#111111', sunk: '#1E1E1E', ink: '#F2F2F2', muted: '#9A9A9A', line: '#2A2A2A',
  accent: '#4C8DF6', accentInk: '#FFFFFF', accentSoft: '#14233D',
  good: '#3FB950', warn: '#F0883E', bad: '#F85149',
  pro: '#4C8DF6', carb: '#3FB950', fat: '#F0883E',
};
export type Colors = typeof light;
export const useColors = (): Colors => (useColorScheme() === 'dark' ? dark : light);
