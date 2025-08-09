import React from 'react';
import { View, StyleSheet } from 'react-native';

export const Card = ({ children, style, ...props }) => {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

export const CardHeader = ({ children, style, ...props }) => {
  return (
    <View style={[styles.header, style]} {...props}>
      {children}
    </View>
  );
};

export const CardTitle = ({ children, style, ...props }) => {
  return (
    <View style={[styles.title, style]} {...props}>
      {children}
    </View>
  );
};

export const CardContent = ({ children, style, ...props }) => {
  return (
    <View style={[styles.content, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6', // gray-100
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    // Title styling handled by Text component
  },
  content: {
    padding: 20,
  },
});