/**
 * sceneSchema.ts — Zod Schema cho AI Response (Tấm khiên Runtime)
 *
 * 📍 Tầng: adapters/dto (Tầng 3 — Interface Adapters)
 * 📦 Dependencies: zod (thư viện ngoài — CHỈ dùng ở Tầng 3+)
 *
 * Vai trò:
 *   AI (Gemini/Claude) trả JSON về → Zod quét kiểm tra → Đúng? Cho vào Engine
 *                                                        → Sai? Chặn lại, báo lỗi
 *
 * Tại sao cần Zod khi đã có TypeScript Interface?
 *   - TypeScript kiểm tra lúc CODE (compile-time) → bảo vệ Dev khỏi gõ sai
 *   - Zod kiểm tra lúc CHẠY (runtime) → bảo vệ App khỏi dữ liệu bẩn từ AI
 *   - AI có thể "ảo giác" trả { duration: "30 giây" } thay vì { duration: 30 }
 *     → TypeScript không biết, Zod bắt được!
 *
 * Tuân thủ:
 *   - Rule 03.2: Runtime Boundary Validation
 *   - Rule 05.1: KHÔNG có `any` — Zod tự suy diễn type
 *   - Domain 3.2: Mọi payload AI phải qua Zod
 */

import { z } from 'zod';

/**
 * Schema cho 1 Scene MÀ AI TRẢ VỀ (chưa có id và createdAt)
 *
 * Lưu ý: AI chỉ cung cấp NỘI DUNG sáng tạo.
 * id và createdAt do App sinh ở bước sau (3A.4) — chống AI Duplicate ID.
 *
 * Domain 3.1: System Prompt ép AI trả JSON với cấu trúc này
 */
export const AiSceneSchema = z.object({
  title: z.string().min(1, 'Scene phải có tiêu đề'),
  action: z.string().min(1, 'Scene phải có mô tả hành động'),
  cameraAngle: z.string().min(1, 'Scene phải có góc máy'),
  lighting: z.string().min(1, 'Scene phải có mô tả ánh sáng'),
  duration: z
    .number()
    .min(1, 'Thời lượng tối thiểu 1 giây')
    .max(120, 'Thời lượng tối đa 120 giây'),
});

/** Type suy diễn từ Zod — dùng thay cho interface riêng */
export type AiSceneDTO = z.infer<typeof AiSceneSchema>;

/**
 * Schema cho TOÀN BỘ mảng Scene AI trả về
 *
 * Ràng buộc:
 *   - min(1): Chặn mảng rỗng (AI không sinh được gì)
 *   - max(20): Chặn AI sinh quá nhiều Scene tốn RAM
 *     (Domain 4.2: giới hạn output để tránh Truncated JSON)
 */
export const AiResponseSchema = z
  .array(AiSceneSchema)
  .min(1, 'AI phải sinh ít nhất 1 cảnh quay')
  .max(20, 'Tối đa 20 cảnh quay để đảm bảo hiệu năng');
