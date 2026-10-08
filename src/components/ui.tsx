// Small set of plain UI pieces used by every screen.
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addD, diffD, fmtD, todayS } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export function Screen({ children, dateBar = true }: { children: ReactNode; dateBar?: boolean }) {
  const c = useColors();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {dateBar && <DateBar />}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function DateBar() {
  const c = useColors();
  const { date, setDate } = useStore();
  const t = todayS();
  const rel = date === t ? 'Today' : date === addD(t, -1) ? 'Yesterday' : `${diffD(date, t)} days ago`;
  const btn: ViewStyle = { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable style={btn} onPress={() => setDate(addD(date, -1))} accessibilityLabel="Previous day">
        <Ionicons name="chevron-back" size={20} color={c.ink} />
      </Pressable>
      <Pressable onPress={() => setDate(t)} style={{ alignItems: 'center' }} accessibilityLabel="Go to today">
        <Text style={{ fontSize: 17, fontWeight: '600', color: c.ink }}>{fmtD(date)}</Text>
        <Text style={{ fontSize: 13, color: c.muted }}>{rel}{date !== t ? ' · tap for today' : ''}</Text>
      </Pressable>
      <Pressable style={[btn, date >= t && { opacity: 0.3 }]} disabled={date >= t} onPress={() => setDate(addD(date, 1))} accessibilityLabel="Next day">
        <Ionicons name="chevron-forward" size={20} color={c.ink} />
      </Pressable>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 14, gap: 10 }, style]}>{children}</View>;
}

export function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink, flexShrink: 1 }}>{children}</Text>
      {right}
    </View>
  );
}

export function T({ children, muted, size = 15, weight, style, numberOfLines }: { children: ReactNode; muted?: boolean; size?: number; weight?: TextStyle['fontWeight']; style?: TextStyle; numberOfLines?: number }) {
  const c = useColors();
  return <Text numberOfLines={numberOfLines} style={[{ fontSize: size, color: muted ? c.muted : c.ink, fontWeight: weight, fontVariant: ['tabular-nums'] }, style]}>{children}</Text>;
}

export function Btn({ title, onPress, kind = 'default', small, disabled }: { title: string; onPress: () => void; kind?: 'primary' | 'default' | 'ghost'; small?: boolean; disabled?: boolean }) {
  const c = useColors();
  const bg = kind === 'primary' ? c.accent : kind === 'ghost' ? 'transparent' : c.surface;
  const fg = kind === 'primary' ? c.accentInk : kind === 'ghost' ? c.accent : c.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => ({ backgroundColor: bg, borderWidth: kind === 'default' ? 1 : 0, borderColor: c.line, borderRadius: 8, paddingVertical: small ? 6 : 11, paddingHorizontal: small ? 10 : 16, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}>
      <Text style={{ color: fg, fontWeight: '600', fontSize: small ? 14 : 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string; style?: ViewStyle }) {
  const c = useColors();
  return (
    <View style={[{ gap: 4, flex: 1, minWidth: 80 }, style]}>
      {label ? <Text style={{ fontSize: 13, color: c.muted }}>{label}</Text> : null}
      <TextInput placeholderTextColor={c.muted} {...props}
        style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, fontSize: 16, color: c.ink, backgroundColor: c.bg, minHeight: props.multiline ? 80 : undefined, textAlignVertical: props.multiline ? 'top' : 'center' }} />
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Seg<K extends string>({ value, options, onChange }: { value: K; options: [K, string][]; onChange: (k: K) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.sunk, borderRadius: 8, padding: 3, gap: 2, flexWrap: 'wrap' }}>
      {options.map(([k, l]) => (
        <Pressable key={k} onPress={() => onChange(k)} accessibilityState={{ selected: k === value }}
          style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: k === value ? c.surface : 'transparent' }}>
          <Text style={{ color: k === value ? c.ink : c.muted, fontWeight: '500' }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Meter({ pct, color, height = 8 }: { pct: number; color?: string; height?: number }) {
  const c = useColors();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.sunk, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: color ?? c.accent, borderRadius: height / 2 }} />
    </View>
  );
}

export function Item({ title, meta, right, onDelete }: { title: string; meta?: string; right?: string; onDelete?: () => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
      <View style={{ flex: 1 }}>
        <T>{title}</T>
        {meta ? <T muted size={13}>{meta}</T> : null}
      </View>
      {right ? <T size={14}>{right}</T> : null}
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel={`Delete ${title}`}>
          <Ionicons name="close" size={18} color={c.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ label, sub, onPress }: { label: string; sub?: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', gap: 6, opacity: pressed ? 0.6 : 1, maxWidth: '100%' })}>
      <Text style={{ color: c.ink, fontSize: 14, flexShrink: 1 }} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={{ color: c.muted, fontSize: 14 }}>{sub}</Text> : null}
    </Pressable>
  );
}

export function Stat({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <View style={{ minWidth: 130, flexGrow: 1, flexBasis: 130, gap: 2 }}>
      <T muted size={13}>{label}</T>
      <T size={22} weight="600">{value}{unit ? <T muted size={14}> {unit}</T> : null}</T>
      {sub ? <T muted size={13}>{sub}</T> : null}
    </View>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <T muted size={13}>{children}</T>;
}
