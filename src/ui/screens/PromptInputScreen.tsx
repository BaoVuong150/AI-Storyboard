import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, ActivityIndicator 
} from 'react-native';
import { Sparkles, ArrowLeft } from 'lucide-react-native';

import { useStoryStore } from '../../adapters/store/useStoryStore';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

/** Timeout tối đa (đồng bộ với GeminiAiClient — Domain 3.3) */
const MAX_TIMEOUT_SECONDS = 15;

/**
 * Task 4C.1: Ô nhập liệu kịch bản
 * Áp dụng EC-4.3: Nhấn vùng trống để cất bàn phím
 */
export const PromptInputScreen = () => {
  const [prompt, setPrompt] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // EC-6.6 Nháy đúp phân thân (Double-Tap Race Condition Lock)
  const isSubmittingRef = useRef(false);
  
  // Tầng 4 (Giao diện) CHỈ ĐƯỢC kết nối qua Zustand Store (Tầng 3)
  const isGenerating = useStoryStore(s => s.isGenerating);
  const createStoryboard = useStoryStore(s => s.createStoryboard);
  const setScreen = useStoryStore(s => s.setScreen);
  const aiMode = useStoryStore(s => s.aiMode);
  const toggleAiMode = useStoryStore(s => s.toggleAiMode);

  // ⏱️ Bộ đếm thời gian thật — chạy khi isGenerating = true
  useEffect(() => {
    if (isGenerating) {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      // Dừng đồng hồ khi hoàn tất
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsed(0);
      isSubmittingRef.current = false; // Mở khoá khi AI xử lý xong
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  const handleGenerate = () => {
    // EC-6.6 khóa chặt cửa bằng synchronous ref để chống bấm 2 phát trong 10ms
    if (!prompt.trim() || isGenerating || isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    Keyboard.dismiss();

    // EC-6.20 Lọc bỏ kít tự tàng hình (Zero-width space) hoặc Zalgo text làm nghẹt bộ nhớ
    const sanitizedPrompt = prompt.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    
    if (sanitizedPrompt.length > 2000) {
       // Quá dài, AI sẽ tát 400 Bad Request
       isSubmittingRef.current = false;
       return;
    }

    createStoryboard(sanitizedPrompt);
  };

  // Tính phần trăm thanh tiến trình (0 → 1)
  const progress = Math.min(elapsed / MAX_TIMEOUT_SECONDS, 1);

  return (
    // EC-4.3: Hóa giải tật xấu lì lợm của bàn phím Native
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setScreen('HOME')}
              disabled={isGenerating}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={typography.h2}>Vũ Trụ Của Sếp</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Subtitle */}
          <Text 
            style={styles.subtitle}
            maxFontSizeMultiplier={typography.safeTextProps.maxFontSizeMultiplier}
          >
            Nhập ý tưởng ngớ ngẩn nhất vào đây. AI sẽ biến nó thành phim chiếu rạp 60 FPS chỉ trong vài giây.
          </Text>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[styles.modeBtn, aiMode === 'MOCK' && styles.modeBtnActive]}
              onPress={() => aiMode !== 'MOCK' && toggleAiMode()}
              disabled={isGenerating}
            >
              <Text style={[styles.modeBtnText, aiMode === 'MOCK' && styles.modeBtnTextActive]}>🤖 Mock Demo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, aiMode === 'GEMINI' && styles.modeBtnActiveGemini]}
              onPress={() => aiMode !== 'GEMINI' && toggleAiMode()}
              disabled={isGenerating}
            >
              <Text style={[styles.modeBtnText, aiMode === 'GEMINI' && styles.modeBtnTextActive]}>✨ Gemini Thật</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Nữ sinh cưỡi rồng phun lửa tại Landmark 81..."
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={prompt}
              onChangeText={setPrompt}
              editable={!isGenerating}
              selectionColor={colors.primary}
              maxLength={2000} // EC-6.2: Khóa chặn độ dài (Chống tràn token)
            />
            {!!prompt.trim() && !isGenerating && (
              <View style={styles.wordCountBadge}>
                 <Text style={[styles.wordCountText, prompt.length >= 1950 && { color: colors.error }]}>
                   {prompt.trim().length} / 2000
                 </Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.btn, (!prompt.trim() || isGenerating) && styles.btnDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isGenerating ? "Hệ thống đang sinh kịch bản" : "Xuất kho kịch bản"}
            accessibilityState={{ disabled: isGenerating || !prompt.trim() }}
          >
            {isGenerating ? (
              <View style={styles.btnLoading}>
                <ActivityIndicator color={colors.surface} size="small" />
                <Text style={styles.btnText}>
                  Đang sinh... {elapsed}s / {MAX_TIMEOUT_SECONDS}s
                </Text>
              </View>
            ) : (
              <>
                <Sparkles color={colors.surface} size={20} />
                <Text style={styles.btnText}>Xuất Kho Kịch Bản</Text>
              </>
            )}
          </TouchableOpacity>
          {isGenerating && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl, // Để nút cách đáy 1 đoạn
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 20,
    ...shadows.card,
  },
  subtitle: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  modeBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  modeBtnActiveGemini: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 1,
    paddingVertical: spacing.md - 1, // Bù trừ viền
  },
  modeBtnText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modeBtnTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  inputWrapper: {
    flex: 1, // Vẫn co giãn nhưng có mức tối thiểu
    minHeight: 160, 
    marginBottom: spacing.xl,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md, // Giảm padding ngang
    paddingTop: spacing.md, // Giảm padding trên để chữ ko bị đẩy xuống đáy
    paddingBottom: spacing.xxl, // Chừa chỗ cho cái badge góc dưới
    ...typography.body,
    fontSize: 16,
    color: colors.text,
    ...shadows.card,
  },
  wordCountBadge: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    opacity: 0.8,
  },
  wordCountText: {
    ...typography.caption,
    fontSize: 12,
  },
  btn: {
    flexDirection: 'row',
    backgroundColor: colors.text, // Đổi màu xám đen quyền lực thay vì primary
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.activeDrag,
  },
  btnDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    ...typography.h2,
    color: colors.surface,
  },
  btnLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '80%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
