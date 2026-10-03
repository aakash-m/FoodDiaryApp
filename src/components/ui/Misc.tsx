import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/theme/tokens';

export function PageDots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Page ${active + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

/** Stat column (Daily goals "218 Yoos") or tile (Weekly report stat boxes). */
export function Stat({ value, label, tile }: { value: string; label: string; tile?: boolean }) {
  return (
    <View style={[styles.stat, tile && styles.statTile]}>
      {tile && <Text style={styles.statTileLabel}>{label}</Text>}
      <Text style={[styles.statValue, tile && styles.statValueTile]}>{value}</Text>
      {!tile && <Text style={styles.statLabel}>{label}</Text>}
    </View>
  );
}

/** Cancel / Save row pinned to the bottom of editor screens. */
export function BottomActions({
  onCancel,
  onConfirm,
  confirmLabel = 'Save',
  bottomInset,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  bottomInset: number;
}) {
  return (
    <View style={[styles.actions, { paddingBottom: bottomInset + 14 }]}>
      <Button label="Cancel" variant="secondary" onPress={onCancel} style={styles.action} />
      <Button label={confirmLabel} onPress={onConfirm} style={styles.action} />
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sageDotInactive },
  dotActive: { backgroundColor: colors.sageDotActive },
  stat: { alignItems: 'center', flex: 1 },
  statTile: { alignItems: 'flex-start', backgroundColor: colors.background, borderRadius: 12, padding: 10 },
  statValue: { fontFamily: fonts.regular, fontSize: 24, color: colors.textPrimary },
  statValueTile: { fontSize: 22, marginTop: 2 },
  statLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  statTileLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  actions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  action: { flex: 1 },
  section: { fontFamily: fonts.medium, fontSize: 20, color: colors.textPrimary, marginBottom: 10 },
});
