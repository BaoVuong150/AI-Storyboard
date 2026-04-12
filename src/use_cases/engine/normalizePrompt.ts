/**
 * normalizePrompt.ts — Chuẩn hóa prompt trước khi dùng làm Cache Key
 *
 * 📍 Tầng: use_cases/engine (Tầng 2 — Business Logic)
 * 📦 Dependencies: KHÔNG CÓ — TypeScript thuần 100%
 *
 * Vấn đề:
 *   User gõ "  MV Cyberpunk  30s  " lần 1
 *   User gõ "mv cyberpunk 30s"    lần 2
 *   → Ý giống nhau, nhưng chữ khác → Cache miss → Tốn API call thừa
 *
 * Giải pháp:
 *   Chuẩn hóa (normalize) cả 2 prompt về cùng 1 dạng trước khi tra cache:
 *   "  MV Cyberpunk  30s  " → "mv cyberpunk 30s"
 *   "mv cyberpunk 30s"      → "mv cyberpunk 30s"
 *   → Cache HIT! Không cần gọi AI lần 2.
 *
 * Các bước chuẩn hóa:
 *   1. Trim khoảng trắng đầu/cuối
 *   2. Chuyển về chữ thường (lowercase)
 *   3. Gộp nhiều khoảng trắng liên tiếp thành 1
 *   4. Bỏ dấu câu thừa (.,!?) không ảnh hưởng ý nghĩa prompt
 *
 * Giới hạn (phải thành thật):
 *   - KHÔNG bắt được "video cyberpunk 30 giây" vs "MV Cyberpunk 30s"
 *     (khác từ vựng nhưng cùng ý → cần Semantic Search, vượt scope dự án)
 *   - Chỉ bắt được: viết hoa/thường, khoảng trắng thừa, dấu câu thừa
 *     → Đủ tốt cho demo, và trung thực về giới hạn khi phỏng vấn
 */

/**
 * Chuẩn hóa prompt để tăng tỷ lệ Cache Hit
 *
 * @param prompt - Prompt thô từ user
 * @returns Prompt đã chuẩn hóa (lowercase, trimmed, single-spaced)
 *
 * Ví dụ:
 *   normalizePrompt("  MV Cyberpunk  30s!  ") → "mv cyberpunk 30s"
 *   normalizePrompt("MV CYBERPUNK 30S")       → "mv cyberpunk 30s"
 *   normalizePrompt("mv cyberpunk 30s")        → "mv cyberpunk 30s"
 *   → Cả 3 đều khớp → Cache HIT!
 *
 * Time: O(N) với N = độ dài prompt | Space: O(N)
 */
export const normalizePrompt = (prompt: string): string => {
  return prompt
    .trim()                          // Bỏ khoảng trắng đầu/cuối
    .toLowerCase()                   // "MV" → "mv"
    .replace(/[.,!?;:'"]+/g, '')     // Bỏ dấu câu thừa
    .replace(/\s+/g, ' ');           // "  " → " " (gộp khoảng trắng)
};
