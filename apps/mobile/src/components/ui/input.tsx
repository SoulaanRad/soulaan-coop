import React, { useState } from 'react';
import { TextInput, View, Text, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps {
  id?: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
  style?: any;
}

export function Input({ 
  id, 
  type = 'text', 
  value, 
  onChangeText, 
  placeholder, 
  className = '',
  style 
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <View className="relative">
      <TextInput
        id={id}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={isPassword && !showPassword}
        keyboardType={type === 'email' ? 'email-address' : type === 'tel' ? 'phone-pad' : 'default'}
        autoCapitalize={type === 'email' ? 'none' : 'sentences'}
        className={`border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none ${className}`}
        style={style}
      />
      {isPassword && (
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
        >
          {showPassword ? (
            <EyeOff size={20} color="#6B7280" />
          ) : (
            <Eye size={20} color="#6B7280" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
