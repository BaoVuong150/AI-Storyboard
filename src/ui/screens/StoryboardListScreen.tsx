import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Clock, Film, Trash2 } from 'lucide-react-native';

import { useStoryStore } from '../../adapters/store/useStoryStore';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { IStoryboard } from '../../core/entities/Storyboard';

export const StoryboardListScreen = () => {
  const insets = useSafeAreaInsets();
  const storyboards = useStoryStore(s => s.storyboards);
  const selectStoryboard = useStoryStore(s => s.selectStoryboard);
  const deleteStoryboard = useStoryStore(s => s.deleteStoryboard);
  const setScreen = useStoryStore(s => s.setScreen);

  const confirmDelete = (id: string, title: string) => {
    Alert.alert(
      'Xóa Kịch Bản',
      `Sếp có chắc chắn muốn xóa "${title}" không? Không thể hoàn tác đâu nhé!`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => deleteStoryboard(id) },
      ]
    );
  };

  const renderItem = ({ item }: { item: IStoryboard }) => {
    const date = new Date(item.updatedAt);
    const dateString = `${date.getDate()}/${date.getMonth() + 1} lúc ${date.getHours()}:${date.getMinutes()}`;
    
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => selectStoryboard(item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
             <Film size={18} color={colors.primary} />
             <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          </View>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => confirmDelete(item.id, item.title)}
            accessibilityRole="button"
            accessibilityLabel="Xóa kịch bản này"
          >
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.prompt} numberOfLines={2}>{item.prompt}</Text>
        
        <View style={styles.footer}>
           <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.scenes.length} Scenes</Text>
           </View>
           <View style={styles.timeContainer}>
              <Clock size={12} color={colors.textDisabled} />
              <Text style={styles.timeText}>{dateString}</Text>
           </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
       <Film size={64} color={colors.border} />
       <Text style={styles.emptyTitle}>Chưa có kịch bản nào</Text>
       <Text style={styles.emptySubtitle}>Bấm nút dấu cộng bên dưới để tạo ngay!</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={typography.h1}>Kho Kịch Bản</Text>
      </View>

      <FlatList
        data={storyboards}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity 
        style={[styles.fab, { bottom: Math.max(insets.bottom + spacing.md, spacing.xl) }]}
        onPress={() => setScreen('PROMPT')}
        accessibilityRole="button"
        accessibilityLabel="Tạo kịch bản mới"
      >
        <Plus size={24} color={colors.surface} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100, // Để tránh bị che bởi FAB
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    ...typography.h3,
    marginLeft: spacing.xs,
    flex: 1,
  },
  prompt: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    ...typography.caption,
    color: colors.textDisabled,
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  }
});
