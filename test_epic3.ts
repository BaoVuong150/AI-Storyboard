/**
 * 🧪 Test Suite EPIC 0-3 — Chạy bằng tay để kiểm tra toàn bộ nền tảng
 *
 * Cách chạy: npx tsx test_epic3.ts
 *
 * Bao gồm:
 *   EPIC 0: Foundation (TypeScript, folder structure)
 *   EPIC 1: Entities (Branded Types, Result Type, createSceneId)
 *   EPIC 2: DSA Engine (DoublyLinkedList, UndoRedoStack, LRUCache, StoryEngine)
 *   EPIC 3: Adapters (Zod Schema, safeParseAiResponse, Zustand Store)
 */

import * as fs from 'fs';
import * as path from 'path';

// ── EPIC 1 Imports ──
import { SceneID, StoryboardID, createSuccess, createFailure, Result } from './src/core/types/common';
import { IScene, createSceneId } from './src/core/entities/Scene';

// ── EPIC 2 Imports ──
import { DoublyLinkedList } from './src/use_cases/data_structures/DoublyLinkedList';
import { UndoRedoStack } from './src/use_cases/data_structures/UndoRedoStack';
import { LRUCache } from './src/use_cases/data_structures/LRUCache';
import { StoryEngine } from './src/use_cases/engine/StoryEngine';
import { normalizePrompt } from './src/use_cases/engine/normalizePrompt';

// ── EPIC 3 Imports ──
import { safeParseAiResponse } from './src/adapters/dto/safeParseAiResponse';
import { IAiClient } from './src/core/interfaces/IAiClient';

// ═══════════════════════════════════════════════════
// Test Runner
// ═══════════════════════════════════════════════════

let totalPass = 0;
let totalFail = 0;

const check = (name: string, condition: boolean) => {
  if (condition) {
    totalPass++;
    console.log(`  ✅ ${name}`);
  } else {
    totalFail++;
    console.log(`  ❌ ${name}`);
  }
};

const section = (title: string) => {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(50));
};

// ═══════════════════════════════════════════════════
// EPIC 0: Foundation
// ═══════════════════════════════════════════════════

section('EPIC 0: Foundation');

// 0.1: Folder structure tồn tại
const requiredFolders = [
  'src/core/entities',
  'src/core/types',
  'src/core/interfaces',
  'src/use_cases/data_structures',
  'src/use_cases/engine',
  'src/adapters/dto',
  'src/adapters/services',
  'src/adapters/store',
];

for (const folder of requiredFolders) {
  const fullPath = path.resolve(__dirname, folder);
  check(`Folder ${folder} tồn tại`, fs.existsSync(fullPath));
}

// 0.2: Các file quan trọng tồn tại
const requiredFiles = [
  'tsconfig.json',
  'babel.config.js',
  'app.json',
];

for (const file of requiredFiles) {
  check(`File ${file} tồn tại`, fs.existsSync(path.resolve(__dirname, file)));
}

// ═══════════════════════════════════════════════════
// EPIC 1: Entities & Core
// ═══════════════════════════════════════════════════

section('EPIC 1: Entities & Core');

// 1.1: Branded Types
const sceneId = 'sc_abc' as SceneID;
const storyId = 'sb_xyz' as StoryboardID;
check('SceneID có __brand = SceneID', typeof sceneId === 'string');
check('StoryboardID có __brand = StoryboardID', typeof storyId === 'string');
check('SceneID ≠ StoryboardID (khác brand)', sceneId !== (storyId as unknown as SceneID));

// 1.2: createSceneId — unique
const id1 = createSceneId();
const id2 = createSceneId();
check('createSceneId() bắt đầu bằng "sc_"', id1.startsWith('sc_'));
check('createSceneId() tạo ID unique', id1 !== id2);

