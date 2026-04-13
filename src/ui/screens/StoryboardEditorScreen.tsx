import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Undo2, Redo2, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useStoryStore } from '../../adapters/store/useStoryStore';
import { SceneCard } from '../components/SceneCard';
import { colors, typography, spacing, borderRadius } from '../theme';

import { IScene } from '../../core/entities/Scene';
import { SceneID } from '../../core/types/common';

/**
 * Task 4D.1: Màn hình Storyboard Editor
 * Task 4D.3: DraggableFlatList — Kéo thả 60FPS
 * Task 4D.5: Thanh Undo/Redo
 * 
 * EC-4.2: zIndex + elevation khi drag (Android Clipping Fix)
 */
export const StoryboardEditorScreen = () => {
  const scenes = useStoryStore(s => s.scenes);
  const canUndo = useStoryStore(s => s.canUndo);
  const canRedo = useStoryStore(s => s.canRedo);
  const undo = useStoryStore(s => s.undo);
  const redo = useStoryStore(s => s.redo);
  const remove = useStoryStore(s => s.remove);
  const setScreen = useStoryStore(s => s.setScreen);
  const reorderFromArray = useStoryStore(s => s.reorderFromArray);
  const insets = useSafeAreaInsets();

  // EC-6.13: Lock xoá để Reanimated chạy hết Animation, tránh vón cục DOM tree Native
  const isDeleteLocked = useRef(false);
  const handleDelete = useCallback((id: string) => {
    if (isDeleteLocked.current) return;
    isDeleteLocked.current = true;
    remove(id as SceneID);
    setTimeout(() => { isDeleteLocked.current = false; }, 350); // Đợi FadeOutLeft xong
  }, [remove]);

  /**
   * Task 4D.3: onDragEnd — Khi thả thẻ xong
   * Gửi thẳng mảng đã sắp xếp lại cho Engine rebuild LinkedList
   */
  const handleDragEnd = useCallback(({ data, from, to }: { data: IScene[]; from: number; to: number }) => {
    if (from === to) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // EC-7.1: Rung khi kết thúc kéo
    reorderFromArray(data);
  }, [reorderFromArray]);

  /** Bảng tra index O(1) — rebuild khi scenes thay đổi */
  const indexMap = useMemo(() => {
    const map = new Map<string, number>();
    scenes.forEach((s, i) => map.set(s.id, i));
    return map;
  }, [scenes]);

  const isUndoRedoLocked = useRef(false);

  const handleUndo = useCallback(() => {
    if (isUndoRedoLocked.current || !canUndo) return;
    isUndoRedoLocked.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    undo();
    setTimeout(() => { isUndoRedoLocked.current = false; }, 300); // Khoá 300ms (EC-6.8)
  }, [undo, canUndo]);

  const handleRedo = useCallback(() => {
    if (isUndoRedoLocked.current || !canRedo) return;
    isUndoRedoLocked.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    redo();
    setTimeout(() => { isUndoRedoLocked.current = false; }, 300); // Khoá 300ms (EC-6.8)
  }, [redo, canRedo]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<IScene>) => (
    <ScaleDecorator>
      <SceneCard
        scene={item}
        index={indexMap.get(item.id) ?? 0}
        onDelete={handleDelete}
        drag={drag}
        isActive={isActive}
      />
    </ScaleDecorator>
  ), [handleDelete, indexMap]);

  const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header + Undo/Redo */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setScreen('HOME')}
              accessibilityRole="button"
              accessibilityLabel="Quay lại màn hình chính" // EC-7.8
            >
              <ArrowLeft size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerTitleInfo}>
              <Text style={styles.titleText} maxFontSizeMultiplier={1.2}>
                🎬 Kịch bản
              </Text>
              <Text style={styles.stats} maxFontSizeMultiplier={1.2}>
                {scenes.length} cảnh  •  {totalDuration}s tổng
              </Text>
            </View>
          </View>

          {/* Task 4D.5: Thanh Undo/Redo */}
          <View style={styles.undoRedoBar}>
            <TouchableOpacity
              onPress={handleUndo}
              disabled={!canUndo}
              style={[styles.undoBtn, !canUndo && styles.undoBtnDisabled]}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // EC-6.9 Cảm ứng chết
              accessibilityRole="button"
              accessibilityLabel="Hoàn tác. Quay lại bước trước" // EC-7.8
            >
              <Undo2 color={canUndo ? colors.primary : colors.textDisabled} size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRedo}
              disabled={!canRedo}
              style={[styles.undoBtn, !canRedo && styles.undoBtnDisabled]}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // EC-6.9 Cảm ứng chết
              accessibilityRole="button"
              accessibilityLabel="Làm lại bước vừa hủy" // EC-7.8
            >
              <Redo2 color={canRedo ? colors.primary : colors.textDisabled} size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Task 4D.3: DraggableFlatList — Kéo thả 60FPS */}
      {/* EC-7.11: (Implicitly solved by draggable-flatlist default handling unless nested) */}
      <DraggableFlatList
        data={scenes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} // EC-7.1: Rung khi bắt đầu kéo
        onDragEnd={handleDragEnd}
        extraData={indexMap}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        maxToRenderPerBatch={5}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText} maxFontSizeMultiplier={1.2}>
              Chưa có cảnh nào
            </Text>
            <Text style={styles.emptyHint} maxFontSizeMultiplier={1.2}>
              Vui lòng nhập Prompt và bấm Xuất Kho
            </Text>
          </View>
        }
      />

      {/* Hướng dẫn kéo thả */}
      {scenes.length > 1 && (
        <View style={styles.dragHint}>
          <Text style={styles.dragHintText} maxFontSizeMultiplier={1.2}>
            ☰ Giữ biểu tượng ≡ để kéo thả sắp xếp lại
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleInfo: {
    justifyContent: 'center',
  },
  titleText: {
    ...typography.h1,
    fontSize: 20,
  },
  stats: {
    ...typography.caption,
    marginTop: 2,
  },
  undoRedoBar: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  undoBtn: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHighlight,
  },
  undoBtnDisabled: {
    opacity: 0.5,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.h2,
    color: colors.textSecondary,
  },
  emptyHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  dragHint: {
    position: 'absolute',
    bottom: 20,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    opacity: 0.85,
  },
  dragHintText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 13,
  },
});
