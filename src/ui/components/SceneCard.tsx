import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { Camera, Sun, Clock, Trash2, GripVertical } from 'lucide-react-native';

import { IScene } from '../../core/entities/Scene';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

/**
 * Task 4D.2: Thẻ hiển thị 1 cảnh quay
 * Task 4D.6: Animation
 *   - LinearTransition: di chuyển mượt khi reorder (thay FadeInDown gây giật)
 *   - FadeOutLeft: trượt trái khi xóa
 * 
 * EC-4.1: maxFontSizeMultiplier=1.2 trên MỌI Text
 * EC-4.2: elevation nâng khi drag (Android)
 *
 * React.memo: chặn re-render thừa khi các thẻ khác thay đổi
 */

interface SceneCardProps {
  readonly scene: IScene;
  readonly index: number;
  readonly onDelete: (id: string) => void;
  readonly drag?: () => void;
  readonly isActive?: boolean;
}

const SceneCardComponent: React.FC<SceneCardProps> = ({ scene, index, onDelete, drag, isActive }) => {
  return (
    <Animated.View
      layout={LinearTransition.springify()}
      exiting={FadeOutLeft.duration(300)}
    >
      <View style={[
        styles.card,
        isActive && styles.cardActive,
      ]}>
        {/* Header: Số thứ tự + Tiêu đề + Drag Handle */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.badge}>
              <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
                {index + 1}
              </Text>
            </View>
            <Text
              style={styles.title}
              numberOfLines={2}
              maxFontSizeMultiplier={typography.safeTextProps.maxFontSizeMultiplier}
            >
              {scene.title}
            </Text>
          </View>

          {/* Drag Handle — chỉ kéo ở đây (Rule 02 Domain 4.4 — chống Gesture Collision) */}
          {drag && (
            <TouchableOpacity 
              onPressIn={drag} 
              style={styles.dragHandle}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} // EC-6.7 Trượt phanh
              delayPressIn={100} // Khoá nhạy nếu lỡ tay quẹt qua
              accessibilityRole="button"
              accessibilityLabel="Kéo thẻ cảnh quay để thay đổi thứ tự"
            >
              <GripVertical color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          )}
        </View>

        {/* Body: Mô tả hành động */}
        <Text
          style={styles.action}
          numberOfLines={3}
          maxFontSizeMultiplier={typography.safeTextProps.maxFontSizeMultiplier}
        >
          {scene.action}
        </Text>

        {/* Footer: Metadata chips + Nút xóa */}
        <View style={styles.footer}>
          <View style={styles.chips}>
            <View style={styles.chip}>
              <Camera color={colors.primary} size={14} />
              <Text style={styles.chipText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {scene.cameraAngle}
              </Text>
            </View>
            <View style={styles.chip}>
              <Sun color={colors.warning} size={14} />
              <Text style={styles.chipText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {scene.lighting}
              </Text>
            </View>
            <View style={styles.chip}>
              <Clock color={colors.accent} size={14} />
              <Text style={styles.chipText} maxFontSizeMultiplier={1.2}>
                {scene.duration}s
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => onDelete(scene.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Xóa thẻ cảnh quay này"
          >
            <Trash2 color={colors.danger} size={18} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

/** React.memo mặc định: shallow compare TẤT CẢ props (bao gồm index) */
export const SceneCard = memo(SceneCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    // EC-4.1: Dùng minHeight thay cho height cứng
    minHeight: 140,
    ...shadows.card,
  },
  cardActive: {
    // EC-4.2: Nâng bóng Neon khi nhấc thẻ trên Android
    ...shadows.activeDrag,
    borderColor: colors.primary,
    transform: [{ scale: 1.03 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    ...typography.h2,
    flex: 1,
    fontSize: 16,
  },
  dragHandle: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  action: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  chipText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
