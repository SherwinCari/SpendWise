/**
 * SpendWise Shapes
 * Border radius and shadow definitions for consistent elevation styling.
 */

import { Platform } from 'react-native';

export const borderRadius = {
  card: 12,
  button: 8,
  input: 8,
  modal: 12,
};

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: 'rgba(13, 148, 136, 0.08)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
    },
    android: {
      elevation: 3,
    },
    default: {
      shadowColor: 'rgba(13, 148, 136, 0.08)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
    },
  }),
  cardElevated: Platform.select({
    ios: {
      shadowColor: 'rgba(13, 148, 136, 0.12)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 24,
    },
    android: {
      elevation: 6,
    },
    default: {
      shadowColor: 'rgba(13, 148, 136, 0.12)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 24,
    },
  }),
  button: Platform.select({
    ios: {
      shadowColor: 'rgba(13, 148, 136, 0.15)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
    default: {
      shadowColor: 'rgba(13, 148, 136, 0.15)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
    },
  }),
};
