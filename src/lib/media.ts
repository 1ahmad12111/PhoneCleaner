import * as MediaLibrary from 'expo-media-library/legacy';
import { Platform } from 'react-native';

export type MediaItem = {
  id: string;
  uri: string;
  filename: string;
  type: 'photo' | 'video';
  width: number;
  height: number;
  /** Milliseconds since epoch. */
  created: number;
  /** Seconds, videos only. */
  duration: number;
  isScreenshot: boolean;
  isLive: boolean;
  /** Estimated size on disk in bytes (the photo library does not expose exact sizes). */
  size: number;
};

/** A set of related items; `keepId` is the one we suggest keeping. */
export type MediaGroup = { id: string; items: MediaItem[]; keepId: string };

export type CategoryId = 'similar' | 'duplicates' | 'screenshots' | 'videos' | 'live';

export type ScanResult = {
  scannedAt: number;
  totalItems: number;
  photos: MediaItem[];
  groups: Record<'similar' | 'duplicates', MediaGroup[]>;
  lists: Record<'screenshots' | 'videos' | 'live', MediaItem[]>;
};

export const CATEGORY_INFO: Record<
  CategoryId,
  { title: string; subtitle: string; icon: string; grouped: boolean }
> = {
  similar: {
    title: 'Similar Photos',
    subtitle: 'Burst and near-identical shots taken seconds apart',
    icon: 'images',
    grouped: true,
  },
  duplicates: {
    title: 'Duplicates',
    subtitle: 'Exact copies of the same photo',
    icon: 'copy',
    grouped: true,
  },
  screenshots: {
    title: 'Screenshots',
    subtitle: 'Screenshots you probably no longer need',
    icon: 'phone-portrait',
    grouped: false,
  },
  videos: {
    title: 'Large Videos',
    subtitle: 'Your biggest videos, sorted by size',
    icon: 'videocam',
    grouped: false,
  },
  live: {
    title: 'Live Photos',
    subtitle: 'Live Photos take about twice the space of a still',
    icon: 'aperture',
    grouped: false,
  },
};

const SIMILAR_WINDOW_MS = 8_000;
const LARGE_VIDEO_BYTES = 30_000_000;

function estimateSize(a: MediaLibrary.Asset, isScreenshot: boolean, isLive: boolean): number {
  const px = a.width * a.height;
  if (a.mediaType === 'video') {
    const h = Math.min(a.width, a.height);
    // Typical phone bitrates in bytes/second.
    const bps = h >= 2160 ? 5_600_000 : h >= 1080 ? 2_100_000 : h >= 720 ? 1_000_000 : 400_000;
    return Math.round(Math.max(a.duration, 1) * bps);
  }
  const perPixel = isScreenshot ? 0.32 : 0.22;
  return Math.round(px * perPixel + (isLive ? 2_200_000 : 0));
}

function toItem(a: MediaLibrary.Asset): MediaItem {
  const subtypes = a.mediaSubtypes ?? [];
  const isScreenshot =
    subtypes.includes('screenshot') ||
    (Platform.OS === 'android' && /screenshot/i.test(a.filename ?? '')) ||
    /screenshot|screen shot/i.test(a.filename ?? '');
  const isLive = subtypes.includes('livePhoto');
  return {
    id: a.id,
    uri: a.uri,
    filename: a.filename,
    type: a.mediaType === 'video' ? 'video' : 'photo',
    width: a.width,
    height: a.height,
    created: a.creationTime,
    duration: a.duration ?? 0,
    isScreenshot,
    isLive,
    size: estimateSize(a, isScreenshot, isLive),
  };
}

/** Picks the item to keep: highest resolution, then most recent. */
function pickKeeper(items: MediaItem[]): string {
  return items.reduce((best, it) =>
    it.width * it.height > best.width * best.height ||
    (it.width * it.height === best.width * best.height && it.created > best.created)
      ? it
      : best,
  ).id;
}

