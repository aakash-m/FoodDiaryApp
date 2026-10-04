import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { MAX_PHOTOS_PER_MEAL } from '@/lib/db/diaryRepo';
import { colors, fonts } from '@/theme/tokens';

type Props = {
  /** Photo file URIs in display order. */
  photos: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  /** Shows a spinner in the add tile while picked photos are being processed. */
  busy?: boolean;
};

/** Meal Editor mockup: one large photo on the left, four small ones in a 2×2 grid. */
export function PhotoGrid({ photos, onAdd, onRemove, disabled, busy }: Props) {
  const slot = (i: number, large = false) => {
    const photo = photos[i];
    const style = large ? styles.large : styles.small;
    if (photo) {
      return (
        <View key={`photo-${i}`} style={style}>
          <Image source={{ uri: photo }} style={styles.fill} contentFit="cover" accessibilityLabel={`Photo ${i + 1}`} />
          {!disabled && (
            <Pressable accessibilityLabel={`Remove photo ${i + 1}`} hitSlop={6} onPress={() => onRemove(i)} style={styles.remove}>
              <Icon name="close" size={14} color={colors.white} />
            </Pressable>
          )}
        </View>
      );
    }
    if (i === photos.length && !disabled) {
      if (busy) {
        return (
          <View key={`busy-${i}`} style={[style, styles.add]} accessibilityLabel="Adding photos">
            <ActivityIndicator color={colors.sage} />
          </View>
        );
      }
      return (
        <Pressable
          key={`add-${i}`}
          accessibilityRole="button"
          accessibilityLabel="Add photo"
          onPress={onAdd}
          style={({ pressed }) => [style, styles.add, pressed && { backgroundColor: colors.tabIndicator }]}
        >
          <Icon name="camera" size={large ? 32 : 22} color={colors.sage} />
          {large && <Text style={styles.addText}>Add photos</Text>}
          {large && <Text style={styles.addHint}>Camera or gallery · up to {MAX_PHOTOS_PER_MEAL}</Text>}
        </Pressable>
      );
    }
    return <View key={`empty-${i}`} style={[style, styles.empty]} />;
  };

  return (
    <View style={[styles.grid, disabled && { opacity: 0.4 }]}>
      {slot(0, true)}
      <View style={styles.smallGrid}>{[1, 2, 3, 4].map((i) => slot(i))}</View>
    </View>
  );
}

const GAP = 8;

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: GAP, height: 176 },
  large: { flex: 1.15, borderRadius: 14, overflow: 'hidden' },
  smallGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  small: { width: '47.5%', height: 84, borderRadius: 12, overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  add: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: colors.outline, borderStyle: 'dashed' },
  addText: { fontFamily: fonts.medium, fontSize: 15, color: colors.sage },
  addHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 8 },
  empty: { backgroundColor: colors.surfaceSubtle },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(28,33,27,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
