import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, X } from 'lucide-react-native';

import { useStoryStore } from '../../adapters/store/useStoryStore';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

/**
 * Task 4A.3: Cấm dùng alert() native. Dùng Component Toast 100% JS.
 */
export const GlobalToast = () => {
  const { error, clearError } = useStoryStore();
  const insets = useSafeAreaInsets();

  // EC-7.9: Tránh thảm họa Zombie Toast (Memory Leak)
  // Nhờ `return () => clearTimeout(timer)`, khi có lỗi mới chèn lên hoặc khi ngắt component,
  // luồng đếm lùi cũ lập tức bị tiêu diệt, cấm gọi State chui!
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (error) {
      timer = setTimeout(() => {
        clearError();
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [error, clearError]);

  if (!error) return null;

  return (
    <View style={[styles.container, { top: Math.max(insets.top + spacing.sm, 40) }]}>
      <View style={styles.toast}>
        <AlertCircle color={colors.danger} size={24} />
        
        {/* EC-4.1: Khóa maxFontSizeMultiplier */}
        <Text 
          style={styles.message} 
          maxFontSizeMultiplier={typography.safeTextProps.maxFontSizeMultiplier}
        >
          {error}
        </Text>

        <TouchableOpacity 
          onPress={clearError} 
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // Vùng tap bự tay mập bấm cũng dính
          accessibilityRole="button"
          accessibilityLabel="Đóng thông báo" // EC-7.8
        >
          <X color={colors.textSecondary} size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999, // Luôn trồi lên trên cùng
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.activeDrag,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  message: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: spacing.sm,
    color: colors.text,
  }
});
