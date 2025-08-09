import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

export const Button = ({ 
  children, 
  onPress, 
  variant = 'default', 
  size = 'default',
  disabled = false,
  loading = false,
  style,
  textStyle,
  ...props 
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outline;
      case 'ghost':
        return styles.ghost;
      case 'secondary':
        return styles.secondary;
      default:
        return styles.default;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.small;
      case 'lg':
        return styles.large;
      case 'icon':
        return styles.icon;
      default:
        return styles.defaultSize;
    }
  };

  const getTextVariantStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineText;
      case 'ghost':
        return styles.ghostText;
      case 'secondary':
        return styles.secondaryText;
      default:
        return styles.defaultText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyle(),
        getSizeStyle(),
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text style={[
          styles.text,
          getTextVariantStyle(),
          disabled && styles.disabledText,
          textStyle
        ]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
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
  ghost: {
    backgroundColor: 'transparent',
  },
  secondary: {
    backgroundColor: '#6B7280', // gray-500
  },
  // Sizes
  defaultSize: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  icon: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: 40,
    height: 40,
  },
  // Text styles
  defaultText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#374151', // gray-700
  },
  ghostText: {
    color: '#6B7280', // gray-500
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  // States
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#9CA3AF', // gray-400
  },
});