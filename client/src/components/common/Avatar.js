/**
 * SpendWise Avatar Component
 * User avatar with initials fallback when no image is provided.
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

function Avatar({ name, imageUri, size = 40, style }) {
  const { colors, typography } = useTheme();

  const getInitials = (fullName) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initialsSize = Math.max(size * 0.4, 12);

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
        accessibilityLabel={`${name || 'User'} avatar`}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary + '20',
        },
        style,
      ]}
      accessibilityLabel={`${name || 'User'} avatar`}
    >
      <Text
        style={[
          styles.initials,
          {
            color: colors.primary,
            fontSize: initialsSize,
          },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '600',
  },
});

export default Avatar;
