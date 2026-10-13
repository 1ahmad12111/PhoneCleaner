import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';

import { PrimaryButton, type IconName } from '../components/ui';
import { usePro } from '../context/ProContext';
import { config } from '../lib/config';
import { spacing } from '../theme';

const FEATURES: { icon: IconName; text: string }[] = [
  { icon: 'infinite', text: 'Unlimited photo, video & contact cleaning' },
  { icon: 'images', text: 'Remove duplicates & similar shots in one tap' },
  { icon: 'videocam', text: 'Find the videos hogging your storage' },
  { icon: 'albums', text: 'Unlimited Swipe Cleaner sessions' },
];

const PERIOD: Partial<Record<PACKAGE_TYPE, string>> = {
  [PACKAGE_TYPE.WEEKLY]: 'week',
  [PACKAGE_TYPE.MONTHLY]: 'month',
  [PACKAGE_TYPE.ANNUAL]: 'year',
  [PACKAGE_TYPE.LIFETIME]: 'lifetime',
};

function trialText(pkg: PurchasesPackage): string | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const unit = intro.periodUnit.toLowerCase();
  return `${intro.periodNumberOfUnits}-${unit} free trial`;
}

function planLabel(pkg: PurchasesPackage): string {
  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return 'Yearly';
  if (pkg.packageType === PACKAGE_TYPE.WEEKLY) return 'Weekly';
  if (pkg.packageType === PACKAGE_TYPE.MONTHLY) return 'Monthly';
  if (pkg.packageType === PACKAGE_TYPE.LIFETIME) return 'Lifetime';
  return pkg.product.title;
}

export default function Paywall() {
  const { packages, purchase, restore, isPro, ready, purchasesAvailable } = usePro();
  const sorted = useMemo(
    () => [...packages].sort((a, b) => (a.packageType === PACKAGE_TYPE.ANNUAL ? -1 : b.packageType === PACKAGE_TYPE.ANNUAL ? 1 : 0)),
    [packages],
  );
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selected && sorted.length) setSelected(sorted[0]);
  }, [sorted, selected]);

  useEffect(() => {
    if (isPro) close();
  }, [isPro]);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  const buy = async () => {
    if (!selected) {
      Alert.alert(
        'Purchases unavailable',
        purchasesAvailable
          ? 'Subscriptions could not be loaded. Check your connection and try again.'
          : 'In-app purchases need a development or App Store build with a RevenueCat key configured.',
      );
      return;
    }
    setBusy(true);
    try {
      await purchase(selected);
    } finally {
      setBusy(false);
    }
  };

  const trial = selected ? trialText(selected) : null;
  const period = selected ? PERIOD[selected.packageType] : undefined;
  const billing = selected
    ? trial
      ? `${trial}, then ${selected.product.priceString}/${period ?? 'period'}. Cancel anytime.`
      : `${selected.product.priceString}${period && period !== 'lifetime' ? `/${period}` : ''}. ${period === 'lifetime' ? 'One-time purchase.' : 'Cancel anytime.'}`
    : '';

  return (
    <LinearGradient colors={['#13C2B5', '#0B7A75', '#06423F']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <Pressable onPress={close} hitSlop={16} accessibilityLabel="Close">
            <Ionicons name="close" size={28} color="rgba(255,255,255,0.9)" />
          </Pressable>
          <Pressable onPress={restore} hitSlop={12}>
            <Text style={styles.restore}>Restore</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <View style={styles.hero}>
            <Ionicons name="diamond" size={56} color="#fff" />
          </View>
          <Text style={styles.title}>Cleaner Neat Pro</Text>
          <Text style={styles.subtitle}>Free up space and keep your phone neat — without limits.</Text>

          <View style={{ gap: 14, marginVertical: spacing.lg }}>
            {FEATURES.map((f) => (
              <View key={f.text} style={styles.feature}>
                <Ionicons name={f.icon} size={22} color="#B9FFF6" />
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          {!ready ? (
            <ActivityIndicator color="#fff" />
          ) : sorted.length ? (
            <View style={{ gap: spacing.sm }}>
              {sorted.map((pkg) => {
                const active = selected?.identifier === pkg.identifier;
                const t = trialText(pkg);
                const p = PERIOD[pkg.packageType];
                const weekly = pkg.packageType === PACKAGE_TYPE.ANNUAL ? pkg.product.pricePerWeekString : null;
                return (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => setSelected(pkg)}
                    style={[styles.plan, { borderColor: active ? '#fff' : 'rgba(255,255,255,0.3)', backgroundColor: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)' }]}
                  >
                    <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color="#fff" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planTitle}>{planLabel(pkg)}</Text>
                      <Text style={styles.planSub}>{t ?? (weekly ? `Just ${weekly}/week` : ' ')}</Text>
                    </View>
                    <Text style={styles.planPrice}>
                      {pkg.product.priceString}
                      {p && p !== 'lifetime' ? <Text style={styles.planPer}>/{p}</Text> : null}
                    </Text>
                    {pkg.packageType === PACKAGE_TYPE.ANNUAL && (
                      <View style={styles.bestBadge}>
                        <Text style={styles.bestText}>BEST VALUE</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.subtitle}>
              {purchasesAvailable ? 'Subscriptions are loading slowly. Please try again in a moment.' : 'Purchases are not available in this build.'}
            </Text>
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <PrimaryButton
            title={trial ? 'Start Free Trial' : 'Continue'}
            onPress={buy}
            loading={busy}
            variant="ghost"
            style={{ backgroundColor: '#fff', borderRadius: 16 }}
          />
          {!!billing && <Text style={styles.billing}>{billing}</Text>}
          <Text style={styles.legal}>
            Payment is charged to your Apple ID account at confirmation of purchase. Subscriptions renew automatically unless
            cancelled at least 24 hours before the end of the current period. Manage or cancel in your App Store account settings.
          </Text>
          <View style={styles.links}>
            <Text style={styles.link} onPress={() => WebBrowser.openBrowserAsync(config.termsUrl)}>
              Terms of Use
            </Text>
            <Text style={styles.link}>·</Text>
            <Text style={styles.link} onPress={() => WebBrowser.openBrowserAsync(config.privacyUrl)}>
              Privacy Policy
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  restore: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 15 },
  hero: {
    alignSelf: 'center',
    width: 110,
    height: 110,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.88)', fontSize: 16, textAlign: 'center', marginTop: 6, lineHeight: 22 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderRadius: 16, padding: 14 },
  planTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  planSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  planPrice: { color: '#fff', fontSize: 17, fontWeight: '800' },
  planPer: { fontSize: 13, fontWeight: '600' },
  bestBadge: { position: 'absolute', top: -10, right: 14, backgroundColor: '#FFD166', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  bestText: { color: '#3D2C00', fontSize: 10, fontWeight: '900' },
  billing: { color: '#fff', textAlign: 'center', fontSize: 14, fontWeight: '700', marginTop: spacing.sm },
  legal: { color: 'rgba(255,255,255,0.65)', fontSize: 10.5, textAlign: 'center', marginTop: 6, lineHeight: 14 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6 },
  link: { color: 'rgba(255,255,255,0.85)', fontSize: 12, textDecorationLine: 'underline' },
});
