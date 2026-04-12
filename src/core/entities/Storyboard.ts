/**
 * Storyboard.ts — Định nghĩa cấu trúc một Bảng kịch bản hoàn chỉnh
 *
 * 📍 Tầng: core/entities (Tầng 1 — Lõi hệ thống)
 * 📦 Dependencies: Chỉ import từ core/ — KHÔNG có thư viện ngoài
 *
 * Giải thích:
 * Một Storyboard = "Tập hợp nhiều Scene xếp theo thứ tự".
 *
 * Ví dụ:
 *   Storyboard "MV Cyberpunk 30s" chứa 5 Scene:
 *     Scene 1: Nữ chính đứng dưới mưa
 *     Scene 2: Cận cảnh tai nghe phát sáng
 *     Scene 3: Chạy qua hẻm neon
 *     Scene 4: Đối mặt villain
 *     Scene 5: Logo sản phẩm hiện lên
 *
 * Tại sao tách Storyboard riêng khỏi Scene?
 *   - Một người dùng có thể có NHIỀU Storyboard (VD: MV Cyberpunk, MV Retro, Clip hài)
 *   - Mỗi Storyboard chứa danh sách Scene riêng
 *   - Màn hình Home hiển thị danh sách Storyboard, bấm vào mới thấy Scene
 */

import { StoryboardID } from '../types/common';
import { IScene } from './Scene';

/**
 * IStoryboard — Interface mô tả một Bảng kịch bản
 */
export interface IStoryboard {
  /** ID duy nhất của Storyboard (Branded Type — chống nhầm với SceneID) */
  readonly id: StoryboardID;

  /** Tên do người dùng đặt (VD: "MV Cyberpunk 30s") */
  name: string;

  /** Prompt gốc mà người dùng đã gõ để sinh ra Storyboard này */
  originalPrompt: string;

  /**
   * Danh sách các Scene dưới dạng mảng phẳng (snapshot).
   *
   * Lưu ý: Đây là bản sao từ DoublyLinkedList.toArray().
   * Trong runtime, dữ liệu thực được quản lý bởi DoublyLinkedList (O(1) operations).
   * Mảng này chỉ dùng cho: UI hiển thị, lưu xuống MMKV, serialization.
   */
  scenes: IScene[];

  /** Thời điểm tạo Storyboard (Unix timestamp milliseconds) */
  readonly createdAt: number;

  /** Thời điểm chỉnh sửa gần nhất (Unix timestamp milliseconds) */
  updatedAt: number;
}

/**
 * Hàm tạo StoryboardID mới
 */
export const createStoryboardId = (): StoryboardID => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `sb_${timestamp}_${random}` as StoryboardID;
};
