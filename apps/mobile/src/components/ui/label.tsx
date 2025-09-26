import React from 'react';
import { Text } from 'react-native';

interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  style?: any;
}

export function Label({ children, htmlFor, className = '', style }: LabelProps) {
  return (
    <Text className={`text-sm font-medium text-gray-700 ${className}`} style={style}>
      {children}
    </Text>
  );
}
