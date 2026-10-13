import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, PrimaryButton, Thumb } from '../../components/ui';
import { usePro } from '../../context/ProContext';
import { useScan } from '../../context/ScanContext';
import { formatBytes, plural } from '../../lib/format';
import { CATEGORY_INFO, categoryItems, suggestedItems, sumSize, type CategoryId, type MediaGroup, type MediaItem } from '../../lib/media';
import { spacing, useColors } from '../../theme';

const COLS = 3;

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: CategoryId }>();
  const cat: CategoryId = id && id in CATEGORY_INFO ? id : 'similar';
  const info = CATEGORY_INFO[cat];
  const c = useColors();
  const { width } = useWindowDimensions();
  const { result, remove } = useScan();
  const { isPro, freeLeft } = usePro();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => (result ? categoryItems(result, cat) : []), [result, cat]);
  const groups: MediaGroup[] = result && info.grouped ? result.groups[cat as 'similar' | 'duplicates'] : [];

  // Pre-select our suggestion whenever the data changes.
  useEffect(() => {
    if (result) setSelected(new Set(suggestedItems(result, cat).map((i) => i.id)));
  }, [result, cat]);

  const selectedItems = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected]);
  const size = Math.floor((width - spacing.md * 2) / COLS);

  const toggle = (item: MediaItem) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(item.id)) n.delete(item.id);
      else n.add(item.id);
      return n;
    });

  const allSelected = selectedItems.length === items.length && items.length > 0;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));

  const onDelete = async () => {
    if (info.grouped) {
      const wipesGroup = groups.some((g) => g.items.every((i) => selected.has(i.id)));
      if (wipesGroup) {
        const proceed = await new Promise<boolean>((resolve) =>
          Alert.alert('Delete every copy?', 'In some groups you selected every photo, so none will be kept.', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ]),
        );
        if (!proceed) return;
      }
    }
    setBusy(true);
    try {
      await remove(selectedItems);
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
      <Text style={[styles.subtitle, { color: c.textMuted }]}>{info.subtitle}</Text>
      {items.length > 0 && (
        <View style={styles.headerRow}>
          <Text style={{ color: c.text, fontWeight: '600' }}>
            {plural(items.length, 'item')} · {formatBytes(sumSize(items), true)}
          </Text>
          <Pressable onPress={toggleAll} hitSlop={10}>
            <Text style={{ color: c.primary, fontWeight: '700' }}>{allSelected ? 'Deselect all' : 'Select all'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: info.title }} />
      {!result || items.length === 0 ? (
        <EmptyState icon="checkmark-done" title="All neat here" body={`No ${info.title.toLowerCase()} to clean up right now.`} />
      ) : info.grouped ? (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item: g }) => (
            <View style={[styles.group, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.groupTitle, { color: c.textMuted }]}>
                {new Date(g.items[0].created).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
                {plural(g.items.length, 'photo')}
              </Text>
              <View style={styles.wrap}>
                {g.items.map((it) => (
                  <Thumb
                    key={it.id}
                    item={it}
                    size={(width - spacing.md * 2 - spacing.sm * 2) / COLS}
                    selected={selected.has(it.id)}
                    badge={it.id === g.keepId ? 'BEST' : undefined}
                    onPress={() => toggle(it)}
                  />
                ))}
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={items}
          numColumns={COLS}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={header}
          columnWrapperStyle={{ paddingHorizontal: spacing.md }}
          contentContainerStyle={{ paddingBottom: 120 }}
          initialNumToRender={24}
          windowSize={7}
          renderItem={({ item }) => (
            <Thumb item={item} size={size} selected={selected.has(item.id)} onPress={() => toggle(item)} />
          )}
        />
      )}

      {items.length > 0 && (
        <SafeAreaView edges={['bottom']} style={[styles.bottom, { backgroundColor: c.card, borderTopColor: c.border }]}>
          {!isPro && (
            <Text style={[styles.quota, { color: c.textMuted }]}>
              {freeLeft > 0 ? `${freeLeft} free deletions left today` : 'Daily free limit reached — upgrade for unlimited'}
            </Text>
          )}
          <PrimaryButton
            title={
              selectedItems.length
                ? `Delete ${plural(selectedItems.length, 'item')} · ${formatBytes(sumSize(selectedItems), true)}`
                : 'Select items to delete'
            }
            icon="trash"
            variant="danger"
            disabled={!selectedItems.length}
            loading={busy}
            onPress={onDelete}
          />
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 15, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  group: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 18,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  groupTitle: { fontSize: 13, fontWeight: '600', margin: spacing.xs, marginBottom: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quota: { fontSize: 12, textAlign: 'center', marginBottom: spacing.sm },
});
