/**
 * Node.ts — Định nghĩa cấu trúc một Node trong Doubly Linked List
 *
 * 📍 Tầng: core/entities (Tầng 1 — Lõi hệ thống)
 * 📦 Dependencies: KHÔNG CÓ — TypeScript thuần 100%
 *
 * Giải thích cho người mới:
 * Doubly Linked List là một chuỗi các "hộp" (Node) nối với nhau.
 * Mỗi hộp chứa 3 thứ:
 *   1. data: Dữ liệu thật (VD: một IScene)
 *   2. prev: Mũi tên chỉ về hộp TRƯỚC nó (hoặc null nếu là đầu chuỗi)
 *   3. next: Mũi tên chỉ về hộp SAU nó (hoặc null nếu là cuối chuỗi)
 *
 * Hình dung:
 *   null ← [Scene 1] ⇄ [Scene 2] ⇄ [Scene 3] → null
 *            ↑ head                      ↑ tail
 *
 * Tại sao dùng Linked List thay vì Array?
 *   - Array: Chèn/xóa ở giữa phải dịch toàn bộ phần tử → O(N)
 *   - Linked List: Chỉ đổi 2-4 con trỏ prev/next → O(1)
 *   Khi kéo thả Scene trên điện thoại, O(1) = mượt mà, O(N) = giật lag.
 */

/**
 * INode<T> — Interface mô tả một Node trong Doubly Linked List
 *
 * Generic <T> cho phép Node chứa bất kỳ kiểu dữ liệu nào:
 *   - INode<IScene>  → Node chứa Cảnh quay
 *   - INode<string>  → Node chứa chuỗi ký tự (cho LRU Cache key)
 */
export interface INode<T> {
  /** Dữ liệu thực tế mà Node đang "ôm" */
  data: T;

  /** Con trỏ chỉ về Node phía trước (null nếu là head) */
  prev: INode<T> | null;

  /** Con trỏ chỉ về Node phía sau (null nếu là tail) */
  next: INode<T> | null;
}
