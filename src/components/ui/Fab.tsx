import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors } from '@/theme/tokens';

/** Square-rounded floating action button with "+" (Calendar mockup). */
export function Fab({ onPress, label, bottom = 20 }: { onPress: () => void; label: string; bottom?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && { backgroundColor: colors.sage }]}
    >
      <Icon name="add" size={30} color={colors.textOnSage} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 19,
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.sageButton,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#1C211B',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