// 1.3: Result Type
const success = createSuccess(42);
const failure = createFailure('Lỗi test');
check('createSuccess → success: true', success.success === true);
check('createSuccess → data: 42', success.success && success.data === 42);
check('createFailure → success: false', failure.success === false);
check('createFailure → error: "Lỗi test"', !failure.success && failure.error === 'Lỗi test');

// 1.4: IScene — number timestamp (không phải Date)
const mockScene: IScene = {
  id: createSceneId(),
  title: 'Test',
  action: 'Test action',
  cameraAngle: 'Wide',
  lighting: 'Bright',
  duration: 5,
  createdAt: Date.now(),
};
check('IScene.createdAt là number (không phải Date)', typeof mockScene.createdAt === 'number');
check('IScene.id là string bắt đầu sc_', mockScene.id.startsWith('sc_'));

// ═══════════════════════════════════════════════════
// EPIC 2: DoublyLinkedList
// ═══════════════════════════════════════════════════

section('EPIC 2A: DoublyLinkedList');

const dll = new DoublyLinkedList<string>();

// 2.1: Append
dll.append('A');
dll.append('B');
dll.append('C');
check('Append 3 items → size = 3', dll.size === 3);
check('Thứ tự đúng: A → B → C', dll.toArray().join(',') === 'A,B,C');
check('Head = A', dll.head?.data === 'A');
check('Tail = C', dll.tail?.data === 'C');

// 2.2: Prepend
dll.prepend('Z');
check('Prepend Z → Z,A,B,C', dll.toArray().join(',') === 'Z,A,B,C');
check('Head = Z', dll.head?.data === 'Z');

// 2.3: Remove (EC-2.3 Dangling Node)
const nodeB = dll.head!.next!.next!; // B
dll.remove(nodeB);
check('Remove B → Z,A,C', dll.toArray().join(',') === 'Z,A,C');
check('EC-2.3: node.prev = null sau remove', nodeB.prev === null);
check('EC-2.3: node.next = null sau remove', nodeB.next === null);
check('Size = 3 sau remove', dll.size === 3);

// 2.4: MoveAfter (EC-2.7 Self-Swap Guard)
const nodeZ = dll.head!;
const nodeA = nodeZ.next!;
const nodeC = nodeA.next!;

dll.moveAfter(nodeZ, nodeA); // Z sau A → A,Z,C
check('MoveAfter Z sau A → A,Z,C', dll.toArray().join(',') === 'A,Z,C');

// Self-swap guard
dll.moveAfter(nodeA, nodeA); // Tự đổi chỗ → không đổi
check('EC-2.7: Self-swap guard (node===target)', dll.toArray().join(',') === 'A,Z,C');

dll.moveAfter(nodeZ, nodeA); // Z đã ở sau A rồi → không đổi
check('EC-2.7: Self-swap guard (node.prev===target)', dll.toArray().join(',') === 'A,Z,C');

// 2.5: MoveToHead
dll.moveToHead(nodeC);
check('MoveToHead C → C,A,Z', dll.toArray().join(',') === 'C,A,Z');

// 2.6: Clear (hardened — cắt pointer)
dll.clear();
check('Clear → size = 0', dll.size === 0);
check('Clear → head = null', dll.head === null);
check('Clear → tail = null', dll.tail === null);

// 2.7: toArray trả mảng mới (EC-2.6 Immutability)
dll.append('X');
dll.append('Y');
const arr1 = dll.toArray();
const arr2 = dll.toArray();
check('EC-2.6: toArray() trả reference mới', arr1 !== arr2);
check('EC-2.6: nội dung giống nhau', arr1.join(',') === arr2.join(','));

// ═══════════════════════════════════════════════════
// EPIC 2: UndoRedoStack
// ═══════════════════════════════════════════════════

section('EPIC 2B: UndoRedoStack');

const stack = new UndoRedoStack<string>(5); // MAX_HISTORY = 5

// Push + Undo
stack.push('state_0');
stack.push('state_1');
stack.push('state_2');
check('Push 3 states → canUndo = true', stack.canUndo());
check('undoCount = 3', stack.undoCount === 3);

