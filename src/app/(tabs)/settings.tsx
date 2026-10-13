import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { IconName } from '../../components/ui';
import { usePro } from '../../context/ProContext';
import { useScan } from '../../context/ScanContext';
import { config } from '../../lib/config';
import { formatBytes } from '../../lib/format';
import { radius, spacing, useColors } from '../../theme';

export default function Settings() {
  const c = useColors();
  const { isPro, restore, freeLeft } = usePro();
  const { stats } = useScan();
  const storeUrl = config.appStoreId ? `https://apps.apple.com/app/id${config.appStoreId}` : undefined;

  const rate = async () => {
    if (storeUrl) Linking.openURL(`${storeUrl}?action=write-review`);
    else if (await StoreReview.isAvailableAsync()) StoreReview.requestReview();
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        <Text style={[styles.h1, { color: c.text }]}>Settings</Text>

        {isPro ? (
          <View style={[styles.banner, { backgroundColor: c.primarySoft }]}>
            <Ionicons name="diamond" size={26} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: c.text }]}>Cleaner Neat Pro</Text>
              <Text style={{ color: c.textMuted }}>Unlimited cleaning is active. Thank you!</Text>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => router.push('/paywall')}>
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
              <Ionicons name="diamond" size={26} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: '#fff' }]}>Upgrade to Pro</Text>
                <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                  Unlimited cleaning · {freeLeft} free deletions left today
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}

        <Group title="Stats">
          <Row icon="cloud-done" label="Space freed" value={formatBytes(stats.bytesFreed, true)} />
          <Row icon="images" label="Items cleaned" value={stats.itemsCleaned.toLocaleString()} />
          <Row icon="people" label="Contacts fixed" value={stats.contactsCleaned.toLocaleString()} />
        </Group>

        <Group title="Subscription">
          <Row icon="refresh" label="Restore purchases" onPress={restore} />
          <Row
            icon="card"
            label="Manage subscription"
            onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
          />
        </Group>

        <Group title="Support">
          <Row icon="star" label="Rate Cleaner Neat" onPress={rate} />
          <Row
            icon="share-social"
            label="Share with friends"
            onPress={() =>
              Share.share({ message: `I'm freeing up space with Cleaner Neat${storeUrl ? `: ${storeUrl}` : '!'}` })
            }
          />
          <Row icon="mail" label="Contact support" onPress={() => Linking.openURL(`mailto:${config.supportEmail}`)} />
          <Row icon="shield-checkmark" label="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync(config.privacyUrl)} />
          <Row icon="document-text" label="Terms of Use" onPress={() => WebBrowser.openBrowserAsync(config.termsUrl)} />
        </Group>

        <Text style={[styles.version, { color: c.textMuted }]}>
          {config.appName} {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={[styles.groupTitle, { color: c.textMuted }]}>{title.toUpperCase()}</Text>
      <View style={[styles.group, { backgroundColor: c.card, borderColor: c.border }]}>{children}</View>
    </View>
  );
}

function Row({ icon, label, value, onPress }: { icon: IconName; label: string; value?: string; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={20} color={c.primary} />
      <Text style={[styles.rowLabel, { color: c.text }]}>{label}</Text>
      {value ? (
        <Text style={{ color: c.textMuted, fontWeight: '600' }}>{value}</Text>
      ) : (
        onPress && <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', marginBottom: spacing.md },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg },
  bannerTitle: { fontSize: 18, fontWeight: '800' },
  groupTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginBottom: spacing.sm, marginLeft: spacing.xs },
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: 16 },
  version: { textAlign: 'center', marginTop: spacing.lg, fontSize: 12 },
});
