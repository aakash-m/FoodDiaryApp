import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ColorValue } from 'react-native';

export type IconName = 'home' | 'settings' | 'trending_up' | 'restaurant' | 'add';

type Props = { name: IconName; size?: number; color?: ColorValue };

// Glyphs chosen to match design/Home_Feed_screen.jpg: outlined gear and thin plus from Ionicons, the rest from Material Icons.
export function Icon({ name, size = 24, color }: Props) {
  switch (name) {
    case 'settings':
      return <Ionicons name="settings-outline" size={size} color={color} />;
    case 'add':
      return <Ionicons name="add" size={size} color={color} />;
    case 'trending_up':
      return <MaterialIcons name="trending-up" size={size} color={color} />;
    case 'restaurant':
      return <MaterialIcons name="restaurant" size={size} color={color} />;
    case 'home':
      return <MaterialIcons name="home" size={size} color={color} />;
  }
}
