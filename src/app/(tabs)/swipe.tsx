import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, PrimaryButton, Thumb } from '../../components/ui';
import { useScan } from '../../context/ScanContext';
import { formatBytes, formatMonth, plural } from '../../lib/format';
import { photosByMonth, sumSize, type MediaItem } from '../../lib/media';
import { radius, spacing, useColors } from '../../theme';

type Decision = { item: MediaItem; remove: boolean };

export default function Swipe() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { result, scan, scanning, remove } = useScan();
  const months = useMemo(() => (result ? photosByMonth(result.photos) : []), [result]);
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!monthKey && months.length) setMonthKey(months[0].key);
  }, [months, monthKey]);

  const month = months.find((m) => m.key === monthKey);
  const decided = new Set(decisions.map((d) => d.item.id));
  const queue = month ? month.items.filter((i) => !decided.has(i.id)) : [];
  const current = queue[0];
  const nextUp = queue[1];
  const trash = decisions.filter((d) => d.remove).map((d) => d.item);

  const selectMonth = (key: string) => {
    setMonthKey(key);
    setDecisions([]);
    setReviewing(false);
  };

  const decide = (remove: boolean) => {
    if (!current) return;
    Haptics.selectionAsync().catch(() => {});
    setDecisions((d) => [...d, { item: current, remove }]);
  };

  const undo = () => setDecisions((d) => d.slice(0, -1));

  const confirmDelete = async () => {
    setBusy(true);
    try {
      if (await remove(trash)) {
        setDecisions((d) => d.filter((x) => !x.remove));
        setReviewing(false);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
        <EmptyState icon="albums" title="Swipe Cleaner" body="Scan your library first, then swipe through it month by month.">
          <PrimaryButton title="Scan Now" icon="scan" onPress={scan} loading={scanning} style={{ alignSelf: 'stretch', marginTop: spacing.md }} />
        </EmptyState>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <Text style={[styles.h1, { color: c.text }]}>Swipe Cleaner</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
        {months.map((m) => {
          const active = m.key === monthKey;
          return (
            <Pressable
              key={m.key}
              onPress={() => selectMonth(m.key)}
              style={[styles.chip, { backgroundColor: active ? c.primary : c.card, borderColor: active ? c.primary : c.border }]}
            >
              <Text style={{ color: active ? '#fff' : c.text, fontWeight: '600' }}>{formatMonth(m.key)}</Text>
              <Text style={{ color: active ? 'rgba(255,255,255,0.8)' : c.textMuted, fontSize: 12 }}>{m.items.length}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {reviewing || (!current && trash.length > 0) ? (
        <View style={{ flex: 1 }}>
          <Text style={[styles.reviewTitle, { color: c.text }]}>
            {plural(trash.length, 'photo')} marked for deletion · {formatBytes(sumSize(trash), true)}
          </Text>
          <FlatList
            data={trash}
            numColumns={4}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}
            renderItem={({ item }) => (
              <Thumb
                item={item}
                size={(width - spacing.md * 2) / 4}
                selected
                onPress={() => setDecisions((d) => d.map((x) => (x.item.id === item.id ? { ...x, remove: false } : x)))}
              />
            )}
          />
          <View style={styles.bottomBar}>
            {current && <PrimaryButton title="Keep swiping" variant="ghost" onPress={() => setReviewing(false)} style={{ flex: 1 }} />}
            <PrimaryButton
              title={trash.length ? `Delete ${trash.length}` : 'Nothing to delete'}
              icon="trash"
              variant="danger"
              disabled={!trash.length}
              loading={busy}
              onPress={confirmDelete}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : current ? (
        <View style={{ flex: 1 }}>
          <View style={styles.deck}>
            {nextUp && (
              <View style={[styles.card, styles.behind, { width: width - spacing.lg * 2, backgroundColor: c.cardAlt }]}>
                <Image source={{ uri: nextUp.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </View>
            )}
            <SwipeCard key={current.id} item={current} width={width - spacing.lg * 2} onDecide={decide} />
          </View>
          <Text style={[styles.counter, { color: c.textMuted }]}>
            {month!.items.length - queue.length + 1} / {month!.items.length} · {new Date(current.created).toLocaleDateString()}
          </Text>
          <View style={styles.actions}>
            <RoundButton icon="close" color={c.danger} onPress={() => decide(true)} label="Delete" />
            <RoundButton icon="arrow-undo" color={c.textMuted} onPress={undo} disabled={!decisions.length} small label="Undo" />
            <RoundButton icon="heart" color={c.success} onPress={() => decide(false)} label="Keep" />
          </View>
          {trash.length > 0 && (
            <Pressable onPress={() => setReviewing(true)} style={[styles.trashPill, { backgroundColor: c.dangerSoft }]}>
              <Ionicons name="trash" size={16} color={c.danger} />
              <Text style={{ color: c.danger, fontWeight: '700' }}>
                Review {trash.length} to delete · {formatBytes(sumSize(trash), true)}
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <EmptyState icon="checkmark-circle" title="Month complete" body="You reviewed every photo from this month. Pick another month above." />
      )}
    </SafeAreaView>
  );
}

function SwipeCard({ item, width, onDecide }: { item: MediaItem; width: number; onDecide: (remove: boolean) => void }) {
  const c = useColors();
  const pos = useRef(new Animated.ValueXY()).current;
  const threshold = width * 0.3;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6,
      onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > threshold || Math.abs(g.vx) > 0.8) {
          const dir = g.dx > 0 ? 1 : -1;
          Animated.timing(pos, { toValue: { x: dir * width * 1.6, y: g.dy }, duration: 180, useNativeDriver: false }).start(() =>
            onDecide(dir < 0),
          );
        } else {
          Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
        }
      },
    }),
  ).current;

  const rotate = pos.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-12deg', '0deg', '12deg'] });
  const keepOpacity = pos.x.interpolate({ inputRange: [0, threshold], outputRange: [0, 1], extrapolate: 'clamp' });
  const delOpacity = pos.x.interpolate({ inputRange: [-threshold, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[styles.card, { width, backgroundColor: c.cardAlt, transform: [...pos.getTranslateTransform(), { rotate }] }]}
    >
      <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <Animated.View style={[styles.stamp, styles.stampKeep, { opacity: keepOpacity, borderColor: c.success }]}>
        <Text style={[styles.stampText, { color: c.success }]}>KEEP</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.stampDelete, { opacity: delOpacity, borderColor: c.danger }]}>
        <Text style={[styles.stampText, { color: c.danger }]}>DELETE</Text>
      </Animated.View>
    </Animated.View>
  );
}

function RoundButton({
  icon,
  color,
  onPress,
  disabled,
  small,
  label,
}: {
  icon: 'close' | 'heart' | 'arrow-undo';
  color: string;
  onPress: () => void;
  disabled?: boolean;
  small?: boolean;
  label: string;
}) {
  const c = useColors();
  const s = small ? 52 : 68;
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.round,
        { width: s, height: s, borderRadius: s / 2, backgroundColor: c.card, borderColor: c.border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={s * 0.45} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  chips: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  behind: { transform: [{ scale: 0.95 }], opacity: 0.7 },
  counter: { textAlign: 'center', marginTop: spacing.sm, fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  stamp: { position: 'absolute', top: 40, borderWidth: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  stampKeep: { left: 24, transform: [{ rotate: '-14deg' }] },
  stampDelete: { right: 24, transform: [{ rotate: '14deg' }] },
  stampText: { fontSize: 30, fontWeight: '900', letterSpacing: 2 },
  trashPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  reviewTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  bottomBar: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
});
