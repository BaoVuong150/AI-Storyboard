/**
 * LRUCache.ts — Bộ Nhớ Đệm LRU (Least Recently Used)
 *
 * 📍 Tầng: use_cases/data_structures (Tầng 2 — Thuật toán)
 * 📦 Dependencies: Chỉ import từ core/ + DoublyLinkedList cùng tầng
 *
 * Cấu trúc bên trong: HashMap + DoublyLinkedList "song kiếm hợp bích"
 *   - HashMap (Map): Tìm kiếm O(1) theo key
 *   - LinkedList: Sắp xếp thứ tự "ai dùng gần nhất" → đầu tiên, "ai lâu nhất" → cuối
 *
 * Mục đích trong dự án:
 *   Tiết kiệm API credits (Free tier = giới hạn request/ngày).
 *   Khi user gõ "MV Cyberpunk 30s" lần 2 → trả kết quả từ cache, KHÔNG gọi AI.
 *
 * Tại sao phải tự xây thay vì dùng Map thường?
 *   Map thường không có cơ chế "auto-evict" khi đầy.
 *   LRU Cache tự động xóa phần tử ít dùng nhất khi vượt capacity.
 *   → Đây là điểm Show-off lớn nhất: tự implement cấu trúc dữ liệu nâng cao.
 */

import { INode } from '../../core/entities/Node';
import { ICacheStrategy } from '../../core/interfaces/ICacheStrategy';
import { DoublyLinkedList } from './DoublyLinkedList';

/** Cấu trúc mỗi entry trong Cache: lưu cả key lẫn value */
interface CacheEntry<K, V> {
  readonly key: K;
  value: V;
}

/**
 * Class LRUCache<K, V> — Implements ICacheStrategy (SOLID-D)
 *
 * K = Kiểu key (VD: string — prompt của user)
 * V = Kiểu value (VD: IScene[] — danh sách Scene AI trả về)
 *
 * Ví dụ:
 *   const cache = new LRUCache<string, IScene[]>(10); // Tối đa 10 prompt
 *   cache.put("MV Cyberpunk", scenes);                 // Lưu vào
 *   cache.get("MV Cyberpunk");                          // Lấy ra → O(1), không gọi AI
 */
export class LRUCache<K, V> implements ICacheStrategy<K, V> {
  /** HashMap: key → Node trong LinkedList (tra cứu O(1)) */
  private readonly map: Map<K, INode<CacheEntry<K, V>>> = new Map();

  /** LinkedList: đầu = mới nhất, đuôi = cũ nhất (sẽ bị xóa đầu tiên) */
  private readonly list: DoublyLinkedList<CacheEntry<K, V>> = new DoublyLinkedList();

  /** Sức chứa tối đa */
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  /**
   * Lấy value theo key
   * - Nếu tìm thấy: trả value + đẩy lên đầu (đánh dấu "vừa dùng")
   * - Nếu không: trả undefined
   *
   * Time: O(1) | Space: O(1)
   */
  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;

    this.list.moveToHead(node);    // Đẩy lên đầu = "vừa dùng gần nhất"
    return node.data.value;
  }

  /**
   * Thêm hoặc cập nhật cặp key-value
   * - Nếu key đã tồn tại: cập nhật value + đẩy lên đầu
   * - Nếu key mới + cache đầy: XÓA phần tử cuối (Least Recently Used) trước
   *
   * Time: O(1) | Space: O(1)
   */
  put(key: K, value: V): void {
    const existingNode = this.map.get(key);

    if (existingNode) {
      existingNode.data.value = value;
      this.list.moveToHead(existingNode);
      return;
    }

    // Cache đầy → xóa đuôi (phần tử cũ nhất)
    if (this.list.size >= this.capacity) {
      const tailNode = this.list.tail;
      if (tailNode) {
        this.map.delete(tailNode.data.key);
        this.list.remove(tailNode);
      }
    }

    // Thêm mới vào đầu
    const newNode = this.list.prepend({ key, value });
    this.map.set(key, newNode);
  }

  /** Kiểm tra key có trong cache không (không đổi thứ tự) — Time: O(1) */
  has(key: K): boolean { return this.map.has(key); }

  /**
   * Xóa một key khỏi cache
   * Time: O(1)
   */
  evict(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;

    this.list.remove(node);
    this.map.delete(key);
    return true;
  }

  /** Số phần tử hiện tại — Time: O(1) */
  size(): number { return this.list.size; }

  /** Xóa toàn bộ cache — Time: O(1) */
  clear(): void {
    this.list.clear();
    this.map.clear();
  }
}
