import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/theme';

export default function ScreenContainer({ children, style, edges }) {
  // Screens inside stack navigators already have top insets handled by the header.
  // Default to left, right, bottom to ensure content respects device curves and home bar.
  return (
    <SafeAreaView style={styles.safe} edges={edges ?? ['left', 'right', 'bottom']}>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
});