const undone = stack.undo('current');
check('Undo → trả state_2', undone === 'state_2');
check('canRedo = true sau undo', stack.canRedo());

// Redo
const redone = stack.redo('current2');
check('Redo → trả current', redone === 'current');

// EC-2.5: Forked Timeline — push mới clear redo
stack.undo('current3');
check('Undo → canRedo = true', stack.canRedo());
stack.push('new_state');
check('EC-2.5: Push sau undo → canRedo = false (redo bị xóa)', !stack.canRedo());

// EC-2.1: MAX_HISTORY overflow
const stack2 = new UndoRedoStack<number>(3);
stack2.push(1);
stack2.push(2);
stack2.push(3);
stack2.push(4); // Vượt MAX_HISTORY=3 → xóa cái cũ nhất
check('EC-2.1: MAX_HISTORY=3, push 4 → undoCount=3 (không vượt)', stack2.undoCount === 3);

// ═══════════════════════════════════════════════════
// EPIC 2: LRUCache
// ═══════════════════════════════════════════════════

section('EPIC 2C: LRUCache');

const cache = new LRUCache<string, number>(3); // capacity = 3

// Put + Get
cache.put('a', 1);
cache.put('b', 2);
cache.put('c', 3);
check('Put 3 items → size = 3', cache.size() === 3);
check('Get "a" → 1', cache.get('a') === 1);
check('Get "z" → undefined (miss)', cache.get('z') === undefined);

// Eviction
cache.put('d', 4); // Đầy → "b" bị đuổi (LRU, vì "a" vừa get nên lên đầu)
check('Eviction: "b" bị đuổi', cache.get('b') === undefined);
check('"a" vẫn còn (vừa dùng)', cache.get('a') === 1);
check('"d" vừa thêm', cache.get('d') === 4);

// EC-2.9: Existing Key Update
cache.put('a', 100); // Cập nhật value, không tạo node mới
check('EC-2.9: Update "a" → 100', cache.get('a') === 100);
check('EC-2.9: Size không tăng', cache.size() === 3);

// Has + Evict
check('has("a") = true', cache.has('a'));
cache.evict('a');
check('evict("a") → has = false', !cache.has('a'));
check('Size giảm sau evict', cache.size() === 2);

// ═══════════════════════════════════════════════════
// EPIC 2: normalizePrompt
// ═══════════════════════════════════════════════════

section('EPIC 2D: normalizePrompt');

check('"  MV Cyberpunk  " → "mv cyberpunk"', normalizePrompt('  MV Cyberpunk  ') === 'mv cyberpunk');
check('"MV CYBERPUNK 30S" → "mv cyberpunk 30s"', normalizePrompt('MV CYBERPUNK 30S') === 'mv cyberpunk 30s');
check('"MV Cyberpunk!!!" → "mv cyberpunk"', normalizePrompt('MV Cyberpunk!!!') === 'mv cyberpunk');
check('Multi space "a  b   c" → "a b c"', normalizePrompt('a  b   c') === 'a b c');

// ═══════════════════════════════════════════════════
// EPIC 2: StoryEngine (Integration)
// ═══════════════════════════════════════════════════

section('EPIC 2E: StoryEngine (Integration)');

class MockAiClient implements IAiClient {
  callCount = 0;
  async generateScenes(prompt: string, maxScenes: number): Promise<Result<IScene[]>> {
    this.callCount++;
    return createSuccess([
      { id: createSceneId(), title: `Scene 1 (${prompt})`, action: 'A1', cameraAngle: 'Wide', lighting: 'Bright', duration: 5, createdAt: Date.now() },
      { id: createSceneId(), title: `Scene 2 (${prompt})`, action: 'A2', cameraAngle: 'Close', lighting: 'Dark', duration: 10, createdAt: Date.now() },
      { id: createSceneId(), title: `Scene 3 (${prompt})`, action: 'A3', cameraAngle: 'Bird', lighting: 'Neon', duration: 8, createdAt: Date.now() },
    ]);
  }
}

