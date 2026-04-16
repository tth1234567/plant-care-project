import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SectionTitleProps {
  children: string;
  style?: object;
}

export function SectionTitle({ children, style }: SectionTitleProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.bar} />
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  bar: {
    width: 3,
    height: 14,
    backgroundColor: '#3a9e3a',
    borderRadius: 2,
    marginRight: 8,
  },
  text: {
    color: '#3a9e3a',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
