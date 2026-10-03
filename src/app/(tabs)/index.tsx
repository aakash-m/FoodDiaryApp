import { Image } from 'expo-image';
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
import { avatar, mealFeed, recentActivities, type FeedMeal } from '@/mocks/homeFeed';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const MEAL_CARD_WIDTH = 163;
const MEAL_CARD_GAP = 16;

export default function HomeFeedScreen() {
  const insets = useSafeAreaInsets();
  const [activeMeal, setActiveMeal] = useState(0);

  const onMealScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (MEAL_CARD_WIDTH + MEAL_CARD_GAP));
    setActiveMeal(Math.min(Math.max(index, 0), mealFeed.length - 1));
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
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" hitSlop={8}>
            <Icon name="settings" size={28} color={colors.textPrimary} />
          </Pressable>
          <Image source={avatar} style={styles.headerAvatar} accessibilityLabel="Profile" />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Meal Feed</Text>
          <Text style={styles.sectionSubtitle}>2 days ago</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Logged</Text>
        </View>
      </View>

      <FlatList
        data={mealFeed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MealCard meal={item} />}
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

      <View style={styles.dots}>
        {mealFeed.map((meal, i) => (
          <View key={meal.id} style={[styles.dot, i === activeMeal && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTitle}>Log Food</Text>
        <Text style={styles.logSubtitle}>Today</Text>
        <Text style={styles.logBody}>Add your daily food to your feed.</Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        >
          <Icon name="add" size={24} color={colors.textOnSage} />
          <Text style={styles.addButtonText}>Add food</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, styles.recentTitle]}>Recent Activities</Text>
      {recentActivities.map((activity) => (
        <View key={activity.id} style={styles.activityCard}>
          <Image source={activity.avatar} style={styles.activityAvatar} />
          <View>
            <Text style={styles.activityText}>
              {activity.action} <Text style={styles.activitySubject}>{activity.subject}</Text>
            </Text>
            <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function MealCard({ meal }: { meal: FeedMeal }) {
  return (
    <View style={styles.mealCard}>
      <Image source={meal.image} style={styles.mealImage} contentFit="cover" />
      <View style={styles.mealInfo}>
        <Text style={styles.mealTitle} numberOfLines={1}>
          {meal.title}
        </Text>
        <Text style={styles.mealSubtitle}>{meal.subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    height: 48,
  },
  title: { fontFamily: fonts.regular, fontSize: 36, color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 23 },
  headerAvatar: { width: 45, height: 45, borderRadius: 23 },

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
  activityAvatar: { width: 50, height: 50, borderRadius: 25 },
  activityText: { fontFamily: fonts.regular, fontSize: 18, color: colors.textPrimary },
  activitySubject: { fontFamily: fonts.semiBold },
  activitySubtitle: { marginTop: 2, fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary },
});
