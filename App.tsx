import React, { useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { colors } from './src/ui/theme';
import { PromptInputScreen } from './src/ui/screens/PromptInputScreen';
import { StoryboardEditorScreen } from './src/ui/screens/StoryboardEditorScreen';
import { StoryboardListScreen } from './src/ui/screens/StoryboardListScreen';
import { GlobalToast } from './src/ui/components/GlobalToast';
import { useStoryStore } from './src/adapters/store/useStoryStore';
import { ErrorBoundary } from './src/ui/infrastructure/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

if (__DEV__) {
  const defaultErrorHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log('\n\n🔥 LỖI CRASH APP 🔥');
    console.error(error);
    defaultErrorHandler(error, isFatal);
  });
}

export default function App() {
  const hydrate = useStoryStore(s => s.hydrate);
  const isHydrated = useStoryStore(s => s.isHydrated);
  const screen = useStoryStore(s => s.screen);
  const isGenerating = useStoryStore(s => s.isGenerating);

  // Kích hoạt Hydration khi App khởi động
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // EC-5.1 & EC-7.2: Ẩn Splash khi Hydration xong HOẶC quá thời gian an toàn
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    if (isHydrated) {
      SplashScreen.hideAsync();
    } else {
      // Bọc chặn: Lỡ hệ thống Core (Hydration, load Font) bị lỗi văng Promise, 
      // Splash sẽ mắc kẹt che vĩnh viễn Error Boundary. Bắt buộc ép xả sau 4s.
      timeout = setTimeout(() => {
        if (__DEV__) console.warn('[App] ⚠️ Cảnh báo: Hydration bất thường, thiết lập ép đóng Splash Screen (EC-7.2)!');
        SplashScreen.hideAsync();
      }, 4000);
    }
    
    return () => clearTimeout(timeout);
  }, [isHydrated]);

  const abortGeneration = useStoryStore(s => s.abortGeneration);

  // EC-6.1 & EC-6.25: Huỷ request lưới nếu vuốt app đi quá 5 giây (Thời gian ân hạn)
  useEffect(() => {
    let backgroundTimer: ReturnType<typeof setTimeout>;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        if (__DEV__) console.log('[App] ⚠️ App vào nền, bắt đầu đếm 5s Grace Period...');
        backgroundTimer = setTimeout(() => {
          abortGeneration();
          if (__DEV__) console.log('[App] 🪓 Đã cắt kết nối AI do quá 5 giây ở nền');
        }, 5000);
      } else if (nextState === 'active') {
        if (__DEV__) console.log('[App] ☀️ App đã active trở lại, giữ nguyên mạng');
        clearTimeout(backgroundTimer);
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      clearTimeout(backgroundTimer);
    };
  }, [abortGeneration]);

  // Fallback màn hình trắng (hoặc splash) nếu chưa hydrate xong
  if (!isHydrated) {
    return <View style={styles.container} />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.container}>
            <StatusBar style="dark" />
            
            {screen === 'HOME' && <StoryboardListScreen />}
            {screen === 'PROMPT' && <PromptInputScreen />}
            {screen === 'EDITOR' && <StoryboardEditorScreen />}
            
            <GlobalToast />
          </View>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
