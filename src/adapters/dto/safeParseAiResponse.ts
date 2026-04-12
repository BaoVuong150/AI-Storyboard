/**
 * safeParseAiResponse.ts — Bộ phân tích JSON AI an toàn
 *
 * 📍 Tầng: adapters/dto (Tầng 3 — Interface Adapters)
 * 📦 Dependencies: zod, core/entities (import lên, không xuống)
 *
 * Đây là "Cổng kiểm soát an ninh" duy nhất cho dữ liệu AI vào App.
 * Mọi JSON từ Gemini/Claude đều PHẢI qua đây trước khi chạm vào StoryEngine.
 *
 * Luồng 3 bước:
 *   1. JSON.parse(raw) — thử parse gốc
 *   2. Nếu lỗi → regex cắt đến "}" cuối cùng hợp lệ → thêm "]" → parse lại
 *      (Domain 4.2: cứu đuôi JSON bị Truncated do AI hết Token)
 *   3. Zod validate → regen ID → trả Result<IScene[]>
 *
 * Tuân thủ:
 *   - Rule 03.2: Runtime Boundary Validation (Zod)
 *   - Rule 03.3: No Silent Failures (trả Result.failure, không nuốt lỗi)
 *   - Rule 05.1: KHÔNG có `any` — dùng `unknown` + Zod narrowing
 *   - Domain 3.2: Mọi payload AI phải qua Zod
 *   - Domain 4.2: Xử lý Truncated JSON
 */

import { IScene, createSceneId } from '../../core/entities/Scene';
import { Result, createSuccess, createFailure } from '../../core/types/common';
import { AiResponseSchema, AiSceneDTO } from './sceneSchema';

/**
 * Thử parse JSON đã bị cắt đuôi (Truncated Response)
 *
 * Khi AI hết Token giữa chừng, JSON bị gãy:
 *   '[{"title":"Cảnh A"}, {"ti' ← gãy ở đây
 *
 * Chiến lược cứu đuôi:
 *   1. Tìm "}" cuối cùng trong chuỗi (vị trí Scene hoàn chỉnh cuối cùng)
 *   2. Cắt chuỗi đến đó + thêm "]" đóng mảng
 *   3. Thử parse lại → cứu được các Scene đã sinh hoàn chỉnh
 *
 * Time: O(N) với N = độ dài chuỗi JSON
 *
 * @param raw - Chuỗi JSON thô đã bị gãy
 * @returns Mảng parsed hoặc null nếu không cứu được
 */
const tryRecoverTruncatedJson = (raw: string): unknown | null => {
  const lastCloseBrace = raw.lastIndexOf('}');
  if (lastCloseBrace === -1) return null;

  const trimmed = raw.substring(0, lastCloseBrace + 1);

  // Tìm "[" mở đầu mảng
  const firstOpenBracket = trimmed.indexOf('[');
  if (firstOpenBracket === -1) return null;

  const recovered = trimmed.substring(firstOpenBracket) + ']';

  try {
    return JSON.parse(recovered);
  } catch {
    return null;
  }
};

/**
 * Chuyển đổi AiSceneDTO (dữ liệu AI thô) → IScene (dữ liệu App chuẩn)
 *
 * Rule quan trọng (3A.4):
 *   - AI CHỈ cung cấp nội dung sáng tạo (title, action, cameraAngle, lighting, duration)
 *   - id và createdAt do APP sinh — KHÔNG BAO GIỜ tin ID từ AI
 *   - Chống AI Duplicate ID Collision (EC-2.9 → dời sang EPIC 3)
 *
 * Time: O(N) với N = số Scene
 */
const mapToScenes = (dtos: AiSceneDTO[]): IScene[] => {
  return dtos.map((dto) => ({
    id: createSceneId(),
    title: dto.title,
    action: dto.action,
    cameraAngle: dto.cameraAngle,
    lighting: dto.lighting,
    duration: dto.duration,
    createdAt: Date.now(),
  }));
};

/**
 * Parse và validate toàn bộ response từ AI
 *
 * Đây là HÀM DUY NHẤT mà GeminiAiClient gọi để xử lý response.
 * Bên ngoài KHÔNG cần biết logic recover truncated hay Zod schema.
 *
 * Luồng:
 *   1. JSON.parse(raw) — thử parse string →  object
 *   2. Nếu parse lỗi → tryRecoverTruncatedJson() cứu đuôi
 *   3. Nếu vẫn lỗi → Result.failure("AI trả dữ liệu không hợp lệ")
 *   4. Zod validate → Result.failure nếu sai schema
 *   5. mapToScenes() → regen ID → Result.success(IScene[])
 *
 * @param raw - Chuỗi JSON thô từ AI response body
 * @returns Result<IScene[]> — thành công hoặc lỗi có message rõ ràng
 *
 * Time: O(N) với N = số Scene trong response
 */
export const safeParseAiResponse = (raw: string): Result<IScene[]> => {
  // Bước 1: Thử parse JSON gốc
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Bước 2: JSON gãy → thử cứu đuôi (Domain 4.2)
    parsed = tryRecoverTruncatedJson(raw);
    if (parsed === null) {
      return createFailure('AI trả dữ liệu không hợp lệ — không thể parse JSON');
    }
  }

  // Bước 3: Zod validate — ép kiểu cứng (Domain 3.2)
  const zodResult = AiResponseSchema.safeParse(parsed);
  if (!zodResult.success) {
    const firstError = zodResult.error.issues[0];
    return createFailure(
      `AI trả dữ liệu sai cấu trúc: ${firstError?.path.join('.')} — ${firstError?.message}`,
    );
  }

  // Bước 4: Regen ID — App quản lý ID, không tin AI (3A.4)
  const scenes = mapToScenes(zodResult.data);

  return createSuccess(scenes);
};