function findDuplicates(photos: MediaItem[]): MediaGroup[] {
  const buckets = new Map<string, MediaItem[]>();
  for (const p of photos) {
    // Same pixel dimensions and the same capture second is a very strong signal
    // for an exact copy (e.g. a photo saved twice from a chat app).
    const key = `${p.width}x${p.height}@${Math.floor(p.created / 1000)}`;
    const arr = buckets.get(key);
    if (arr) arr.push(p);
    else buckets.set(key, [p]);
  }
  const groups: MediaGroup[] = [];
  for (const [key, items] of buckets) {
    if (items.length > 1) groups.push({ id: `d-${key}`, items, keepId: pickKeeper(items) });
  }
  return groups;
}

function findSimilar(photos: MediaItem[], duplicateIds: Set<string>): MediaGroup[] {
  const sorted = photos
    .filter((p) => !p.isScreenshot && !duplicateIds.has(p.id))
    .sort((a, b) => a.created - b.created);
  const groups: MediaGroup[] = [];
  let current: MediaItem[] = [];
  const flush = () => {
    if (current.length > 1) {
      groups.push({ id: `s-${current[0].id}`, items: current, keepId: pickKeeper(current) });
    }
    current = [];
  };
  for (const p of sorted) {
    const prev = current[current.length - 1];
    const sameOrientation = prev && prev.width > prev.height === p.width > p.height;
    if (prev && sameOrientation && p.created - prev.created <= SIMILAR_WINDOW_MS) {
      current.push(p);
    } else {
      flush();
      current = [p];
    }
  }
  flush();
  return groups.sort((a, b) => b.items[0].created - a.items[0].created);
}

export async function scanLibrary(onProgress?: (done: number, total: number) => void): Promise<ScanResult> {
  const all: MediaItem[] = [];
  let after: string | undefined;
  let total = 0;
  for (;;) {
    const page = await MediaLibrary.getAssetsAsync({
      first: 400,
      after,
      mediaType: ['photo', 'video'],
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
    total = page.totalCount;
    for (const a of page.assets) all.push(toItem(a));
    onProgress?.(all.length, total);
    if (!page.hasNextPage) break;
    after = page.endCursor;
  }

  const photos = all.filter((i) => i.type === 'photo');
  const videos = all.filter((i) => i.type === 'video');
  const duplicates = findDuplicates(photos);
  const duplicateIds = new Set(duplicates.flatMap((g) => g.items.map((i) => i.id)));

  return {
    scannedAt: Date.now(),
    totalItems: all.length,
    photos,
    groups: { duplicates, similar: findSimilar(photos, duplicateIds) },
    lists: {
      screenshots: photos.filter((p) => p.isScreenshot),
      videos: videos.filter((v) => v.size >= LARGE_VIDEO_BYTES).sort((a, b) => b.size - a.size),
      live: photos.filter((p) => p.isLive),
    },
  };
}

/** Items that would be removed if the user accepts our suggestion for a category. */
export function suggestedItems(result: ScanResult, cat: CategoryId): MediaItem[] {
  if (cat === 'similar' || cat === 'duplicates') {
    return result.groups[cat].flatMap((g) => g.items.filter((i) => i.id !== g.keepId));
  }
  return result.lists[cat];
}

export function categoryItems(result: ScanResult, cat: CategoryId): MediaItem[] {
  if (cat === 'similar' || cat === 'duplicates') return result.groups[cat].flatMap((g) => g.items);
  return result.lists[cat];
}

export const sumSize = (items: MediaItem[]) => items.reduce((s, i) => s + i.size, 0);

/**
 * Deletes assets. On iOS the system shows its own confirmation and the items
 * move to "Recently Deleted" for 30 days.
 */
export async function deleteItems(ids: string[]): Promise<boolean> {
  if (!ids.length) return true;
  return MediaLibrary.deleteAssetsAsync(ids);
}

/** Groups photos by "YYYY-MM" for the swipe cleaner, newest month first. */
export function photosByMonth(photos: MediaItem[]): { key: string; items: MediaItem[] }[] {
  const map = new Map<string, MediaItem[]>();
  for (const p of photos) {
    const d = new Date(p.created);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const arr = map.get(key);
    if (arr) arr.push(p);
    else map.set(key, [p]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => ({ key, items: items.sort((a, b) => a.created - b.created) }));
}
