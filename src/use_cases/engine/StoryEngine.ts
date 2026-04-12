/**
 * StoryEngine.ts — Bộ Não Tổng Chỉ Huy (Facade Pattern)
 *
 * 📍 Tầng: use_cases/engine (Tầng 2 — Thuật toán)
 * 📦 Dependencies: Chỉ import từ core/ + data_structures/ cùng tầng
 *
 * Đây là "Giám đốc" điều phối 4 công nhân:
 *   1. DoublyLinkedList → Quản lý thứ tự Scene
 *   2. UndoRedoStack    → Lưu lịch sử thao tác
 *   3. LRUCache          → Cache kết quả AI (tiết kiệm API credits)
 *   4. IAiClient         → Gọi AI sinh Scene (được inject vào từ bên ngoài)
 *
 * UI (Tầng 4) và Zustand (Tầng 3) chỉ nói chuyện với StoryEngine.
 * Chúng KHÔNG ĐƯỢC biết bên trong có LinkedList hay Stack.
 *
 * Luồng hoạt động:
 *   UI: "Đổi chỗ Scene 3 với Scene 1!"
 *   → StoryEngine: Lưu snapshot → LinkedList.moveAfter() → Trả getSnapshot()
 *   → Zustand: set({ scenes: snapshot }) → UI tự vẽ lại
 */

import { IScene } from '../../core/entities/Scene';
import { SceneID } from '../../core/types/common';
import { IAiClient } from '../../core/interfaces/IAiClient';
import { INode } from '../../core/entities/Node';
import { Result, createSuccess, createFailure } from '../../core/types/common';
import { DoublyLinkedList } from '../data_structures/DoublyLinkedList';
import { UndoRedoStack } from '../data_structures/UndoRedoStack';
import { LRUCache } from '../data_structures/LRUCache';
import { normalizePrompt } from './normalizePrompt';

/**
 * Class StoryEngine — Cầu nối giữa Thuật toán và Thế giới bên ngoài
 *
 * Constructor nhận IAiClient (Dependency Injection):
 *   new StoryEngine(geminiClient)   → dùng Gemini
 *   new StoryEngine(claudeClient)   → dùng Claude
 *   new StoryEngine(mockClient)     → dùng data giả để test
 */
export class StoryEngine {
  /** Chuỗi xích đôi: quản lý thứ tự Scene — O(1) reorder */
  private readonly sceneList: DoublyLinkedList<IScene>;

  /** Ngăn xếp Undo/Redo: lưu lịch sử — O(1) push/pop */
  private readonly history: UndoRedoStack<IScene[]>;

  /** Bảng tra nhanh: SceneID → Node reference — O(1) lookup */
  private readonly nodeMap: Map<SceneID, INode<IScene>>;

  /** Cache prompt → kết quả AI (tiết kiệm Free-tier API credits) — O(1) get/put */
  private readonly promptCache: LRUCache<string, IScene[]>;

  /** AI Client (được inject từ bên ngoài — SOLID-D) */
  private readonly aiClient: IAiClient;

  constructor(aiClient: IAiClient, cacheCapacity: number = 10) {
    this.sceneList = new DoublyLinkedList();
    this.history = new UndoRedoStack();
    this.nodeMap = new Map();
    this.promptCache = new LRUCache(cacheCapacity);
    this.aiClient = aiClient;
  }

  // ═══════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════

  /** Chụp ảnh trạng thái hiện tại và lưu vào lịch sử (gọi TRƯỚC mỗi thao tác) */
  private saveSnapshot(): void {
    this.history.push(this.getSnapshot());
  }

  /**
   * Xây lại LinkedList từ mảng phẳng (dùng khi Undo/Redo)
   * Time: O(N) — phải duyệt toàn bộ mảng
   */
  private rebuildFromSnapshot(scenes: IScene[]): void {
    this.sceneList.clear();
    this.nodeMap.clear();
    for (const scene of scenes) {
      const node = this.sceneList.append(scene);
      this.nodeMap.set(scene.id, node);
    }
  }

