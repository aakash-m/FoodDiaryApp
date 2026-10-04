import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Round sage avatar with the user's initials (the app stores no profile photo). */
export function InitialsAvatar({ name, size }: { name: string; size: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]} accessibilityLabel={name || 'Profile'}>
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.sageButton, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.medium, color: colors.textOnSage },
});
