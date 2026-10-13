import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { formatDuration } from '../lib/format';
import type { MediaItem } from '../lib/media';
import { radius, spacing, useColors } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'ghost';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const colors =
    variant === 'danger' ? ([c.danger, '#C2373C'] as const) : variant === 'ghost' ? null : c.gradient;
  const content = (
    <View style={styles.btnInner}>
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? c.primary : '#fff'} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={variant === 'ghost' ? c.primary : '#fff'} />}
          <Text style={[styles.btnText, { color: variant === 'ghost' ? c.primary : '#fff' }]}>{title}</Text>
        </>
      )}
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }, style]}
    >
      {colors ? (
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.btn, { backgroundColor: c.primarySoft }]}>{content}</View>
      )}
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColors();
  const base = [styles.card, { backgroundColor: c.card, borderColor: c.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export function IconBadge({ name, color, size = 44 }: { name: IconName; color: string; size?: number }) {
  return (
    <View style={[styles.iconBadge, { width: size, height: size, borderRadius: size / 3, backgroundColor: color + '22' }]}>
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function StorageRing({ used, total, size = 180, label, sublabel }: { used: number; total: number; size?: number; label: string; sublabel: string }) {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#B9FFF6" />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800' }}>{label}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>{sublabel}</Text>
    </View>
  );
}

export function Thumb({
  item,
  size,
  selected,
  onPress,
  onLongPress,
  badge,
}: {
  item: MediaItem;
  size: number;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  badge?: string;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ width: size, height: size, padding: 2 }}>
      <Image
        source={{ uri: item.uri }}
        style={{ flex: 1, borderRadius: 10, backgroundColor: c.cardAlt }}
        contentFit="cover"
        recyclingKey={item.id}
        transition={120}
      />
      {item.type === 'video' && (
        <View style={styles.duration}>
          <Ionicons name="play" size={10} color="#fff" />
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      )}
      {badge && (
        <View style={[styles.badge, { backgroundColor: c.success }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {selected !== undefined && (
        <View
          style={[
            styles.check,
            selected ? { backgroundColor: c.primary, borderColor: '#fff' } : { backgroundColor: 'rgba(0,0,0,0.25)', borderColor: '#fff' },
          ]}
        >
          {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      )}
      {selected && <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.selectedOverlay, { borderColor: c.primary }]} />}
    </Pressable>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: IconName; title: string; body: string; children?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', padding: spacing.xl, gap: spacing.sm }}>
      <IconBadge name={icon} color={c.primary} size={72} />
      <Text style={{ color: c.text, fontSize: 20, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: c.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 21 }}>{body}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.md, paddingVertical: 16, paddingHorizontal: 20 },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 22 },
  btnText: { fontSize: 17, fontWeight: '700' },
  card: { borderRadius: radius.lg, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth },
  iconBadge: { alignItems: 'center', justifyContent: 'center' },
  duration: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  badge: { position: 'absolute', left: 7, top: 7, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  check: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOverlay: { margin: 2, borderRadius: 10, borderWidth: 3 },
});
