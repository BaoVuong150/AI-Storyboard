/**
 * ILocalStorage.ts — "Hợp đồng" trừu tượng cho bộ nhớ cục bộ
 *
 * 📍 Tầng: core/interfaces (Tầng 1 — Lõi hệ thống)
 * 📦 Dependencies: KHÔNG CÓ — TypeScript thuần 100%
 *
 * Giải thích SOLID-L (Liskov Substitution):
 * Hiện tại ta dùng MMKV (siêu nhanh, C++ native).
 * Nhưng nếu sau này cần đổi sang AsyncStorage hoặc SQLite,
 * ta chỉ cần tạo class mới implements ILocalStorage.
 * Toàn bộ Use Cases gọi Storage qua interface này → không cần sửa gì.
 *
 * Ví dụ:
 *   class MmkvStorageAdapter implements ILocalStorage { ... }   ← Dùng MMKV
 *   class AsyncStorageAdapter implements ILocalStorage { ... }  ← Dùng AsyncStorage
 *   Đổi adapter = đổi 1 file, lõi thuật toán không hay biết.
 */

import { Result } from '../types/common';

/**
 * ILocalStorage — Interface cho bất kỳ cơ chế lưu trữ cục bộ nào
 */
export interface ILocalStorage {
  /**
   * Đọc dữ liệu từ Storage theo key
   *
   * @param key - Tên khóa (VD: "current_storyboard", "lru_cache")
   * @returns Chuỗi JSON đã lưu, hoặc null nếu key chưa tồn tại
   */
  getItem(key: string): Result<string | null>;

  /**
   * Ghi dữ liệu vào Storage
   *
   * @param key - Tên khóa
   * @param value - Chuỗi JSON cần lưu (đã JSON.stringify)
   */
  setItem(key: string, value: string): Result<void>;

  /**
   * Xóa một key khỏi Storage
   *
   * @param key - Tên khóa cần xóa
   */
  removeItem(key: string): Result<void>;

  /**
   * Kiểm tra key có tồn tại trong Storage không
   *
   * @param key - Tên khóa cần kiểm tra
   */
  hasItem(key: string): boolean;
}
