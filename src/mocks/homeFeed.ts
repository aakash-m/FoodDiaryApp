import type { ImageSourcePropType } from 'react-native';

// Placeholder content mirroring design/Home_Feed_screen.jpg. Replaced by diary data in Phase 3.

export type FeedMeal = {
  id: string;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
};

export type Activity = {
  id: string;
  action: string;
  subject: string;
  subtitle: string;
  avatar: ImageSourcePropType;
};

const meal1 = require('@/assets/images/mock/meal-1.jpg');
const meal2 = require('@/assets/images/mock/meal-2.jpg');
export const avatar = require('@/assets/images/mock/avatar.jpg');

export const mealFeed: FeedMeal[] = [
  { id: '1', title: 'Viennese Meal', subtitle: '1 day ago', image: meal1 },
  { id: '2', title: 'Meali cards', subtitle: '2 days ago', image: meal2 },
  { id: '3', title: 'Viennese Meal', subtitle: '3 days ago', image: meal1 },
  { id: '4', title: 'Meali cards', subtitle: '4 days ago', image: meal2 },
];

export const recentActivities: Activity[] = [
  { id: '1', action: 'Logged', subject: 'Viennese Meal', subtitle: '1 day ago', avatar },
  { id: '2', action: 'Logged', subject: 'Meali cards', subtitle: '2 days ago', avatar },
];
