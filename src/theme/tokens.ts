// Design tokens taken from design/design_system_ref.jpg and design/Home_Feed_screen.jpg.

export const colors = {
  sage: '#518059',
  sageButton: '#6C8B6C',
  sageIcon: '#739272',
  sageDotActive: '#778A76',
  sageDotInactive: '#CBD6C6',
  amber: '#F39C29',

  background: '#F0F8E9',
  surface: '#D5E3CF',
  surfacePill: '#D5E3CD',
  tabBar: '#D5E2CE',
  tabIndicator: '#BCCFB4',

  textPrimary: '#1C211B',
  textSecondary: '#363B35',
  textMuted: '#4E554C',
  textOnSage: '#EEF4EA',
  textPill: '#3E5A3E',
} as const;

export const fonts = {
  regular: 'Roboto_400Regular',
  medium: 'Roboto_500Medium',
  semiBold: 'Roboto_600SemiBold',
  bold: 'Roboto_700Bold',
} as const;

export const spacing = {
  screen: 19,
  cardPadding: 16,
} as const;

export const radii = {
  card: 18,
  mealCard: 16,
  pill: 999,
} as const;
