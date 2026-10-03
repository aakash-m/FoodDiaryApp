import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

type Ion = ComponentProps<typeof Ionicons>['name'];
type Mat = ComponentProps<typeof MaterialIcons>['name'];

// Glyphs chosen to match the mockups: outlined Ionicons for most UI, Material Icons where the mockup shows filled shapes.
const ICONS = {
  home: { mat: 'home' },
  settings: { ion: 'settings-outline' },
  trending_up: { mat: 'trending-up' },
  restaurant: { mat: 'restaurant' },
  add: { ion: 'add' },
  close: { ion: 'close' },
  back: { ion: 'arrow-back' },
  chevron_right: { ion: 'chevron-forward' },
  chevron_left: { ion: 'chevron-back' },
  chevron_down: { mat: 'arrow-drop-down' },
  calendar: { ion: 'calendar-outline' },
  today: { ion: 'today-outline' },
  water: { ion: 'water-outline' },
  exercise: { ion: 'walk-outline' },
  bell: { ion: 'notifications-outline' },
  time: { ion: 'time-outline' },
  moon: { ion: 'moon-outline' },
  folder: { ion: 'folder-outline' },
  backup: { ion: 'cloud-upload-outline' },
  restore: { ion: 'refresh-outline' },
  pdf: { ion: 'document-text-outline' },
  document: { ion: 'document-outline' },
  person: { ion: 'person-outline' },
  info: { ion: 'information-circle-outline' },
  share: { ion: 'share-social-outline' },
  open: { ion: 'open-outline' },
  save: { ion: 'download-outline' },
  camera: { ion: 'camera-outline' },
  image: { ion: 'image-outline' },
  check: { ion: 'checkmark' },
  check_circle: { ion: 'checkmark-circle' },
  skip: { ion: 'remove-circle-outline' },
  list: { ion: 'list-outline' },
} satisfies Record<string, { ion: Ion } | { mat: Mat }>;

export type IconName = keyof typeof ICONS;

type Props = { name: IconName; size?: number; color?: ColorValue };

export function Icon({ name, size = 24, color = '#1C211B' }: Props) {
  const glyph: { ion: Ion } | { mat: Mat } = ICONS[name];
  if ('mat' in glyph) return <MaterialIcons name={glyph.mat} size={size} color={color} />;
  return <Ionicons name={glyph.ion} size={size} color={color} />;
}
