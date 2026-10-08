import type { ReactNode } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import { Btn, T } from './ui';

/** Shows a prompt to finish setup until a profile exists. */
export function NeedsSetup({ children }: { children: ReactNode }) {
  const { m } = useStore();
  const c = useColors();
  if (m.prof) return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center', gap: 12 }}>
      <T size={20} weight="600">Set up first</T>
      <T muted>Enter your details to calculate your calorie and macro targets, or import a backup from the web version.</T>
      <Btn title="Go to Setup" kind="primary" onPress={() => router.navigate('/setup')} />
    </View>
  );
}
