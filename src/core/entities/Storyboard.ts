import { z, ZodType } from 'zod';
import { IScene } from './Scene';

import { SceneID } from '../types/common';

export const SceneSchema: ZodType<IScene> = z.object({
  id: z.custom<SceneID>(),
  title: z.string(),
  action: z.string(),
  cameraAngle: z.string(),
  lighting: z.string(),
  duration: z.number(),
  createdAt: z.number(),
});

/** 
 * Entity: Storyboard (Một kịch bản)
 * Một kịch bản chứa nhiều Scene
 */
export const StoryboardSchema = z.object({
  id: z.string(),
  title: z.string(),
  prompt: z.string(),
  scenes: z.array(SceneSchema),
  aiMode: z.enum(['GEMINI', 'MOCK']).default('MOCK'),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type IStoryboard = z.infer<typeof StoryboardSchema>;

/** 
 * Khởi tạo một kịch bản mới tinh
 */
export function createNewStoryboard(prompt: string, aiMode: 'GEMINI' | 'MOCK' = 'MOCK'): IStoryboard {
  const now = Date.now();
  return {
    id: `sb-${now}-${Math.random().toString(36).substr(2, 9)}`,
    title: prompt.slice(0, 30) + (prompt.length > 30 ? '...' : ''), // Lấy 30 ký tự đầu làm title
    prompt,
    scenes: [],
    aiMode,
    createdAt: now,
    updatedAt: now,
  };
}
