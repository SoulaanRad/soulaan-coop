import React from 'react';
import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export function Card({ children, className, style }: CardProps) {
  return (
    <View 
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className || ''}`}
      style={style}
    >
      {children}
    </View>
  );
}

export function CardContent({ children, className, style }: CardProps) {
  return (
    <View className={`p-4 ${className || ''}`} style={style}>
      {children}
    </View>
  );
}
