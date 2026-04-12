/**
 * DoublyLinkedList.ts — Chuỗi Xích Đôi (Doubly Linked List)
 *
 * 📍 Tầng: use_cases/data_structures (Tầng 2 — Thuật toán)
 * 📦 Dependencies: Chỉ import từ core/ — KHÔNG có thư viện ngoài
 *
 * Hình dung:
 *   null ← [Scene 1] ⇄ [Scene 2] ⇄ [Scene 3] → null
 *            ↑ head                      ↑ tail
 *
 * Mỗi "hộp" (Node) giữ 2 sợi dây:
 *   - prev: dây nối về hộp TRƯỚC
 *   - next: dây nối về hộp SAU
 *
 * Khi kéo thả Scene trên điện thoại:
 *   - Array.splice(): Dịch chuyển hàng loạt phần tử → O(N) chậm
 *   - LinkedList: Chỉ tháo/nối lại 4 sợi dây → O(1) nhanh
 */

import { INode } from '../../core/entities/Node';

/**
 * Class DoublyLinkedList<T> — Quản lý danh sách có thứ tự
 *
 * Dùng cho: Quản lý thứ tự các Scene trong Storyboard.
 * Khi user kéo Scene 3 thả vào vị trí Scene 1 → chỉ đổi 4 con trỏ → O(1)
 */
export class DoublyLinkedList<T> {
  private _head: INode<T> | null = null;
  private _tail: INode<T> | null = null;
  private _size: number = 0;

  /** Lấy Node đầu tiên — Time: O(1) */
  get head(): INode<T> | null { return this._head; }

  /** Lấy Node cuối cùng — Time: O(1) */
  get tail(): INode<T> | null { return this._tail; }

  /** Đếm số phần tử — Time: O(1) */
  get size(): number { return this._size; }

  /**
   * Thêm phần tử vào CUỐI danh sách
   * Giống: Xếp thêm 1 lá bài vào cuối hàng
   * Time: O(1) | Space: O(1)
   */
  append(data: T): INode<T> {
    const newNode: INode<T> = { data, prev: this._tail, next: null };

    if (this._tail) {
      this._tail.next = newNode;   // Nối dây "next" của lá cuối cũ sang lá mới
    } else {
      this._head = newNode;        // Danh sách trống → lá mới cũng là đầu
    }

    this._tail = newNode;          // Lá mới trở thành đuôi
    this._size++;
    return newNode;
  }

  /**
   * Thêm phần tử vào ĐẦU danh sách
   * Giống: Chèn 1 lá bài vào trước tất cả
   * Time: O(1) | Space: O(1)
   */
  prepend(data: T): INode<T> {
    const newNode: INode<T> = { data, prev: null, next: this._head };

    if (this._head) {
      this._head.prev = newNode;   // Nối dây "prev" của lá đầu cũ sang lá mới
    } else {
      this._tail = newNode;        // Danh sách trống → lá mới cũng là đuôi
    }

    this._head = newNode;          // Lá mới trở thành đầu
    this._size++;
    return newNode;
  }

  /**
   * Gỡ bỏ một Node ra khỏi chuỗi (không cần biết vị trí, chỉ cần tham chiếu)
   * Giống: Rút 1 lá bài ra khỏi hàng, 2 lá bên cạnh tự nối lại
   * Time: O(1) | Space: O(1)
   */
  remove(node: INode<T>): void {
    if (node.prev) { node.prev.next = node.next; }
    else { this._head = node.next; }

    if (node.next) { node.next.prev = node.prev; }
    else { this._tail = node.prev; }

    node.prev = null;
    node.next = null;
    this._size--;
  }

  /**
   * Di chuyển Node lên ĐẦU danh sách (không tạo node mới, giữ nguyên tham chiếu)
   * Dùng cho: LRU Cache — đánh dấu "vừa được dùng gần nhất"
   * Time: O(1) | Space: O(1)
   */
  moveToHead(node: INode<T>): void {
    if (node === this._head) return;

    this.remove(node);

    node.prev = null;
    node.next = this._head;
    if (this._head) { this._head.prev = node; }
    this._head = node;
    if (!this._tail) { this._tail = node; }
    this._size++;
  }

  /**
   * Di chuyển Node sang SAU một Node khác (dùng cho kéo thả)
   * Ví dụ: moveAfter(Scene3, Scene1) → [1] ⇄ [3] ⇄ [2] ⇄ [4]
   * Time: O(1) | Space: O(1)
   */
  moveAfter(node: INode<T>, target: INode<T>): void {
    if (node === target || node.prev === target) return;

    this.remove(node);

    node.prev = target;
    node.next = target.next;
    if (target.next) { target.next.prev = node; }
    else { this._tail = node; }
    target.next = node;
    this._size++;
  }

  /**
   * Chuyển toàn bộ Linked List thành Array phẳng (cho Zustand/UI đọc)
   * Đây là "cầu nối" OOP → React: Class mutate xong → clone ra mảng → Zustand set()
   * Time: O(N) | Space: O(N)
   */
  toArray(): T[] {
    const result: T[] = [];
    let current = this._head;
    while (current) {
      result.push(current.data);
      current = current.next;
    }
    return result;
  }

  /**
   * Tìm Node theo điều kiện (dùng khi cần tìm Scene theo ID)
   * Time: O(N) — phải duyệt từng Node
   */
  findNode(predicate: (data: T) => boolean): INode<T> | null {
    let current = this._head;
    while (current) {
      if (predicate(current.data)) return current;
      current = current.next;
    }
    return null;
  }

  /**
   * Xóa toàn bộ danh sách + cắt sạch pointer từng node
   * Time: O(N) — phải duyệt cắt từng node để GC thu hồi an toàn
   */
  clear(): void {
    let current = this._head;
    while (current) {
      const next = current.next;
      current.prev = null;
      current.next = null;
      current = next;
    }
    this._head = null;
    this._tail = null;
    this._size = 0;
  }
}
