import { create } from 'zustand';
import { IScene } from '../../core/entities/Scene';
import { SceneID } from '../../core/types/common';
import { StoryEngine } from '../../use_cases/engine/StoryEngine';
import { GeminiAiClient } from '../services/GeminiAiClient';
import { MockAiClient } from '../services/MockAiClient';
import { IStoryboard, createNewStoryboard } from '../../core/entities/Storyboard';
import { AsyncStorageAdapter } from '../storage/AsyncStorageAdapter';
import { StorageKeys } from '../storage/StorageKeys';
import { AppDataSchema, migrateAndParseAppData } from '../storage/StorageSchema';

export type AiMode = 'GEMINI' | 'MOCK';
export type ScreenState = 'HOME' | 'PROMPT' | 'EDITOR';

interface StoryState {
  // --- Persistent Models (Multi-Storyboard) ---
  storyboards: IStoryboard[];
  activeStoryboardId: string | null;
  aiMode: AiMode;
  isHydrated: boolean; // Tránh Hydration Race Condition
  
  // --- Navigation ---
  screen: ScreenState;

  // --- Volatile UI State (chỉ cho storyboard hiện tại) ---
  scenes: IScene[];
  isGenerating: boolean;
  abortController: AbortController | null;
  error: string | null;
  canUndo: boolean;
  canRedo: boolean;
}

interface StoryActions {
  // Navigation & Management
  hydrate: () => Promise<void>;
  setScreen: (screen: ScreenState) => void;
  createStoryboard: (prompt: string) => Promise<void>;
  selectStoryboard: (id: string) => void;
  deleteStoryboard: (id: string) => void;
  
  // Editor Actions
  reorder: (sceneId: SceneID, afterSceneId: SceneID | null) => void;
  reorderFromArray: (newOrder: IScene[]) => void;
  remove: (sceneId: SceneID) => void;
  undo: () => void;
  redo: () => void;
  clearError: () => void;
  toggleAiMode: () => void;
  abortGeneration: () => void;
}

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const geminiEngine = new StoryEngine(new GeminiAiClient(apiKey));
const mockEngine = new StoryEngine(new MockAiClient(2000));
const storage = new AsyncStorageAdapter();

const getEngine = (mode: AiMode): StoryEngine => mode === 'GEMINI' ? geminiEngine : mockEngine;

const syncFromEngine = (mode: AiMode): Partial<StoryState> => {
  const engine = getEngine(mode);
  return {
    scenes: engine.getSnapshot(),
    canUndo: engine.canUndo,
    canRedo: engine.canRedo,
  };
};

