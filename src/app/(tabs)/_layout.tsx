import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useColors } from '@/lib/theme';

type Icon = ComponentProps<typeof Ionicons>['name'];
const TABS: [string, string, Icon][] = [
  ['index', 'Today', 'today-outline'],
  ['food', 'Food', 'restaurant-outline'],
  ['training', 'Training', 'barbell-outline'],
  ['body', 'Body', 'body-outline'],
  ['trends', 'Trends', 'trending-up-outline'],
  ['setup', 'Setup', 'settings-outline'],
];

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.ink,
        headerShadowVisible: false,
      }}>
      {TABS.map(([name, title, icon]) => (
        <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={color} /> }} />
      ))}
    </Tabs>
  );
}
