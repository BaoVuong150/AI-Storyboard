/**
 * MockAiClient.ts — AI Giả cho mục đích Demo & Test
 *
 * 📍 Tầng: adapters/services (Tầng 3 — Interface Adapters)
 * 
 * Implements: IAiClient (Tầng 1) → SOLID-D
 *   Thay thế GeminiAiClient mà KHÔNG cần sửa 1 dòng code nào ở Engine/Store!
 *
 * Tại sao cần:
 *   - Demo cho khách/thầy cô mà không sợ hết quota
 *   - Test UI/UX mà không tốn API credits
 *   - Chứng minh kiến trúc Clean Architecture hoạt động đúng
 */

import { IAiClient } from '../../core/interfaces/IAiClient';
import { IScene, createSceneId } from '../../core/entities/Scene';
import { Result, createSuccess } from '../../core/types/common';

/**
 * Dữ liệu mẫu — kịch bản phim hành động "Rồng phun lửa"
 */
const MOCK_SCENES: Omit<IScene, 'id' | 'createdAt'>[] = [
  {
    title: 'Bình minh trên núi lửa',
    action: 'Ánh nắng vàng rực len qua lớp sương mù dày đặc. Camera zoom chậm vào miệng núi, hơi nóng bốc lên cuồn cuộn.',
    cameraAngle: 'Aerial Shot — Bay trên cao',
    lighting: 'Golden Hour + Khói đỏ cam',
    duration: 5,
  },
  {
    title: 'Rồng thức giấc',
    action: 'Đôi mắt rồng bật mở, đồng tử hẹp dọc phát sáng vàng rực. Cánh rồng vỗ mạnh, tạo sóng xung kích thổi bay đá vụn xung quanh.',
    cameraAngle: 'Extreme Close-up — Mắt rồng',
    lighting: 'Magma glow + Rim light cam',
    duration: 4,
  },
  {
    title: 'Hiệp sĩ xuất hiện',
    action: 'Hiệp sĩ cưỡi ngựa phi từ rừng thông ra bãi đất trống. Áo giáp bạc phản chiếu ánh mặt trời. Thanh kiếm rút khỏi vỏ, phát ra tiếng rít.',
    cameraAngle: 'Wide Shot — Toàn cảnh',
    lighting: 'Backlight mạnh + Lens flare',
    duration: 6,
  },
  {
    title: 'Rồng phun lửa lần đầu',
    action: 'Rồng ngẩng đầu, hít sâu. Ngực phồng lên sáng đỏ. Luồng lửa xanh-cam phun ra xé toạc bầu trời, đốt cháy hàng cây bên dưới.',
    cameraAngle: 'Low Angle — Ngước lên',
    lighting: 'Lửa xanh neon + Đỏ cam bùng cháy',
    duration: 5,
  },
  {
    title: 'Hiệp sĩ lăn tránh',
    action: 'Hiệp sĩ nhảy khỏi ngựa, lăn tránh sang phải. Lửa liếm sát mặt đất, nóng chảy đá. Mặt hiệp sĩ lấm lem bụi, mắt đầy quyết tâm.',
    cameraAngle: 'Dutch Angle — Nghiêng máy',
    lighting: 'Chiaroscuro — Sáng tối đối lập',
    duration: 3,
  },
  {
    title: 'Trận chiến trên không',
    action: 'Hiệp sĩ leo lên vách đá, nhảy lên lưng rồng. Rồng xoay vòng trong không trung, cố hất hiệp sĩ xuống. Mây cuộn xoáy loạn.',
    cameraAngle: 'Tracking Shot — Bám theo chuyển động',
    lighting: 'Ánh sáng dramatic phía sau mây',
    duration: 8,
  },
  {
    title: 'Nhát kiếm quyết định',
    action: 'Hiệp sĩ giơ kiếm lên cao, ánh sáng phản chiếu lóe mắt. Chém xuống sừng rồng. Rồng gầm vang trời, mất thăng bằng lao xuống.',
    cameraAngle: 'Close-up — Lưỡi kiếm chạm sừng',
    lighting: 'Flash trắng + Spark vàng',
    duration: 4,
  },
  {
    title: 'Kết thúc — Hoàng hôn',
    action: 'Hiệp sĩ đứng trên đỉnh vách đá, nhìn rồng bay đi về phía hoàng hôn. Gió thổi áo choàng phần phật. Camera zoom out dần vào bầu trời đỏ rực.',
    cameraAngle: 'Extreme Wide — Siêu toàn cảnh',
    lighting: 'Hoàng hôn vàng đỏ + Silhouette',
    duration: 6,
  },
];

export class MockAiClient implements IAiClient {
  /** Thời gian giả lập độ trễ mạng (ms) */
  private readonly delayMs: number;

  constructor(delayMs: number = 2000) {
    this.delayMs = delayMs;
  }

  async generateScenes(
    _prompt: string,
    maxScenes: number,
    signal?: AbortSignal,
  ): Promise<Result<IScene[]>> {
    // Giả lập thời gian chờ AI (2 giây)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, this.delayMs);
      
      // Hỗ trợ hủy request (Domain 4.1)
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('AbortError'));
        }, { once: true });
      }
    });

    // Cắt theo maxScenes
    const sliced = MOCK_SCENES.slice(0, maxScenes);

    // Sinh ID và createdAt giống hệt flow thật
    const scenes: IScene[] = sliced.map(s => ({
      ...s,
      id: createSceneId(),
      createdAt: Date.now(),
    }));

    return createSuccess(scenes);
  }
}
