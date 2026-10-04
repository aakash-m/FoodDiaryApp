import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { colors, fonts } from '@/theme/tokens';

// Themed replacements for Alert.alert, so dialogs follow the design system instead of the system style.

type SheetOption = { icon: IconName; label: string; onPress: () => void };

export function ActionSheet({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdropBottom} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {options.map((o) => (
            <Pressable
              key={o.label}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                o.onPress();
              }}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.surface }]}
            >
              <Icon name={o.icon} size={24} color={colors.sage} />
              <Text style={styles.optionLabel}>{o.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type DialogAction = { label: string; onPress?: () => void; primary?: boolean; destructive?: boolean };

export function Dialog({
  visible,
  title,
  message,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  actions: DialogAction[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdropCenter} onPress={onClose}>
        <Pressable style={styles.dialog} accessibilityRole="alert">
          <Text style={styles.dialogTitle}>{title}</Text>
          {message ? <Text style={styles.dialogMessage}>{message}</Text> : null}
          <View style={styles.dialogActions}>
            {actions.map((a) => (
              <Button
                key={a.label}
                size="small"
                label={a.label}
                variant={a.primary || a.destructive ? 'primary' : 'tertiary'}
                style={a.destructive ? { backgroundColor: colors.error } : undefined}
                onPress={() => {
                  onClose();
                  a.onPress?.();
                }}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Blocking progress dialog for long tasks (report generation, backups). */
export function ProgressDialog({ visible, title, detail }: { visible: boolean; title: string; detail?: string }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdropCenter}>
        <View style={[styles.dialog, styles.progress]} accessibilityRole="progressbar" accessibilityLabel={title}>
          <ActivityIndicator size="large" color={colors.sage} />
          <View style={styles.progressText}>
            <Text style={styles.progressTitle}>{title}</Text>
            {detail ? <Text style={styles.dialogMessage}>{detail}</Text> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropBottom: { flex: 1, backgroundColor: 'rgba(28,33,27,0.35)', justifyContent: 'flex-end' },
  backdropCenter: { flex: 1, backgroundColor: 'rgba(28,33,27,0.35)', justifyContent: 'center', padding: 28 },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 12 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.outline, marginTop: 10 },
  sheetTitle: { fontFamily: fonts.medium, fontSize: 18, color: colors.textPrimary, padding: 12, paddingTop: 14 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 14, height: 56, borderRadius: 14 },
  optionLabel: { fontFamily: fonts.regular, fontSize: 17, color: colors.textPrimary },
  dialog: { backgroundColor: colors.background, borderRadius: 28, padding: 24 },
  dialogTitle: { fontFamily: fonts.regular, fontSize: 22, color: colors.textPrimary },
  dialogMessage: { marginTop: 12, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  progressText: { flex: 1 },
  progressTitle: { fontFamily: fonts.medium, fontSize: 18, color: colors.textPrimary },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 22, flexWrap: 'wrap' },
});
