import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  style?: any;
}

export function Badge({ children, className = '', style }: BadgeProps) {
  return (
    <View 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={style}
    >
      <Text className="text-white text-xs font-medium">
        {children}
      </Text>
    </View>
  );
}
