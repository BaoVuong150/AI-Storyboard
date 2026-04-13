import { z } from 'zod';
import { StoryboardSchema } from '../../core/entities/Storyboard';

/**
 * Schema bảo vệ cấu trúc lưu trữ dưới AsyncStorage
 * EC-5.2: Schema Migration (versioning)
 */
export const AppDataSchema = z.object({
  schemaVersion: z.number().int(), // Để migrate về sau
  storyboards: z.array(StoryboardSchema),
  activeStoryboardId: z.string().nullable(),
  aiMode: z.enum(['GEMINI', 'MOCK']),
});

export type IAppData = z.infer<typeof AppDataSchema>;

/**
 * Hàm đọc và migrate data từ JSON (EC-5.2)
 * Trả về null nếu bị hỏng (EC-5.4)
 */
export function migrateAndParseAppData(rawData: string): IAppData | null {
  try {
    const parsed = JSON.parse(rawData);
    
    // Nếu tương lai có schemaVersion = 2, ta sẽ làm thế này:
    // if (parsed.schemaVersion === 1) { 
    //    // map parsed to v2
    //    parsed.schemaVersion = 2;
    // }

    // Validate cứng bằng Zod
    const result = AppDataSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    
    console.error('[Storage Migration] Zod validation failed:', result.error);
    return null; // EC-5.4: Fallback
  } catch (error) {
    console.error('[Storage Migration] JSON parse failed:', error);
    return null; // EC-5.4: Fallback
  }
}
