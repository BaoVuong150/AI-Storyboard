/**
 * safeParseAiResponse.ts — Bộ phân tích JSON AI an toàn
 *
 * 📍 Tầng: adapters/dto (Tầng 3 — Interface Adapters)
 * 📦 Dependencies: zod, core/entities (import lên, không xuống)
 *
 * Đây là "Cổng kiểm soát an ninh" duy nhất cho dữ liệu AI vào App.
 * Mọi JSON từ Gemini/Claude đều PHẢI qua đây trước khi chạm vào StoryEngine.
 *
 * Chiến lược: "Được bao nhiêu lấy bấy nhiêu"
 *   - AI trả 10 scene đầy đủ → Lấy 10
 *   - AI trả 7 scene rồi gãy giữa chừng → Cứu 7, bỏ cái thứ 8 bị cụt
 *   - AI trả rác hoàn toàn → Báo lỗi
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
import { AiResponseSchema, AiSceneSchema, AiSceneDTO } from './sceneSchema';


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
 * Cố cứu JSON bị cụt đuôi do AI hết Token giữa chừng
 * 
 * Ví dụ input:
 *   '[{"title":"A",...},{"title":"B",...},{"titl'
 *                                         ↑ AI chết ở đây
 * 
 * Chiến thuật:
 *   1. Tìm dấu "}" cuối cùng (kết thúc object hoàn chỉnh cuối cùng)
 *   2. Cắt bỏ phần rác phía sau
 *   3. Đóng mảng bằng "]"
 *   4. Parse lại → Lấy được các scene hoàn chỉnh
 * 
 * Time: O(N) với N = độ dài chuỗi
 */
const tryRecoverTruncatedJson = (raw: string): unknown | null => {
  // EC-6.19: Chém đuôi (Tail Trimming). Để tránh ReDoS làm cháy Main Thread,
  // chúng ta CHỈ dò tìm trên 2000 ký tự cuối thay vì chuỗi khổng lồ.
  const tailStr = raw.length > 2000 ? raw.slice(-2000) : raw;
  const tailCloseBraceIndex = tailStr.lastIndexOf('}');
  
  if (tailCloseBraceIndex === -1) return null;

  // Cắt và khâu vết thương
  const actualBraceIndex = raw.length > 2000 
    ? raw.length - 2000 + tailCloseBraceIndex 
    : tailCloseBraceIndex;
    
  const recovered = raw.substring(0, actualBraceIndex + 1) + ']';

  try {
    return JSON.parse(recovered);
  } catch {
    return null;
  }
};

/**
 * Parse và validate toàn bộ response từ AI
 *
 * Chiến lược "Được bao nhiêu lấy bấy nhiêu":
 *   1. JSON.parse(raw) — thử parse string → object
 *   2. Nếu parse lỗi → tryRecoverTruncatedJson() cứu đuôi
 *   3. Nếu vẫn lỗi → Result.failure("AI trả dữ liệu không hợp lệ")
 *   4. Zod validate TỪNG scene riêng lẻ → lọc bỏ scene lỗi, giữ scene tốt
 *   5. mapToScenes() → regen ID → Result.success(IScene[])
 *
 * @param raw - Chuỗi JSON thô từ AI response body
 * @returns Result<IScene[]> — thành công hoặc lỗi có message rõ ràng
 *
 * Time: O(N) với N = số Scene trong response
 */
export const safeParseAiResponse = (raw: string): Result<IScene[]> => {
  // EC-6.19: Nếu AI đơm 1 đống rác dài 5MB -> Dừng luôn chống Crash.
  if (raw.length > 50000) {
    return createFailure('Lỗi: AI trả về nội dung quá lớn, có thể gây treo hệ thống. Vui lòng thiết lập lại ý tưởng ngắn hơn.');
  }

  // Bước 1: Thử parse JSON gốc
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Bước 2: JSON gãy → thử cứu phần hoàn chỉnh
    const recovered = tryRecoverTruncatedJson(raw);
    if (!recovered) {
      return createFailure('AI trả dữ liệu hỏng hoàn toàn, không cứu được. Vui lòng thử lại.');
    }
    parsed = recovered;
    if (__DEV__) console.log('[Parser] 🩹 Đã cứu JSON bị cụt thành công!');
  }

  // Bước 3: Thử validate toàn bộ mảng (trường hợp lý tưởng)
  const zodResult = AiResponseSchema.safeParse(parsed);
  if (zodResult.success) {
    const scenes = mapToScenes(zodResult.data);
    return createSuccess(scenes);
  }

  // Bước 4: Validate thất bại toàn bộ → thử cứu từng scene riêng lẻ
  // (Vì AI có thể trả 7 scene tốt + 1 scene bị cụt)
  if (Array.isArray(parsed)) {
    const validScenes: AiSceneDTO[] = [];
    for (const item of parsed) {
      const sceneResult = AiSceneSchema.safeParse(item);
      if (sceneResult.success) {
        validScenes.push(sceneResult.data);
      }
    }

    if (validScenes.length > 0) {
      if (__DEV__) {
        console.log(`[Parser] 🩹 Cứu được ${validScenes.length}/${(parsed as unknown[]).length} scenes`);
      }
      const scenes = mapToScenes(validScenes);
      return createSuccess(scenes);
    }
  }

  // Bước 5: Không cứu được gì → báo lỗi
  const firstError = zodResult.error.issues[0];
  return createFailure(
    `AI trả dữ liệu sai cấu trúc: ${firstError?.path.join('.')} — ${firstError?.message}`,
  );
};
