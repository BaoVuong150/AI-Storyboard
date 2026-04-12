/**
 * Scene.ts — Định nghĩa cấu trúc dữ liệu của một Cảnh quay (Scene)
 *
 * 📍 Tầng: core/entities (Tầng 1 — Lõi hệ thống)
 * 📦 Dependencies: Chỉ import từ core/types — KHÔNG có thư viện ngoài
 *
 * Đây là "bộ gen" của một Cảnh quay.
 * Khi AI (Gemini/Claude) sinh ra kịch bản, mỗi cảnh quay sẽ có đúng hình dáng này.
 * Khi UI vẽ một thẻ SceneCard, nó sẽ nhận đúng kiểu dữ liệu này.
 */

import { SceneID } from '../types/common';

/**
 * IScene — Interface mô tả một Cảnh quay trong Storyboard
 *
 * Ví dụ một Scene thực tế:
 * {
 *   id: "sc_001" as SceneID,
 *   title: "Nữ chính đứng dưới mưa",
 *   action: "Nhân vật quay lưng, nhìn về phía hẻm tối, tay nắm chặt tai nghe",
 *   cameraAngle: "Wide Shot - Toàn cảnh",
 *   lighting: "Neon xanh + Mưa phản chiếu",
 *   duration: 3,
 *   createdAt: 1712880000000
 * }
 */
export interface IScene {
  /** ID duy nhất của cảnh quay (Branded Type — chống nhầm với StoryboardID) */
  readonly id: SceneID;

  /** Tiêu đề ngắn gọn mô tả cảnh (VD: "Nữ chính đứng dưới mưa") */
  title: string;

  /** Mô tả chi tiết hành động diễn ra trong cảnh */
  action: string;

  /** Góc máy quay (VD: "Wide Shot", "Close-up", "Bird's Eye View") */
  cameraAngle: string;

  /** Mô tả ánh sáng (VD: "Neon xanh", "Golden Hour", "Chiaroscuro") */
  lighting: string;

  /** Thời lượng cảnh quay tính bằng giây */
  duration: number;

  /** Thời điểm tạo (Unix timestamp milliseconds) */
  readonly createdAt: number;
}

/**
 * Hàm tạo SceneID mới (sử dụng UUID-like format)
 *
 * Tại sao không dùng thư viện uuid?
 * → Vì tầng core/ cấm import thư viện ngoài (Rule 01).
 *   Hàm này dùng Math.random() + Date.now() đủ tốt cho mục đích demo.
 */
export const createSceneId = (): SceneID => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `sc_${timestamp}_${random}` as SceneID;
};
