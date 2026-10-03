// Design tokens taken from design/design_system_ref.jpg, design/Home_Feed_screen.jpg and design/app_design_ref.jpg.

export const colors = {
  sage: '#518059',
  sageButton: '#6C8B6C',
  sageHover: '#94AB91',
  sageIcon: '#739272',
  sageDotActive: '#778A76',
  sageDotInactive: '#CBD6C6',
  sageHero: '#9EBE99',
  skyBlue: '#9CC4DD',
  amber: '#E49728',
  amberSoft: '#E2B169',
  disabled: '#CCD1CA',
  error: '#B7433A',
  errorSurface: '#F6E6E3',

  background: '#F0F8E9',
  surface: '#D5E3CF',
  surfacePill: '#D5E3CD',
  surfaceSubtle: '#E3EEDE',
  tabBar: '#D5E2CE',
  tabIndicator: '#BCCFB4',
  outline: '#9FB29C',
  ringTrack: '#D5DEE3',

  textPrimary: '#1C211B',
  textSecondary: '#363B35',
  textMuted: '#4E554C',
  textDisabled: '#8D958B',
  textOnSage: '#EEF4EA',
  textPill: '#3E5A3E',
  white: '#FFFFFF',
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
  field: 12,
  pill: 999,
} as const;

export const type = {
  h1: { fontFamily: fonts.regular, fontSize: 36, lineHeight: 44, color: colors.textPrimary },
  h2: { fontFamily: fonts.regular, fontSize: 26, lineHeight: 34, color: colors.textPrimary },
  h3: { fontFamily: fonts.medium, fontSize: 20, lineHeight: 26, color: colors.textPrimary },
  body: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24, color: colors.textPrimary },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 24, color: colors.textPrimary },
  caption: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
} as const;
