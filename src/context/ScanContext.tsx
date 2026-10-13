import * as MediaLibrary from 'expo-media-library/legacy';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Linking } from 'react-native';

import { usePro } from './ProContext';
import { deleteItems, scanLibrary, sumSize, type MediaItem, type ScanResult } from '../lib/media';
import { addStats, getStats, type Stats } from '../lib/storage';

type ScanState = {
  permission: MediaLibrary.PermissionResponse | null;
  result: ScanResult | null;
  scanning: boolean;
  progress: { done: number; total: number };
  stats: Stats;
  requestPermission: () => Promise<boolean>;
  scan: () => Promise<void>;
  /** Deletes items after checking the free quota. Returns true when deleted. */
  remove: (items: MediaItem[]) => Promise<boolean>;
  refreshStats: () => Promise<void>;
};

const ScanContext = createContext<ScanState | null>(null);

function without(result: ScanResult, ids: Set<string>): ScanResult {
  const keep = (i: MediaItem) => !ids.has(i.id);
  const regroup = (groups: ScanResult['groups']['similar']) =>
    groups
      .map((g) => {
        const items = g.items.filter(keep);
        return { ...g, items, keepId: items.some((i) => i.id === g.keepId) ? g.keepId : items[0]?.id };
      })
      .filter((g) => g.items.length > 1);
  return {
    ...result,
    totalItems: result.totalItems - ids.size,
    photos: result.photos.filter(keep),
    groups: { similar: regroup(result.groups.similar), duplicates: regroup(result.groups.duplicates) },
    lists: {
      screenshots: result.lists.screenshots.filter(keep),
      videos: result.lists.videos.filter(keep),
      live: result.lists.live.filter(keep),
    },
  };
}

export function ScanProvider({ children }: { children: ReactNode }) {
  const { requestDeletes, recordDeletes } = usePro();
  const [permission, setPermission] = useState<MediaLibrary.PermissionResponse | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [stats, setStats] = useState<Stats>({ bytesFreed: 0, itemsCleaned: 0, contactsCleaned: 0 });

  const refreshStats = useCallback(async () => setStats(await getStats()), []);

  useEffect(() => {
    MediaLibrary.getPermissionsAsync().then(setPermission).catch(() => {});
    refreshStats();
  }, [refreshStats]);

  const requestPermission = useCallback(async () => {
    const res = await MediaLibrary.requestPermissionsAsync();
    setPermission(res);
    if (!res.granted && !res.canAskAgain) {
      Alert.alert(
        'Photo access needed',
        'Allow Cleaner Neat to access your photos in Settings to find items you can clean up.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
    return res.granted;
  }, []);

  const scan = useCallback(async () => {
    if (scanning) return;
    let granted = permission?.granted;
    if (!granted) granted = await requestPermission();
    if (!granted) return;
    setScanning(true);
    setProgress({ done: 0, total: 0 });
    try {
      setResult(await scanLibrary((done, total) => setProgress({ done, total })));
    } catch (e: any) {
      Alert.alert('Scan failed', e?.message ?? 'Please try again.');
    } finally {
      setScanning(false);
    }
  }, [scanning, permission, requestPermission]);

  const remove = useCallback(
    async (items: MediaItem[]) => {
      if (!items.length) return false;
      if (!(await requestDeletes(items.length))) return false;
      try {
        const ok = await deleteItems(items.map((i) => i.id));
        if (!ok) return false;
      } catch {
        // The user cancelled the system confirmation dialog.
        return false;
      }
      const ids = new Set(items.map((i) => i.id));
      setResult((r) => (r ? without(r, ids) : r));
      await recordDeletes(items.length);
      setStats(await addStats({ bytesFreed: sumSize(items), itemsCleaned: items.length }));
      return true;
    },
    [requestDeletes, recordDeletes],
  );

  const value = useMemo(
    () => ({ permission, result, scanning, progress, stats, requestPermission, scan, remove, refreshStats }),
    [permission, result, scanning, progress, stats, requestPermission, scan, remove, refreshStats],
  );
  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScan(): ScanState {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used inside ScanProvider');
  return ctx;
}
