import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Check } from 'lucide-react-native';

interface CheckboxProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  style?: any;
}

export function Checkbox({ id, checked, onCheckedChange, className = '', style }: CheckboxProps) {
  return (
    <TouchableOpacity
      onPress={() => onCheckedChange(!checked)}
      className={`w-5 h-5 border-2 rounded border-gray-300 flex items-center justify-center ${
        checked ? 'bg-blue-600 border-blue-600' : 'bg-white'
      } ${className}`}
      style={style}
    >
      {checked && <Check size={14} color="white" />}
    </TouchableOpacity>
  );
}
