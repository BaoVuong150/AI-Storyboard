/**
 * UndoRedoStack.ts — Ngăn xếp Undo/Redo (Two-Stack Pattern)
 *
 * 📍 Tầng: use_cases/data_structures (Tầng 2 — Thuật toán)
 * 📦 Dependencies: KHÔNG CÓ — TypeScript thuần 100%
 *
 * Nguyên lý hoạt động (giống Ctrl+Z trong Word):
 * Có 2 chồng giấy úp ngược:
 *   - undoStack: Chồng "Quá khứ" — mỗi lần làm gì đó, chụp ảnh trạng thái cũ bỏ vào
 *   - redoStack: Chồng "Tương lai" — khi Undo, trạng thái hiện tại bị đẩy sang đây
 *
 * Ví dụ:
 *   1. Ban đầu có 3 Scene: [A, B, C]
 *   2. Xóa Scene B → undoStack: [[A,B,C]], hiện tại: [A, C]
 *   3. Bấm Undo   → undoStack: [], redoStack: [[A,C]], hiện tại: [A, B, C] (quay lại!)
 *   4. Bấm Redo   → undoStack: [[A,B,C]], redoStack: [], hiện tại: [A, C] (xóa lại!)
 *
 * Tại sao giới hạn MAX_HISTORY?
 *   Mỗi snapshot lưu toàn bộ danh sách Scene → chiếm RAM.
 *   Trên điện thoại RAM rất quý → giới hạn 30 bước để không bị OOM (Out Of Memory).
 */

/** Số bước Undo tối đa — chống tràn RAM trên thiết bị di động */
const DEFAULT_MAX_HISTORY = 30;

/**
 * Class UndoRedoStack<T> — Quản lý lịch sử thao tác
 *
 * Generic <T> thường là IScene[] (snapshot toàn bộ danh sách Scene).
 * Push vào 1 bản sao trạng thái TRƯỚC KHI thực hiện thao tác.
 */
export class UndoRedoStack<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory: number = DEFAULT_MAX_HISTORY) {
    this.maxHistory = maxHistory;
  }

  /**
   * Lưu trạng thái hiện tại vào chồng Undo (gọi TRƯỚC khi thay đổi dữ liệu)
   *
   * Khi user thực hiện hành động mới → xóa sạch chồng Redo
   * (vì "tương lai cũ" không còn hợp lệ khi đã rẽ nhánh mới)
   *
   * Time: O(1) amortized | Space: O(1) per call
   */
  push(state: T): void {
    this.undoStack.push(state);
    this.redoStack = [];

    // Chống rò rỉ bộ nhớ: xóa snapshot cũ nhất nếu vượt giới hạn
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo — Quay lại trạng thái trước đó
   *
   * @param currentState - Trạng thái HIỆN TẠI (sẽ bị đẩy sang redoStack)
   * @returns Trạng thái trước đó, hoặc undefined nếu không có gì để Undo
   *
   * Time: O(1) | Space: O(1)
   */
  undo(currentState: T): T | undefined {
    const previousState = this.undoStack.pop();
    if (previousState === undefined) return undefined;

    this.redoStack.push(currentState);
    return previousState;
  }

  /**
   * Redo — Làm lại thao tác vừa Undo
   *
   * @param currentState - Trạng thái HIỆN TẠI (sẽ bị đẩy sang undoStack)
   * @returns Trạng thái tiếp theo, hoặc undefined nếu không có gì để Redo
   *
   * Time: O(1) | Space: O(1)
   */
  redo(currentState: T): T | undefined {
    const nextState = this.redoStack.pop();
    if (nextState === undefined) return undefined;

    this.undoStack.push(currentState);
    return nextState;
  }

  /** Kiểm tra có thể Undo không — Time: O(1) */
  canUndo(): boolean { return this.undoStack.length > 0; }

  /** Kiểm tra có thể Redo không — Time: O(1) */
  canRedo(): boolean { return this.redoStack.length > 0; }

  /** Lấy số bước Undo còn lại — Time: O(1) */
  get undoCount(): number { return this.undoStack.length; }

  /** Lấy số bước Redo còn lại — Time: O(1) */
  get redoCount(): number { return this.redoStack.length; }

  /** Xóa toàn bộ lịch sử — Time: O(1) */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
