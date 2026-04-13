import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * Task 6.5 & EC-6.11: Tấm khiên thép cuối cùng ngặn sập App
 * Fallback UI PHẢI là code React Native nguyên thủy (View, Text).
 * KHÔNG sử dụng màu custom theme, custom font, hay global store vì nếu
 * lỗi xuất phát từ chúng → app sẽ chết vòng lặp!
 */

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) {
      console.log('[ErrorBoundary] CATCH ERROR:', error, errorInfo);
    }
  }

  handleRestart = () => {
    // Ép reset app bằng cách tháo lỗi ra
    this.setState({ hasError: false, errorMsg: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>🔥</Text>
          <Text style={styles.title}>Hệ thống gặp sự cố kĩ thuật</Text>
          <Text style={styles.message}>
            Do một số lỗi bất thường, ứng dụng đã bị gián đoạn. Code lỗi:
          </Text>
          <Text style={styles.errorText} numberOfLines={3}>
            {this.state.errorMsg}
          </Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={this.handleRestart}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Thử tải lại App</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A', // Cứng mã màu để an toàn tuyệt đối
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 50,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
