import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { useDiaryQuery } from '@/hooks/useDiaryQuery';
import { summarizeDay } from '@/lib/completeness';
import { getDay, getRecentMeals, type RecentMeal } from '@/lib/db/diaryRepo';
import { relativeDay, todayKey } from '@/lib/dates';
import { mealType } from '@/lib/meals';
import { photoUri } from '@/lib/photos';
import { useSettings } from '@/state/settings';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const MEAL_CARD_WIDTH = 163;
const MEAL_CARD_GAP = 16;
const FEED_SIZE = 8;

const openMeal = (m: Pick<RecentMeal, 'date' | 'type'>) =>
  router.push({ pathname: '/meal/[date]/[type]', params: { date: m.date, type: m.type } });

export default function HomeFeedScreen() {
  const insets = useSafeAreaInsets();
  const { name } = useSettings();
  const today = todayKey();
  const [activeMeal, setActiveMeal] = useState(0);
  const feed = useDiaryQuery((db) => getRecentMeals(db, FEED_SIZE, { withPhotosOnly: true }), []).data ?? [];
  const recent = useDiaryQuery((db) => getRecentMeals(db, 5), []).data ?? [];
  const todayDay = useDiaryQuery((db) => getDay(db, today), [today]).data;
  const todaySummary = todayDay ? summarizeDay(todayDay) : null;

  const addFood = () => {
    const type = todayDay?.meals.find((m) => m.status === 'empty')?.type ?? 'breakfast';
    openMeal({ date: today, type });
  };

  const onMealScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (MEAL_CARD_WIDTH + MEAL_CARD_GAP));
    setActiveMeal(Math.min(Math.max(index, 0), Math.max(feed.length - 1, 0)));
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 43 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Home Feed</Text>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" hitSlop={8} onPress={() => router.navigate('/settings')}>
            <Icon name="settings" size={28} color={colors.textPrimary} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/settings/profile')}>
            <InitialsAvatar name={name} size={45} />
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Meal Feed</Text>
          <Text style={styles.sectionSubtitle}>{feed[0] ? relativeDay(feed[0].date, today) : 'No photos yet'}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{todaySummary ? `${todaySummary.done}/${todaySummary.total} today` : 'Logged'}</Text>
        </View>
      </View>

      {feed.length === 0 ? (
        <View style={[styles.carousel, styles.carouselContent]}>
          <Pressable
            accessibilityRole="button"
            onPress={addFood}
            style={({ pressed }) => [styles.mealCard, styles.emptyCard, pressed && styles.pressed]}
          >
            <Icon name="camera" size={34} color={colors.sage} />
            <Text style={styles.emptyText}>Photos of your meals appear here</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => `${item.date}-${item.type}`}
          renderItem={({ item }) => <MealCard meal={item} today={today} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={MEAL_CARD_WIDTH + MEAL_CARD_GAP}
          decelerationRate="fast"
          onScroll={onMealScroll}
          scrollEventThrottle={16}
          style={styles.carousel}
          contentContainerStyle={styles.carouselContent}
          ItemSeparatorComponent={() => <View style={{ width: MEAL_CARD_GAP }} />}
        />
      )}

      <View style={styles.dots}>
        {(feed.length ? feed : [null]).map((meal, i) => (
          <View key={meal ? `${meal.date}-${meal.type}` : 'empty'} style={[styles.dot, i === activeMeal && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTitle}>Log Food</Text>
        <Text style={styles.logSubtitle}>Today</Text>
        <Text style={styles.logBody}>Add your daily food to your feed.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={addFood}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        >
          <Icon name="add" size={24} color={colors.textOnSage} />
          <Text style={styles.addButtonText}>Add food</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, styles.recentTitle]}>Recent Activities</Text>
      {recent.length === 0 ? (
        <Text style={styles.emptyActivities}>Nothing logged yet. Your latest entries will show up here.</Text>
      ) : (
        recent.map((m) => (
          <Pressable
            key={`${m.date}-${m.type}`}
            accessibilityRole="button"
            onPress={() => openMeal(m)}
            style={({ pressed }) => [styles.activityCard, pressed && styles.pressed]}
          >
            <InitialsAvatar name={name} size={50} />
            <View style={styles.activityTextWrap}>
              <Text style={styles.activityText} numberOfLines={1}>
                {m.status === 'skipped' ? 'Skipped' : 'Logged'} <Text style={styles.activitySubject}>{mealType(m.type).label}</Text>
              </Text>
              <Text style={styles.activitySubtitle} numberOfLines={1}>
                {relativeDay(m.date, today)}
                {m.description ? ` · ${m.description}` : ''}
              </Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function MealCard({ meal, today }: { meal: RecentMeal; today: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => openMeal(meal)} style={({ pressed }) => [styles.mealCard, pressed && styles.pressed]}>
      <Image source={{ uri: photoUri(meal.photos[0].fileName) }} style={styles.mealImage} contentFit="cover" />
      <View style={styles.mealInfo}>
        <Text style={styles.mealTitle} numberOfLines={1}>
          {mealType(meal.type).label}
        </Text>
        <Text style={styles.mealSubtitle}>{relativeDay(meal.date, today)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  pressed: { opacity: 0.85 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    height: 48,
  },
  title: { fontFamily: fonts.regular, fontSize: 36, color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 23 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 22,
    paddingLeft: spacing.screen,
    paddingRight: 8,
  },
  sectionTitle: { fontFamily: fonts.regular, fontSize: 26, lineHeight: 34, color: colors.textPrimary },
  sectionSubtitle: { fontFamily: fonts.regular, fontSize: 17, color: colors.textSecondary },
  pill: {
    backgroundColor: colors.surfacePill,
    borderRadius: radii.pill,
    height: 32,
    paddingHorizontal: 13,
    justifyContent: 'center',
    marginTop: 1,
  },
  pillText: { fontFamily: fonts.regular, fontSize: 17, color: colors.textPill },

  carousel: { marginTop: 12, flexGrow: 0 },
  carouselContent: { paddingHorizontal: spacing.screen },
  mealCard: {
    width: MEAL_CARD_WIDTH,
    height: 211,
    borderRadius: radii.mealCard,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  mealImage: { width: '100%', height: 139 },
  mealInfo: { paddingHorizontal: 16, paddingTop: 9 },
  mealTitle: { fontFamily: fonts.semiBold, fontSize: 18, color: colors.textPrimary },
  mealSubtitle: { marginTop: 2, fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary },
  emptyCard: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  emptyText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 21 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sageDotInactive },
  dotActive: { backgroundColor: colors.sageDotActive },

  logCard: {
    marginTop: 17,
    marginHorizontal: spacing.screen,
    padding: spacing.cardPadding,
    paddingTop: 12,
    paddingBottom: 17,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  logTitle: { fontFamily: fonts.regular, fontSize: 28, lineHeight: 30, color: colors.textPrimary },
  logSubtitle: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 28, color: colors.textSecondary },
  logBody: { marginTop: 2, fontFamily: fonts.regular, fontSize: 18, lineHeight: 26, color: colors.textPrimary },
  addButton: {
    marginTop: 14,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.sageButton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  addButtonPressed: { backgroundColor: colors.sage },
  addButtonText: { fontFamily: fonts.regular, fontSize: 19, color: colors.textOnSage },

  recentTitle: { marginTop: 19, paddingHorizontal: spacing.screen },
  emptyActivities: {
    marginTop: 8,
    paddingHorizontal: spacing.screen,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  activityCard: {
    marginTop: 10,
    marginHorizontal: spacing.screen,
    padding: spacing.cardPadding,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityTextWrap: { flex: 1 },
  activityText: { fontFamily: fonts.regular, fontSize: 18, color: colors.textPrimary },
  activitySubject: { fontFamily: fonts.semiBold },
  activitySubtitle: { marginTop: 2, fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary },
});