  // ═══════════════════════════════════════════════════
  // PUBLIC API — Các lệnh mà Zustand Store được gọi
  // ═══════════════════════════════════════════════════

  /**
   * Gọi AI sinh danh sách Scene từ prompt
   *
   * Luồng:
   *   1. Normalize prompt ("  MV Cyberpunk!  " → "mv cyberpunk")
   *   2. Check cache → Hit? Trả ngay, KHÔNG gọi AI, TIẾT KIỆM 1 API call
   *   3. Cache miss → Gọi AI → Lưu kết quả vào cache → Nhồi vào LinkedList
   *
   * Time: O(N) với N = số Scene AI trả về (hoặc O(1) nếu cache hit)
   */
  async generateScenes(
    prompt: string,
    maxScenes: number,
    signal?: AbortSignal,
  ): Promise<Result<IScene[]>> {
    const normalizedKey = normalizePrompt(prompt);

    // Cache HIT → trả ngay, không tốn API credit
    const cached = this.promptCache.get(normalizedKey);
    if (cached) {
      this.saveSnapshot();
      this.rebuildFromSnapshot(cached);
      return createSuccess(this.getSnapshot());
    }

    // Cache MISS → gọi AI
    const result = await this.aiClient.generateScenes(prompt, maxScenes, signal);
    if (!result.success) return result;

    // Lưu vào cache cho lần sau
    this.promptCache.put(normalizedKey, result.data);

    this.saveSnapshot();
    this.rebuildFromSnapshot(result.data);

    return createSuccess(this.getSnapshot());
  }

  /**
   * Hoán đổi vị trí Scene (kéo thả)
   *
   * @param sceneId - Scene cần di chuyển
   * @param afterSceneId - Đặt SAU scene này (null = đặt lên đầu)
   *
   * Time: O(1) — chỉ đổi con trỏ trong LinkedList
   */
  reorderScene(sceneId: SceneID, afterSceneId: SceneID | null): boolean {
    const node = this.nodeMap.get(sceneId);
    if (!node) return false;

    this.saveSnapshot();

    if (afterSceneId === null) {
      this.sceneList.moveToHead(node);
    } else {
      const targetNode = this.nodeMap.get(afterSceneId);
      if (!targetNode) return false;
      this.sceneList.moveAfter(node, targetNode);
    }

    return true;
  }

  /**
   * Xóa một Scene khỏi danh sách
   * Time: O(1) — LinkedList remove + Map delete
   */
  removeScene(sceneId: SceneID): boolean {
    const node = this.nodeMap.get(sceneId);
    if (!node) return false;

    this.saveSnapshot();
    this.sceneList.remove(node);
    this.nodeMap.delete(sceneId);
    return true;
  }

  /**
   * Undo — Quay lại trạng thái trước
   * Time: O(N) — phải rebuild LinkedList từ snapshot
   */
  undo(): boolean {
    const previous = this.history.undo(this.getSnapshot());
    if (!previous) return false;
    this.rebuildFromSnapshot(previous);
    return true;
  }

  /**
   * Redo — Làm lại thao tác vừa Undo
   * Time: O(N) — phải rebuild LinkedList từ snapshot
   */
  redo(): boolean {
    const next = this.history.redo(this.getSnapshot());
    if (!next) return false;
    this.rebuildFromSnapshot(next);
    return true;
  }

  /**
   * Chụp ảnh trạng thái hiện tại → mảng phẳng IScene[]
   *
   * Đây chính là "cầu nối" OOP → React (Rule 02 Snapshot):
   *   LinkedList (mutate pointer) → toArray() → Zustand set() → React re-render
   *
   * Time: O(N)
   */
  getSnapshot(): IScene[] {
    return this.sceneList.toArray();
  }

  /** Kiểm tra có thể Undo không — Time: O(1) */
  get canUndo(): boolean { return this.history.canUndo(); }

  /** Kiểm tra có thể Redo không — Time: O(1) */
  get canRedo(): boolean { return this.history.canRedo(); }

  /** Số Scene hiện tại — Time: O(1) */
  get sceneCount(): number { return this.sceneList.size; }
}
