import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export type BarGroup = { label: string; values: number[] };
export type BarSeries = { name: string; color: string };

type Props = { groups: BarGroup[]; series: BarSeries[]; max: number; height?: number; ticks?: number[] };

/** Grouped vertical bar chart with y-axis gridlines (Weekly Report mockup). */
export function BarChart({ groups, series, max, height = 150, ticks = [0, 2, 4, 6, 8] }: Props) {
  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {ticks.map((t) => (
          <View key={t} style={[styles.grid, { bottom: (t / max) * height }]}>
            <Text style={styles.tick}>{t}</Text>
          </View>
        ))}
        <View style={styles.groups}>
          {groups.map((g) => (
            <View key={g.label} style={styles.group} accessibilityLabel={`${g.label}: ${g.values.map((v, i) => `${v} ${series[i].name}`).join(', ')}`}>
              {g.values.map((v, i) => (
                <View
                  key={series[i].name}
                  style={[styles.bar, { height: Math.max((v / max) * height, v > 0 ? 3 : 0), backgroundColor: series[i].color }]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.labels}>
        {groups.map((g) => (
          <Text key={g.label} style={styles.label}>
            {g.label}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.name} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const AXIS = 26;

const styles = StyleSheet.create({
  plot: { marginLeft: AXIS, justifyContent: 'flex-end' },
  grid: { position: 'absolute', left: -AXIS, right: 0, height: 1, backgroundColor: colors.surface },
  tick: { position: 'absolute', left: 0, top: -8, width: AXIS - 6, textAlign: 'right', fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  groups: { flexDirection: 'row', alignItems: 'flex-end', height: '100%' },
  group: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  bar: { width: 12, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  labels: { flexDirection: 'row', marginLeft: AXIS, marginTop: 6 },
  label: { flex: 1, textAlign: 'center', fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
});
