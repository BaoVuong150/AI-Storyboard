/**
 * ICacheStrategy.ts — "Hợp đồng" trừu tượng cho chiến lược Cache
 *
 * 📍 Tầng: core/interfaces (Tầng 1 — Lõi hệ thống)
 * 📦 Dependencies: KHÔNG CÓ — TypeScript thuần 100%
 *
 * Giải thích:
 * LRU Cache trong dự án này dùng để tiết kiệm Free-tier API credits.
 *
 * Kịch bản thực tế:
 *   1. Người dùng gõ prompt "MV Cyberpunk 30s" → gọi AI → tốn 1 request
 *   2. AI trả về 5 Scene → Cache lưu: key="MV Cyberpunk 30s", value=5 Scene
 *   3. Người dùng gõ LẠI "MV Cyberpunk 30s" → Cache trả ngay, KHÔNG gọi AI
 *   → Tiết kiệm 1 request miễn phí.
 *
 * Tại sao dùng Interface?
 *   → Nếu sau này muốn đổi thuật toán cache (VD: từ LRU sang LFU),
 *     chỉ cần tạo class mới implements ICacheStrategy.
 *
 * Generic <K, V>:
 *   K = Kiểu của Key (VD: string — prompt)
 *   V = Kiểu của Value (VD: IScene[] — danh sách Scene)
 */

/**
 * ICacheStrategy<K, V> — Interface cho bất kỳ thuật toán Cache nào
 */
export interface ICacheStrategy<K, V> {
  /**
   * Truy xuất giá trị từ Cache.
   * Nếu key tồn tại: trả về value + đẩy key lên đầu (Most Recently Used).
   * Nếu key không tồn tại: trả về undefined.
   *
   * @param key - Khóa tìm kiếm
   */
  get(key: K): V | undefined;

  /**
   * Thêm hoặc cập nhật một cặp key-value vào Cache.
   * Nếu Cache đầy: tự động xóa phần tử ít dùng nhất (Least Recently Used).
   *
   * @param key - Khóa
   * @param value - Giá trị
   */
  put(key: K, value: V): void;

  /**
   * Kiểm tra key có trong Cache không (không thay đổi thứ tự)
   */
  has(key: K): boolean;

  /**
   * Xóa một key khỏi Cache
   */
  evict(key: K): boolean;

  /**
   * Lấy số lượng phần tử hiện tại trong Cache
   */
  size(): number;

  /**
   * Xóa toàn bộ Cache
   */
  clear(): void;
}
