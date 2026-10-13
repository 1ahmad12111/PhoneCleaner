import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useColors } from '../../theme';

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Clean', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="swipe"
        options={{ title: 'Swipe', tabBarIcon: ({ color, size }) => <Ionicons name="albums" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="contacts"
        options={{ title: 'Contacts', tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