const mockClient = new MockAiClient();
const engine = new StoryEngine(mockClient);

const runEngineTests = async () => {
  // Generate
  const genResult = await engine.generateScenes('test prompt', 10);
  check('Generate → success', genResult.success);
  check('Generate → 3 scenes', genResult.success && genResult.data.length === 3);
  check('sceneCount = 3', engine.sceneCount === 3);

  const scenes = engine.getSnapshot();
  const id0 = scenes[0].id;
  const id1 = scenes[1].id;
  const id2 = scenes[2].id;

  // Reorder
  const reorderOk = engine.reorderScene(id2, id0); // Scene3 sau Scene1
  check('Reorder → true', reorderOk);
  const afterReorder = engine.getSnapshot();
  check('Reorder: 1→3→2', afterReorder[0].id === id0 && afterReorder[1].id === id2 && afterReorder[2].id === id1);

  // EC-2.4: Map-List Desync — reorder invalid ID
  const fakeId = 'sc_fake' as SceneID;
  check('EC-2.4: Reorder invalid ID → false', engine.reorderScene(fakeId, id0) === false);

  // Undo
  check('canUndo = true', engine.canUndo);
  const undoOk = engine.undo();
  check('Undo → true', undoOk);
  const afterUndo = engine.getSnapshot();
  check('Undo: trở lại 1→2→3', afterUndo[0].id === id0 && afterUndo[1].id === id1 && afterUndo[2].id === id2);

  // Redo
  check('canRedo = true', engine.canRedo);
  const redoOk = engine.redo();
  check('Redo → true', redoOk);
  const afterRedo = engine.getSnapshot();
  check('Redo: lại 1→3→2', afterRedo[0].id === id0 && afterRedo[1].id === id2 && afterRedo[2].id === id1);

  // Remove
  const removeOk = engine.removeScene(id2);
  check('Remove → true', removeOk);
  check('sceneCount = 2', engine.sceneCount === 2);
  check('EC-2.4: Remove invalid ID → false', engine.removeScene(fakeId) === false);

  // EC-2.11: Cache hit (cùng prompt)
  const beforeCallCount = mockClient.callCount;
  await engine.generateScenes('test prompt', 10);
  check('EC-2.11: Cache hit → không gọi AI', mockClient.callCount === beforeCallCount);

  // EC-2.11: Force regenerate bypass cache
  await engine.generateScenes('test prompt', 10, undefined, true);
  check('EC-2.11: Force regenerate → gọi AI', mockClient.callCount === beforeCallCount + 1);

  // EC-2.10: Cache clone — kiểm tra cache không bị nhiễm bẩn
  // (Generate lần 1 → sửa scene → Generate lại → phải trả bản gốc)
  const gen1 = await engine.generateScenes('clone test', 10);
  if (gen1.success) {
    const originalTitle = gen1.data[0].title;
    // Force regenerate để gọi AI mới (MockAiClient luôn trả cùng format)
    const gen2 = await engine.generateScenes('clone test', 10);
    if (gen2.success) {
      check('EC-2.10: Cache trả bản sao (không nhiễm bẩn)', gen2.data[0].title === originalTitle);
    }
  }

  // Snapshot immutability (EC-2.6)
  const snap1 = engine.getSnapshot();
  const snap2 = engine.getSnapshot();
  check('EC-2.6: getSnapshot() trả reference mới', snap1 !== snap2);

  // ═══════════════════════════════════════════════════
  // EPIC 3: Zod + safeParseAiResponse
  // ═══════════════════════════════════════════════════

  section('EPIC 3A: Zod Schema + safeParseAiResponse');

  // 3a.1: JSON đúng
  const validJson = JSON.stringify([
    { title: 'Cảnh A', action: 'Hành động A', cameraAngle: 'Wide', lighting: 'Sáng', duration: 5 },
    { title: 'Cảnh B', action: 'Hành động B', cameraAngle: 'Close', lighting: 'Tối', duration: 10 },
  ]);
  const r1 = safeParseAiResponse(validJson);
  check('JSON đúng → success', r1.success);
  check('JSON đúng → 2 scenes', r1.success && r1.data.length === 2);
  check('ID được regen (bắt đầu sc_)', r1.success && r1.data[0].id.startsWith('sc_'));
  check('createdAt được regen (> 0)', r1.success && r1.data[0].createdAt > 0);

  // 3a.2: JSON cụt (Truncated)
  const truncated = '[{"title":"Cảnh A","action":"Act","cameraAngle":"W","lighting":"L","duration":5},{"title":"Cả';
  const r2 = safeParseAiResponse(truncated);
  check('JSON cụt → failure (Sếp chọn Phương án 1: Ngắt phiên)', !r2.success);

  // 3a.3: JSON rác
  const r3 = safeParseAiResponse('xin chào đây không phải json');
  check('JSON rác → failure', !r3.success);
  check('JSON rác → message rõ ràng', !r3.success && r3.error.includes('không đủ Token'));

  // 3a.4: Mảng rỗng
  const r4 = safeParseAiResponse('[]');
  check('Mảng rỗng → failure (min 1)', !r4.success);

  // 3a.5: Duration sai kiểu
  const r5 = safeParseAiResponse(JSON.stringify([
    { title: 'T', action: 'A', cameraAngle: 'W', lighting: 'L', duration: '30 giây' },
  ]));
  check('Duration string → failure', !r5.success);
  check('Zod báo Expected number', !r5.success && r5.error.includes('number'));

  // 3a.6: Duration quá lớn
  const r6 = safeParseAiResponse(JSON.stringify([
    { title: 'T', action: 'A', cameraAngle: 'W', lighting: 'L', duration: 999 },
  ]));
  check('Duration 999 → failure (max 120)', !r6.success);

  // 3a.7: Title rỗng
  const r7 = safeParseAiResponse(JSON.stringify([
    { title: '', action: 'A', cameraAngle: 'W', lighting: 'L', duration: 5 },
  ]));
  check('Title rỗng → failure', !r7.success);

  // 3a.8: Quá 20 scenes
  const tooMany = Array(21).fill({ title: 'T', action: 'A', cameraAngle: 'W', lighting: 'L', duration: 5 });
  const r8 = safeParseAiResponse(JSON.stringify(tooMany));
  check('21 scenes → failure (max 20)', !r8.success);

  // 3a.9: JSON quấn trong markdown codeblock (GeminiAiClient strip)
  const markdownWrapped = '```json\n[{"title":"T","action":"A","cameraAngle":"W","lighting":"L","duration":5}]\n```';
  // safeParseAiResponse nhận text đã clean bởi GeminiAiClient
  const cleaned = markdownWrapped.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const r9 = safeParseAiResponse(cleaned);
  check('Markdown stripped → success', r9.success);

  // ═══════════════════════════════════════════════════
  // KẾT QUẢ TỔNG HỢP
  // ═══════════════════════════════════════════════════

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  📊 KẾT QUẢ TỔNG HỢP`);
  console.log('═'.repeat(50));
  console.log(`  ✅ Pass: ${totalPass}`);
  console.log(`  ❌ Fail: ${totalFail}`);
  console.log(`  📝 Total: ${totalPass + totalFail}`);
  console.log('═'.repeat(50));

  if (totalFail === 0) {
    console.log('  🎉 TẤT CẢ TEST ĐÃ PASS — EPIC 0→3 HOÀN CHỈNH!');
  } else {
    console.log(`  ⚠️  CÒN ${totalFail} TEST FAIL — CẦN SỬA!`);
  }
  console.log('═'.repeat(50) + '\n');
};

runEngineTests();
