import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, type IconName } from '../components/ui';
import { useScan } from '../context/ScanContext';
import { setOnboarded } from '../lib/storage';
import { spacing } from '../theme';

const SLIDES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'sparkles',
    title: 'A neater phone in minutes',
    body: 'Cleaner Neat finds duplicates, similar shots, screenshots and large videos that quietly eat your storage.',
  },
  {
    icon: 'albums',
    title: 'Swipe to declutter',
    body: 'Go through your camera roll month by month. Swipe left to remove, right to keep. It’s oddly satisfying.',
  },
  {
    icon: 'shield-checkmark',
    title: 'Private by design',
    body: 'Everything is analysed on your device. Your photos and contacts never leave your phone.',
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const { requestPermission } = useScan();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const last = index === SLIDES.length - 1;

  const next = async () => {
    if (!last) {
      listRef.current?.scrollToIndex({ index: index + 1 });
      return;
    }
    await requestPermission();
    await setOnboarded();
    router.replace('/(tabs)');
    router.push('/paywall');
  };

  return (
    <LinearGradient colors={['#13C2B5', '#0B7A75', '#07524F']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(s) => s.title}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={84} color="#fff" />
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )}
        />
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <PrimaryButton
            title={last ? 'Allow Photo Access' : 'Continue'}
            icon={last ? 'images' : undefined}
            onPress={next}
            variant="ghost"
            style={{ backgroundColor: '#fff', borderRadius: 16 }}
          />
          {last && (
            <Text style={styles.footnote}>
              We need access to your photo library to find items you can clean. You choose what gets deleted.
            </Text>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  iconWrap: {
    width: 170,
    height: 170,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: spacing.md },
  body: { color: 'rgba(255,255,255,0.9)', fontSize: 17, lineHeight: 24, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 24, backgroundColor: '#fff' },
  footnote: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', marginTop: spacing.md },
});
