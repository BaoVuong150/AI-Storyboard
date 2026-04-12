/**
 * IAiClient.ts — "Hợp đồng" trừu tượng cho dịch vụ AI
 *
 * 📍 Tầng: core/interfaces (Tầng 1 — Lõi hệ thống)
 * 📦 Dependencies: Chỉ import từ core/ — KHÔNG có thư viện ngoài
 *
 * Giải thích SOLID-D (Dependency Inversion):
 * Class StoryEngine (Tầng 2) cần gọi AI để sinh Scene.
 * Nhưng nó KHÔNG ĐƯỢC biết dùng Gemini hay Claude (đó là chi tiết của Tầng 3/4).
 *
 * Giải pháp: StoryEngine chỉ biết "Tôi cần một ai đó implements IAiClient".
 *   - GeminiAiClient implements IAiClient ✅ → Gọi Google Gemini API
 *   - ClaudeAiClient implements IAiClient ✅ → Gọi Anthropic Claude API
 *   - MockAiClient   implements IAiClient ✅ → Trả data giả để test
 *
 * Khi muốn đổi từ Gemini sang Claude:
 *   → Chỉ đổi 1 dòng inject ở Tầng 3: new StoryEngine(new ClaudeAiClient())
 *   → StoryEngine không sửa bất kỳ dòng nào. Đây là sức mạnh của Clean Architecture.
 */

import { IScene } from '../entities/Scene';
import { Result } from '../types/common';

/**
 * IAiClient — Interface cho bất kỳ dịch vụ AI nào
 *
 * Bất cứ class nào muốn "đóng vai" AI Client đều phải implements interface này.
 */
export interface IAiClient {
  /**
   * Gửi prompt cho AI và nhận về danh sách Scene được sinh tự động.
   *
   * @param prompt - Ý tưởng thô của người dùng (VD: "MV Cyberpunk 30s")
   * @param maxScenes - Số Scene tối đa được sinh (chống vượt Token limit)
   * @param signal - AbortSignal để hủy request khi app về background (Edge Case Domain 4.1)
   * @returns Result<IScene[]> — Thành công: mảng Scene | Thất bại: error message
   */
  generateScenes(
    prompt: string,
    maxScenes: number,
    signal?: AbortSignal,
  ): Promise<Result<IScene[]>>;
}
