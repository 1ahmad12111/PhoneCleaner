import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  onboarded: 'cn.onboarded',
  stats: 'cn.stats',
  quota: 'cn.quota',
};

export type Stats = { bytesFreed: number; itemsCleaned: number; contactsCleaned: number };

const emptyStats: Stats = { bytesFreed: 0, itemsCleaned: 0, contactsCleaned: 0 };

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export async function isOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.onboarded)) === '1';
  } catch {
    return false;
  }
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboarded, '1');
}

export function getStats(): Promise<Stats> {
  return readJSON(KEYS.stats, emptyStats);
}

export async function addStats(delta: Partial<Stats>): Promise<Stats> {
  const s = await getStats();
  const next: Stats = {
    bytesFreed: s.bytesFreed + (delta.bytesFreed ?? 0),
    itemsCleaned: s.itemsCleaned + (delta.itemsCleaned ?? 0),
    contactsCleaned: s.contactsCleaned + (delta.contactsCleaned ?? 0),
  };
  await AsyncStorage.setItem(KEYS.stats, JSON.stringify(next));
  return next;
}

type Quota = { day: string; used: number };

const today = () => new Date().toISOString().slice(0, 10);

/** Number of free deletions already used today. */
export async function getQuotaUsed(): Promise<number> {
  const q = await readJSON<Quota>(KEYS.quota, { day: today(), used: 0 });
  return q.day === today() ? q.used : 0;
}

export async function addQuotaUsed(n: number): Promise<void> {
  const used = await getQuotaUsed();
  await AsyncStorage.setItem(KEYS.quota, JSON.stringify({ day: today(), used: used + n }));
}
