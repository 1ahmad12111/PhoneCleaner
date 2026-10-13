import { Ionicons } from '@expo/vector-icons';
import { Paths } from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, IconBadge, PrimaryButton, StorageRing, type IconName } from '../../components/ui';
import { usePro } from '../../context/ProContext';
import { useScan } from '../../context/ScanContext';
import { formatBytes, plural } from '../../lib/format';
import { CATEGORY_INFO, categoryItems, suggestedItems, sumSize, type CategoryId } from '../../lib/media';
import { radius, spacing, useColors } from '../../theme';

const ORDER: CategoryId[] = ['similar', 'duplicates', 'screenshots', 'videos', 'live'];

function readDisk() {
  try {
    return { total: Paths.totalDiskSpace, free: Paths.availableDiskSpace };
  } catch {
    return { total: 0, free: 0 };
  }
}

export default function Home() {
  const c = useColors();
  const { isPro } = usePro();
  const { permission, result, scanning, progress, scan, stats } = useScan();

  useEffect(() => {
    if (permission?.granted && !result && !scanning) scan();
    // Only auto-scan once permission is first known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  const cleanable = useMemo(
    () => (result ? ORDER.reduce((s, cat) => s + sumSize(suggestedItems(result, cat)), 0) : 0),
    [result],
  );

  // Cheap synchronous native getters; re-read on every render so it reflects deletions.
  const disk = readDisk();
  const used = disk.total - disk.free;
  const pct = disk.total ? Math.round((used / disk.total) * 100) : 0;
  const pctScan = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <LinearGradient colors={['#13C2B5', '#0B7A75']} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.heroTop}>
              <Text style={styles.brand}>Cleaner Neat</Text>
              {!isPro && (
                <Text onPress={() => router.push('/paywall')} style={styles.proPill}>
                  <Ionicons name="diamond" size={12} color="#0B7A75" /> GO PRO
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'center', marginTop: spacing.md }}>
              <StorageRing used={used} total={disk.total} label={`${pct}%`} sublabel="storage used" />
              <Text style={styles.heroLine}>
                {disk.total ? `${formatBytes(used)} of ${formatBytes(disk.total)} used` : 'Storage info unavailable'}
              </Text>
              {scanning ? (
                <Text style={styles.heroSub}>
                  Scanning… {progress.total ? `${pctScan}% · ${progress.done.toLocaleString()} items` : ''}
                </Text>
              ) : result ? (
                <Text style={styles.heroSub}>{formatBytes(cleanable, true)} can be cleaned up</Text>
              ) : (
                <Text style={styles.heroSub}>Tap scan to see what you can free up</Text>
              )}
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={{ padding: spacing.md, gap: spacing.md, marginTop: -28 }}>
          {!result && (
            <Card>
              <PrimaryButton
                title={scanning ? 'Scanning…' : permission?.granted ? 'Scan Photos & Videos' : 'Allow Access & Scan'}
                icon="scan"
                loading={scanning}
                onPress={scan}
              />
              {permission && !permission.granted && (
                <Text style={[styles.note, { color: c.textMuted }]}>
                  Photos are analysed on your device. Nothing is uploaded.
                </Text>
              )}
            </Card>
          )}

          {result && (
            <>
              {ORDER.map((cat) => {
                const info = CATEGORY_INFO[cat];
                const all = categoryItems(result, cat);
                const suggested = suggestedItems(result, cat);
                return (
                  <Card key={cat} onPress={() => router.push({ pathname: '/category/[id]', params: { id: cat } })}>
                    <View style={styles.row}>
                      <IconBadge name={info.icon as IconName} color={c.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: c.text }]}>{info.title}</Text>
                        <Text style={[styles.cardSub, { color: c.textMuted }]}>
                          {all.length ? plural(all.length, 'item') : 'All clean'}
                        </Text>
                      </View>
                      {suggested.length > 0 && (
                        <Text style={[styles.size, { color: c.primary }]}>{formatBytes(sumSize(suggested), true)}</Text>
                      )}
                      <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
                    </View>
                  </Card>
                );
              })}

              <Card onPress={() => router.push('/(tabs)/swipe')} style={{ backgroundColor: c.primarySoft, borderColor: c.primarySoft }}>
                <View style={styles.row}>
                  <IconBadge name="albums" color={c.primaryDark} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: c.text }]}>Swipe Cleaner</Text>
                    <Text style={[styles.cardSub, { color: c.textMuted }]}>Review your camera roll month by month</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
                </View>
              </Card>

              <PrimaryButton title="Rescan" icon="refresh" variant="ghost" onPress={scan} loading={scanning} />
            </>
          )}

          {stats.itemsCleaned > 0 && (
            <Card>
              <Text style={[styles.cardTitle, { color: c.text }]}>Your progress</Text>
              <View style={[styles.row, { marginTop: spacing.sm }]}>
                <Stat label="Space freed" value={formatBytes(stats.bytesFreed, true)} />
                <Stat label="Items cleaned" value={stats.itemsCleaned.toLocaleString()} />
                <Stat label="Contacts fixed" value={stats.contactsCleaned.toLocaleString()} />
              </View>
            </Card>
          )}

          <Text style={[styles.note, { color: c.textMuted }]}>
            Sizes are estimates. Deleted items move to “Recently Deleted” in Photos — empty it to reclaim the space
            immediately.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: c.primary, fontSize: 18, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: 48, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  brand: { color: '#fff', fontSize: 24, fontWeight: '800' },
  proPill: {
    backgroundColor: '#fff',
    color: '#0B7A75',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  heroLine: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: spacing.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardSub: { fontSize: 14, marginTop: 2 },
  size: { fontSize: 15, fontWeight: '700' },
  note: { fontSize: 12, textAlign: 'center', marginTop: spacing.sm, lineHeight: 17, paddingHorizontal: spacing.sm },
});
