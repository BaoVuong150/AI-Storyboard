// babel.config.js
// Cấu hình Babel cho dự án AI Storyboard
// - Plugin Reanimated: BẮT BUỘC đặt cuối cùng trong mảng plugins (yêu cầu của thư viện)
// - Plugin remove-console: Tự động xóa console.log khi build production (Rule 05.3 + TECH_STACK 5.4)
module.exports = function (api) {
  api.cache(true);

  const plugins = [];

  // Fix lỗi Vite/Zustand: Cannot use import.meta outside a module
  plugins.push('babel-plugin-transform-import-meta');

  // Chỉ xóa console.log khi build production (lúc dev vẫn giữ để debug)
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  // Reanimated plugin PHẢI ĐẶT CUỐI CÙNG — đây là yêu cầu bắt buộc của thư viện
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