export const useStoryStore = create<StoryState & StoryActions>()((set, get) => ({
  storyboards: [],
  activeStoryboardId: null,
  aiMode: 'MOCK',
  isHydrated: false,
  
  screen: 'HOME',

  scenes: [],
  isGenerating: false,
  abortController: null,
  error: null,
  canUndo: false,
  canRedo: false,

  hydrate: async () => {
    try {
      const raw = await storage.getItem(StorageKeys.APP_DATA);
      if (!raw) {
        set({ isHydrated: true }); // Fresh install
        return;
      }
      const data = migrateAndParseAppData(raw);
      if (data) {
        set({
          storyboards: data.storyboards,
          activeStoryboardId: data.activeStoryboardId,
          aiMode: data.aiMode,
          isHydrated: true,
          screen: data.activeStoryboardId ? 'EDITOR' : 'HOME',
        });
        
        // Load active scenes into engine
        if (data.activeStoryboardId) {
          const active = data.storyboards.find(s => s.id === data.activeStoryboardId);
          if (active) {
            getEngine(data.aiMode).loadState(active.scenes);
            set({ ...syncFromEngine(data.aiMode) });
          }
        }
      } else {
        set({ isHydrated: true });
      }
    } catch (e) {
      set({ isHydrated: true });
    }
  },

  setScreen: (screen) => set({ screen }),

  abortGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ abortController: null, isGenerating: false }); // EC-6.1
    }
  },

  createStoryboard: async (prompt: string) => {
    if (!get().isHydrated || get().isGenerating) return;

    const controller = new AbortController();
    set({ isGenerating: true, error: null, abortController: controller });

    try {
      const mode = get().aiMode;
      const engine = getEngine(mode);
      
      // Khởi tạo model trống
      const newSb = createNewStoryboard(prompt, mode);
      
      // Load trống
      engine.loadState([]);
      set({ ...syncFromEngine(mode) });

      // Gọi AI kèm Abort Signal (EC-6.1)
      const result = await engine.generateScenes(prompt, 10, controller.signal, false);

      // Nếu controller hiện tại trong store đã bị đổi/xóa (do user thao tác khác), ta hủy kết quả (EC-6.21)
      if (get().abortController !== controller) {
         return; // Im lặng gác kiếm
      }

      if (result.success) {
        newSb.scenes = result.data;
        set((state) => ({
          storyboards: [newSb, ...state.storyboards],
          activeStoryboardId: newSb.id,
          screen: 'EDITOR',
          ...syncFromEngine(mode)
        }));
      } else {
        // EC-6.1: Không văng Toast báo lỗi nếu bị Abort do App về background
        if (result.error !== 'CANCELED_BY_ABORT') {
          set({ error: result.error });
        }
      }
    } catch (err: any) {
      set({ error: `Lỗi hệ thống: ${err.message}` });
    } finally {
      // Chỉ reset isGenerating nếu controller vẫn là controller của luồng này 
      // (Để tránh đè isGenerating của request mới)
      if (get().abortController === controller) {
        set({ isGenerating: false, abortController: null });
      }
    }
  },

  selectStoryboard: (id: string) => {
    const sb = get().storyboards.find(s => s.id === id);
    if (!sb) return;

    // Load vào engine
    const engine = getEngine(get().aiMode);
    engine.loadState(sb.scenes);

    set({
      activeStoryboardId: id,
      screen: 'EDITOR',
      ...syncFromEngine(get().aiMode)
    });
  },

  deleteStoryboard: (id: string) => {
    set((state) => {
      const filtered = state.storyboards.filter(s => s.id !== id);
      const isActive = state.activeStoryboardId === id;
      return {
        storyboards: filtered,
        ...(isActive ? { activeStoryboardId: null, screen: 'HOME', scenes: [], canUndo: false, canRedo: false } : {})
      };
    });
  },

  reorder: (sceneId, afterSceneId) => {
    const { aiMode } = get();
    if (getEngine(aiMode).reorderScene(sceneId, afterSceneId)) {
      set({ ...syncFromEngine(aiMode) });
    }
  },

  reorderFromArray: (newOrder) => {
    const { aiMode } = get();
    if (getEngine(aiMode).reorderFromArray(newOrder)) {
      set({ ...syncFromEngine(aiMode) });
    }
  },

  remove: (sceneId) => {
    const { aiMode } = get();
    if (getEngine(aiMode).removeScene(sceneId)) {
      set({ ...syncFromEngine(aiMode) });
    }
  },

  undo: () => {
    const { aiMode } = get();
    if (getEngine(aiMode).undo()) {
      set({ ...syncFromEngine(aiMode) });
    }
  },

  redo: () => {
    const { aiMode } = get();
    if (getEngine(aiMode).redo()) {
      set({ ...syncFromEngine(aiMode) });
    }
  },

  clearError: () => set({ error: null }),

  toggleAiMode: () => {
    const newMode: AiMode = get().aiMode === 'GEMINI' ? 'MOCK' : 'GEMINI';
    set({ aiMode: newMode });
    // Nếu đang ở editor thì render lại UI
    if (get().screen === 'EDITOR') {
      const activeSb = get().storyboards.find(s => s.id === get().activeStoryboardId);
      if (activeSb) {
        getEngine(newMode).loadState(activeSb.scenes);
        set({ ...syncFromEngine(newMode) });
      }
    }
  },
}));

// --- Middleware Tự động lưu (Auto-Save) ---
// Đồng bộ volatile scenes vào array storyboards -> lưu disk
let saveTimeout: any;

useStoryStore.subscribe((state, prevState) => {
  if (!state.isHydrated) return; // Không lưu vào lúc đang hydrate

  // Lưu disk nếu storyboards, scenes, aiMode thay đổi
  const changed = state.storyboards !== prevState.storyboards 
    || state.scenes !== prevState.scenes 
    || state.aiMode !== prevState.aiMode
    || state.activeStoryboardId !== prevState.activeStoryboardId;

  if (changed && !state.isGenerating) {
    if (saveTimeout) clearTimeout(saveTimeout);
    
    saveTimeout = setTimeout(async () => {
      // Lấy state mới nhất
      const latest = useStoryStore.getState();
      
      // Ghi đè scenes hiện hành vào storyboard
      let toSaveStoryboards = latest.storyboards;
      if (latest.activeStoryboardId) {
        const activeIdx = toSaveStoryboards.findIndex(s => s.id === latest.activeStoryboardId);
        if (activeIdx >= 0) {
          toSaveStoryboards = [...toSaveStoryboards];
          toSaveStoryboards[activeIdx] = {
            ...toSaveStoryboards[activeIdx],
            scenes: latest.scenes,
            updatedAt: Date.now()
          };
        }
      }

      // Xóa các storyboard rỗng (EC-5.9)
      const validStoryboards = toSaveStoryboards.filter(sb => sb.scenes.length > 0);

      // Cảnh báo limit (EC-5.7)
      if (validStoryboards.length > 100) {
         console.warn("[Storage] Warning: Storyboards count > 100!");
      }

      const payload = {
        schemaVersion: 1,
        storyboards: validStoryboards,
        activeStoryboardId: latest.activeStoryboardId,
        aiMode: latest.aiMode
      };

      await storage.setItem(StorageKeys.APP_DATA, JSON.stringify(payload));
    }, 500); // 500ms debounce
  }
});
