import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { config } from '../lib/config';
import { addQuotaUsed, getQuotaUsed } from '../lib/storage';

type ProState = {
  isPro: boolean;
  ready: boolean;
  /** False when RevenueCat isn't configured (Expo Go, or no API key yet). */
  purchasesAvailable: boolean;
  packages: PurchasesPackage[];
  freeLeft: number;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  /**
   * Call before deleting `count` items. Returns true if allowed; otherwise opens
   * the paywall and returns false.
   */
  requestDeletes: (count: number) => Promise<boolean>;
  /** Call after a successful deletion so free usage is tracked. */
  recordDeletes: (count: number) => Promise<void>;
};

const ProContext = createContext<ProState | null>(null);

const canUsePurchases =
  !!config.revenueCatKey && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

const hasPro = (info: CustomerInfo) => !!info.entitlements.active[config.entitlementId];

export function ProProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [ready, setReady] = useState(!canUsePurchases);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [used, setUsed] = useState(0);

  useEffect(() => {
    getQuotaUsed().then(setUsed);
    if (!canUsePurchases) return;
    Purchases.configure({ apiKey: config.revenueCatKey! });
    const listener = (info: CustomerInfo) => setIsPro(hasPro(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    (async () => {
      try {
        const [info, offerings] = await Promise.all([Purchases.getCustomerInfo(), Purchases.getOfferings()]);
        setIsPro(hasPro(info));
        setPackages(offerings.current?.availablePackages ?? []);
      } catch (e) {
        console.warn('RevenueCat init failed', e);
      } finally {
        setReady(true);
      }
    })();
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const ok = hasPro(customerInfo);
      setIsPro(ok);
      return ok;
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert('Purchase failed', e?.message ?? 'Please try again.');
      return false;
    }
  }, []);

  const restore = useCallback(async () => {
    if (!canUsePurchases) {
      Alert.alert('Unavailable', 'Purchases are not available in this build.');
      return false;
    }
    try {
      const info = await Purchases.restorePurchases();
      const ok = hasPro(info);
      setIsPro(ok);
      Alert.alert(ok ? 'Restored' : 'Nothing to restore', ok ? 'Cleaner Neat Pro is active again.' : 'No active subscription was found for this Apple ID.');
      return ok;
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Please try again.');
      return false;
    }
  }, []);

  const freeLeft = Math.max(0, config.freeDailyDeleteLimit - used);

  const requestDeletes = useCallback(
    async (count: number) => {
      if (isPro || count <= freeLeft) return true;
      router.push('/paywall');
      return false;
    },
    [isPro, freeLeft],
  );

  const recordDeletes = useCallback(
    async (count: number) => {
      if (isPro) return;
      await addQuotaUsed(count);
      setUsed(await getQuotaUsed());
    },
    [isPro],
  );

  const value = useMemo(
    () => ({
      isPro,
      ready,
      purchasesAvailable: canUsePurchases,
      packages,
      freeLeft,
      purchase,
      restore,
      requestDeletes,
      recordDeletes,
    }),
    [isPro, ready, packages, freeLeft, purchase, restore, requestDeletes, recordDeletes],
  );

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro(): ProState {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside ProProvider');
  return ctx;
}
