import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, fonts } from '@/theme/tokens';

type RingProps = { progress: number; size?: number; stroke?: number; value: string; caption: string };

/** Donut progress ring (design system "Progress Bar", Daily goals mockup). */
export function ProgressRing({ progress, size = 220, stroke = 22, value, caption }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.ringTrack} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.sageButton}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c * p} ${c}`}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringValue}>{value}</Text>
        <Text style={styles.ringCaption}>{caption}</Text>
      </View>
    </View>
  );
}

/** Linear bar with label and percentage (design system "Linears bar"). */
export function LinearBar({ label, progress, trailing }: { label: string; progress: number; trailing?: string }) {
  const p = Math.min(Math.max(progress, 0), 1);
  return (
    <View>
      <View style={styles.barLabels}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{trailing ?? `${Math.round(p * 100)}%`}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${p * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ringCenter: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontFamily: fonts.regular, fontSize: 48, color: colors.textPrimary },
  ringCaption: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.textPrimary },
  barValue: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.sageButton },
});
