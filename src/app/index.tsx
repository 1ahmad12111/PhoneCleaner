import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { isOnboarded } from '../lib/storage';
import { useColors } from '../theme';

export default function Index() {
  const c = useColors();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => {
    isOnboarded().then(setOnboarded);
  }, []);

  if (onboarded === null) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
