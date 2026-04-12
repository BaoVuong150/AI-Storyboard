/**
 * common.ts — Kiểu dữ liệu dùng chung cho toàn bộ hệ thống
 *
 * 📍 Tầng: core/types (Tầng 1 — Lõi hệ thống)
 * 📦 Dependencies: KHÔNG CÓ — TypeScript thuần 100%
 *
 * File này định nghĩa:
 * 1. Branded Types: "Đóng dấu" lên string để TypeScript phân biệt các loại ID
 * 2. Result Type: Kiểu trả về chuẩn cho mọi thao tác có thể thành công hoặc thất bại
 */

// ============================================================
// BRANDED TYPES
// ============================================================
//
// Giải thích cho người mới:
// Bình thường SceneID và StoryboardID đều là "string".
// TypeScript sẽ cho phép bạn viết: deleteScene(storyboardId) mà không báo lỗi.
// Branded Type thêm một "nhãn dán ẩn" (__brand) để TypeScript phân biệt chúng.
//
// Ví dụ:
//   const sceneId = 'abc' as SceneID;         // ✅ Được phép
//   const storyId = 'xyz' as StoryboardID;    // ✅ Được phép
//   deleteScene(storyId);                      // ❌ TypeScript báo lỗi!
// ============================================================

/** ID duy nhất của một Cảnh quay (Scene) */
export type SceneID = string & { readonly __brand: 'SceneID' };

/** ID duy nhất của một Bảng kịch bản (Storyboard) */
export type StoryboardID = string & { readonly __brand: 'StoryboardID' };

// ============================================================
// RESULT TYPE
// ============================================================
//
// Giải thích:
// Thay vì dùng try/catch và throw Error (dễ bị AI quên bắt lỗi),
// ta dùng kiểu Result<T> để ép buộc người gọi hàm phải xử lý cả 2 trường hợp.
//
// Ví dụ:
//   const result = await aiClient.generateScenes(prompt);
//   if (result.success) {
//     console.log(result.data);    // TypeScript tự hiểu data là IScene[]
//   } else {
//     showToast(result.error);      // TypeScript tự hiểu error là string
//   }
// ============================================================

/** Kết quả thành công */
export interface SuccessResult<T> {
  readonly success: true;
  readonly data: T;
}

/** Kết quả thất bại */
export interface FailureResult {
  readonly success: false;
  readonly error: string;
}

/** Kiểu trả về chuẩn: Thành công (chứa data) hoặc Thất bại (chứa error message) */
export type Result<T> = SuccessResult<T> | FailureResult;

// ============================================================
// HELPER FUNCTIONS — Tạo Result nhanh gọn
// ============================================================

/** Tạo kết quả thành công */
export const createSuccess = <T>(data: T): SuccessResult<T> => ({
  success: true,
  data,
});

/** Tạo kết quả thất bại */
export const createFailure = (error: string): FailureResult => ({
  success: false,
  error,
});
