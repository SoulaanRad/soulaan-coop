import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Badge = ({ children, variant = 'default', style, textStyle, ...props }) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outline;
      case 'secondary':
        return styles.secondary;
      default:
        return styles.default;
    }
  };

  const getTextVariantStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineText;
      case 'secondary':
        return styles.secondaryText;
      default:
        return styles.defaultText;
    }
  };

  return (
    <View style={[styles.badge, getVariantStyle(), style]} {...props}>
      <Text style={[styles.text, getTextVariantStyle(), textStyle]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Variants
  default: {
    backgroundColor: '#DC2626', // red-600
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB', // gray-300
  },
  secondary: {
    backgroundColor: '#6B7280', // gray-500
  },
  // Text styles
  defaultText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#374151', // gray-700
  },
  secondaryText: {
    color: '#FFFFFF',
  },
});