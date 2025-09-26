import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({ 
  children, 
  onPress, 
  variant = 'default', 
  size = 'md', 
  disabled = false,
  className = '',
  style,
  textStyle
}: ButtonProps) {
  const getButtonStyles = () => {
    const baseStyles = 'rounded-md flex-row items-center justify-center';
    
    if (disabled) {
      return `${baseStyles} bg-gray-300`;
    }
    
    switch (variant) {
      case 'ghost':
        return `${baseStyles} bg-transparent`;
      case 'outline':
        return `${baseStyles} border border-gray-300 bg-transparent`;
      default:
        return `${baseStyles} bg-blue-600`;
    }
  };

  const getTextStyles = () => {
    const baseStyles = 'font-medium text-center';
    
    if (disabled) {
      return `${baseStyles} text-gray-500`;
    }
    
    switch (variant) {
      case 'ghost':
        return `${baseStyles} text-gray-700`;
      case 'outline':
        return `${baseStyles} text-gray-700`;
      default:
        return `${baseStyles} text-white`;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2';
      case 'lg':
        return 'px-6 py-4';
      default:
        return 'px-4 py-3';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`${getButtonStyles()} ${getSizeStyles()} ${className}`}
      style={style}
    >
      <Text className={`${getTextStyles()}`} style={textStyle}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}
