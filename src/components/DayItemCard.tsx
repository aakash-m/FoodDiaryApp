import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts, radii } from '@/theme/tokens';

export type ItemState = 'done' | 'skipped' | 'missing';

type Props = {
  title: string;
  subtitle: string;
  state: ItemState;
  photo?: ImageSourcePropType;
  icon: IconName;
  onPress: () => void;
};

/** Calendar mockup row: thumbnail, title + subtitle, chevron. Status shown by a small badge on the thumbnail. */
export function DayItemCard({ title, subtitle, state, photo, icon, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${state === 'missing' ? 'not logged' : state}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.tabIndicator }]}
    >
      <View>
        {photo ? (
          <Image source={photo} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.iconThumb, state === 'missing' && styles.iconThumbMissing]}>
            <Icon name={state === 'skipped' ? 'skip' : icon} size={24} color={state === 'missing' ? colors.textMuted : colors.sage} />
          </View>
        )}
        <View style={[styles.badge, styles[state]]}>
          {state !== 'missing' && <Icon name={state === 'skipped' ? 'skip' : 'check'} size={11} color={colors.white} />}
        </View>
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, state === 'missing' && styles.subtitleMissing]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Icon name="chevron_right" size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  thumb: { width: 48, height: 48, borderRadius: 12 },
  iconThumb: { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  iconThumbMissing: { backgroundColor: colors.surfaceSubtle },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { backgroundColor: colors.sage },
  skipped: { backgroundColor: colors.amber },
  missing: { backgroundColor: colors.disabled },
  text: { flex: 1 },
  title: { fontFamily: fonts.medium, fontSize: 17, color: colors.textPrimary },
  subtitle: { marginTop: 2, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  subtitleMissing: { color: colors.textMuted, fontStyle: 'italic' },
});
