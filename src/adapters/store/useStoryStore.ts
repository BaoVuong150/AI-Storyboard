/**
 * useStoryStore.ts — Zustand Store (State Controller)
 *
 * 📍 Tầng: adapters/store (Tầng 3 — Interface Adapters)
 * 📦 Dependencies: zustand (thư viện ngoài — CHỈ dùng ở Tầng 3+)
 *
 * Vai trò:
 *   Đây là "Tổng đài điều phối" giữa UI (Tầng 4) và StoryEngine (Tầng 2).
 *   UI chỉ biết gọi store.generate(), store.reorder(), store.undo()...
 *   Store nhận lệnh → gọi StoryEngine → lấy getSnapshot() → set() vào state
 *   → React thấy state mới → re-render UI
 *
 * Luồng chuẩn (Rule 02 — Snapshot Bridge):
 *   UI: "Người dùng gõ prompt!"
 *   → Store: set({ isGenerating: true })
 *   → Engine: engine.generateScenes(prompt)
 *   → Engine trả Result<IScene[]>
 *   → Store: set({ scenes: engine.getSnapshot(), isGenerating: false })
 *   → React: "State mới rồi!" → re-render
 *
 * Tuân thủ:
 *   - Rule 01 Tầng 3: Zustand ở adapters/store/ — đúng tầng
 *   - Rule 02.1: KHÔNG lưu LinkedList/Stack vào state — chỉ lưu mảng phẳng
 *   - Rule 02.2: Snapshot Bridge — engine.getSnapshot() → set()
 *   - Rule 03.3: No Silent Failures — lỗi → set({ error }) hiển thị trên UI
 *   - Rule 05.1: KHÔNG có `any`
 *   - Rule 05.3: KHÔNG có console.log
 *   - Domain 1.3: Zustand + DLL integration đúng luồng
 */

import { create } from 'zustand';
import { IScene } from '../../core/entities/Scene';
import { SceneID } from '../../core/types/common';
import { StoryEngine } from '../../use_cases/engine/StoryEngine';
import { GeminiAiClient } from '../services/GeminiAiClient';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

/** State shape — dữ liệu mà UI đọc để render */
interface StoryState {
  /** Danh sách Scene hiện tại (mảng phẳng từ engine.getSnapshot) */
  readonly scenes: IScene[];

  /** Cờ đang generate — chặn concurrent request (3C.2 Race Condition) */
  readonly isGenerating: boolean;

  /** Thông báo lỗi hiện tại — null = không lỗi */
  readonly error: string | null;

  /** Có thể Undo không (đồng bộ từ engine) */
  readonly canUndo: boolean;

  /** Có thể Redo không (đồng bộ từ engine) */
  readonly canRedo: boolean;
}

/** Actions — các hành động mà UI có thể gọi */
interface StoryActions {
  /** Sinh Scene từ prompt AI */
  generate: (prompt: string, forceRegenerate?: boolean) => Promise<void>;

  /** Đổi vị trí Scene (kéo thả) */
  reorder: (sceneId: SceneID, afterSceneId: SceneID | null) => void;

  /** Xóa Scene */
  remove: (sceneId: SceneID) => void;

  /** Undo — quay lại trạng thái trước */
  undo: () => void;

  /** Redo — làm lại thao tác vừa Undo */
  redo: () => void;

  /** Xóa thông báo lỗi */
  clearError: () => void;
}

// ═══════════════════════════════════════════════════
// SINGLETON ENGINE
// ═══════════════════════════════════════════════════

/**
 * StoryEngine singleton — tạo MỘT LẦN, dùng mãi
 *
 * LƯU Ý: API Key đọc từ biến môi trường (Rule 05 Domain 5.1)
 * Khi chưa có key → dùng key rỗng (sẽ trả lỗi 401 khi gọi)
 *
 * Tại sao singleton?
 *   - Engine giữ LinkedList + UndoStack + LRUCache trong bộ nhớ
 *   - Tạo nhiều instance → dữ liệu bị phân mảnh → Undo/Redo sai
 */
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const aiClient = new GeminiAiClient(apiKey);
const engine = new StoryEngine(aiClient);

// ═══════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════

/**
 * Hàm helper: đồng bộ state từ engine sau mỗi thao tác
 * Gọi SAU mỗi action để cập nhật scenes + canUndo + canRedo
 *
 * Rule 02.2: engine.getSnapshot() → mảng MỚI → set() → React re-render
 *
 * Time: O(N) — toArray() duyệt LinkedList
 */
const syncFromEngine = (): Partial<StoryState> => ({
  scenes: engine.getSnapshot(),
  canUndo: engine.canUndo,
  canRedo: engine.canRedo,
});

export const useStoryStore = create<StoryState & StoryActions>()((set, get) => ({
  // ── Initial State ──────────────────────────────
  scenes: [],
  isGenerating: false,
  error: null,
  canUndo: false,
  canRedo: false,

  // ── Actions ────────────────────────────────────

  /**
   * Sinh Scene từ prompt AI
   *
   * Guard 3C.2 (Race Condition):
   *   - if (isGenerating) return → chặn prompt B khi A đang chạy
   *   - try/finally → isGenerating = false LUÔN chạy dù thành công hay thất bại
   *   - Dùng get() trong async → tránh Stale Closure (đọc state mới nhất)
   *
   * Time: Phụ thuộc mạng (3-15s)
   */
  generate: async (prompt: string, forceRegenerate: boolean = false) => {
    // Guard: chặn concurrent generate (3C.2)
    if (get().isGenerating) return;

    set({ isGenerating: true, error: null });

    try {
      const result = await engine.generateScenes(prompt, 10, undefined, forceRegenerate);

      if (result.success) {
        set({ ...syncFromEngine() });
      } else {
        // Rule 03.3: lỗi → hiển thị trên UI, KHÔNG nuốt
        set({ error: result.error });
      }
    } finally {
      // Guard: LUÔN mở khóa dù thành công hay thất bại (3C.2)
      set({ isGenerating: false });
    }
  },

  /**
   * Đổi vị trí Scene (kéo thả)
   *
   * Luồng (Domain 1.3):
   *   UI onDragEnd → store.reorder(sceneId, afterId)
   *   → engine.reorderScene() → LinkedList.moveAfter() O(1)
   *   → syncFromEngine() → set() → React re-render
   *
   * Time: O(1) cho reorder + O(N) cho getSnapshot
   */
  reorder: (sceneId: SceneID, afterSceneId: SceneID | null) => {
    const success = engine.reorderScene(sceneId, afterSceneId);
    if (success) {
      set({ ...syncFromEngine() });
    }
  },

  /**
   * Xóa Scene
   *
   * Time: O(1) cho remove + O(N) cho getSnapshot
   */
  remove: (sceneId: SceneID) => {
    const success = engine.removeScene(sceneId);
    if (success) {
      set({ ...syncFromEngine() });
    }
  },

  /**
   * Undo — quay lại trạng thái trước
   *
   * Time: O(N) — rebuild LinkedList từ snapshot
   */
  undo: () => {
    const success = engine.undo();
    if (success) {
      set({ ...syncFromEngine() });
    }
  },

  /**
   * Redo — làm lại thao tác vừa Undo
   *
   * Time: O(N) — rebuild LinkedList từ snapshot
   */
  redo: () => {
    const success = engine.redo();
    if (success) {
      set({ ...syncFromEngine() });
    }
  },

  /**
   * Xóa thông báo lỗi (khi user dismiss toast/alert)
   *
   * Time: O(1)
   */
  clearError: () => {
    set({ error: null });
  },
}));
