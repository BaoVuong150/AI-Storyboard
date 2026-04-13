/**
 * theme.ts — Kế hoạch Thẩm mỹ (Design System) của AI Storyboard
 * 
 * 📍 Tầng: framework_drivers/ui (UI Layer)
 * 🎨 Phong cách: Light Mode (Tinh khôi, Siêu hiện đại giống iOS)
 */

export const colors = {
  // Nền & Khối (Theo dải Slate của Tailwind)
  background: '#F8FAFC',        // Nền app mượt mà (Slate 50)
  surface: '#FFFFFF',           // Nền card trắng tinh (White)
  surfaceHighlight: '#F1F5F9',  // Khi chạm vào hoặc Active (Slate 100)
  border: '#E2E8F0',            // Đường viền xám nhạt (Slate 200)
  
  // Thương hiệu & Điểm nhấn (Giữ nguyên cho nổi bật)
  primary: '#0ea5e9',           // Xanh Cyan (Sky 500)
  secondary: '#8b5cf6',         // Tím (Violet 500)
  accent: '#10b981',            // Xanh lục (Emerald 500)
  primaryLight: '#e0f2fe',      // Xanh mờ (Sky 100)
  
  // Chữ viết (Phải đổi sang tông Tối)
  text: '#0F172A',              // Đen sâu (Slate 900)
  textSecondary: '#64748b',     // Xám phụ trợ (Slate 500)
  textDisabled: '#cbd5e1',      // Xám bất hoạt
  
  // Tín hiệu lỗi/Cảnh báo
  danger: '#ef4444',            // Đỏ báo lỗi
  error: '#ef4444',             // Đỏ báo lỗi (alias)
  warning: '#f59e0b',           // Vàng cảnh báo
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,     // Khoảng cách phổ biến nhất (padding màn hình)
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, color: colors.text, letterSpacing: 0.5 },
  h2: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400' as const, color: colors.textSecondary },
  // 🛡️ EC-4.1: Props an toàn khóa phóng to font chữ hệ thống làm vỡ layout
  safeTextProps: {
    maxFontSizeMultiplier: 1.2, 
  }
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,     // Bo tròn cho Scene Card
  xl: 16,
  pill: 9999, // Bo tròn tuyệt đối cho Nút bấm
} as const;

export const shadows = {
  /** Đổ bóng nhẹ cho Card nằm im (iOS + Android) */
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2, 
  },
  /** 
   * 🛡️ EC-4.2 (Android Elevation): Bóng nảy lên khi nhấc Card
   * Dùng hiệu ứng Glow quang học (Neon glow)
   */
  activeDrag: {
    shadowColor: colors.primary, // Tỏa sáng màu xanh Cyan
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,                // Đảm bảo không bị nuốt bóng trên Android
    zIndex: 999,
  }
} as const;
