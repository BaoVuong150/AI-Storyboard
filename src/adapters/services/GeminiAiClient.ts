/**
 * GeminiAiClient.ts — Kết nối Google Gemini REST API
 *
 * 📍 Tầng: adapters/services (Tầng 3 — Interface Adapters)
 * 📦 Dependencies: axios (thư viện ngoài — CHỈ dùng ở Tầng 3+)
 *
 * Implements: IAiClient (Tầng 1) → SOLID-D (Dependency Inversion)
 *   - StoryEngine (Tầng 2) chỉ biết interface IAiClient
 *   - GeminiAiClient TỰ BIẾT cách gọi Gemini REST API
 *   - Đổi sang Claude? Tạo ClaudeAiClient implements IAiClient — không sửa Engine
 *
 * Luồng:
 *   1. Nhận prompt từ StoryEngine
 *   2. Gửi HTTP POST lên Gemini API (với System Prompt cứng — Domain 3.1)
 *   3. Nhận response text → safeParseAiResponse() (Tầng 3A đã xây)
 *   4. Trả Result<IScene[]> — thành công hoặc lỗi có message rõ ràng
 *
 * Tuân thủ:
 *   - Rule 01 SOLID-D: implements IAiClient, StoryEngine không biết Gemini tồn tại
 *   - Rule 03.2: Response qua Zod validate (safeParseAiResponse)
 *   - Rule 03.3: No Silent Failures — mỗi lỗi → Result.failure() có message
 *   - Rule 05.1: KHÔNG có `any` — response typed qua interface
 *   - Rule 05.3: KHÔNG có console.log trong code production
 *   - Domain 3.1: System Prompt ép AI trả JSON thuần
 *   - Domain 3.3: Timeout 15s + AbortController
 *   - Domain 4.1: Hỗ trợ hủy request khi app vào background
 */

import axios, { AxiosError, isAxiosError } from 'axios';
import { IAiClient } from '../../core/interfaces/IAiClient';
import { IScene } from '../../core/entities/Scene';
import { Result, createFailure } from '../../core/types/common';
import { safeParseAiResponse } from '../dto/safeParseAiResponse';

/** Cấu trúc request body gửi lên Gemini REST API */
interface GeminiRequestBody {
  readonly contents: ReadonlyArray<{
    readonly parts: ReadonlyArray<{
      readonly text: string;
    }>;
  }>;
  readonly systemInstruction: {
    readonly parts: ReadonlyArray<{
      readonly text: string;
    }>;
  };
}

/** Cấu trúc response body từ Gemini REST API */
interface GeminiResponseBody {
  readonly candidates?: ReadonlyArray<{
    readonly content?: {
      readonly parts?: ReadonlyArray<{
        readonly text?: string;
      }>;
    };
  }>;
}

/** Timeout mặc định cho request AI (Domain 3.3) */
const DEFAULT_TIMEOUT_MS = 15_000;

/** Gemini REST API endpoint */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * System Prompt cứng — ép AI trả JSON thuần, không markdown
 *
 * Domain 3.1: "Ngươi chỉ được trả về JSON thuần túy,
 * không có Markdown format, không giải thích"
 */
const buildSystemPrompt = (maxScenes: number): string =>
  `Bạn là một đạo diễn phim chuyên nghiệp. Hãy tạo kịch bản storyboard.

QUY TẮC BẮT BUỘC:
1. Trả về ĐÚNG JSON thuần túy, KHÔNG có markdown, KHÔNG giải thích gì thêm.
2. Kết quả là một MẢNG JSON chứa tối đa ${maxScenes} object.
3. Mỗi object CÓ ĐÚNG các trường sau (không thừa, không thiếu):
   - "title": string — Tiêu đề ngắn gọn (10-50 ký tự)
   - "action": string — Mô tả chi tiết hành động (50-200 ký tự)
   - "cameraAngle": string — Góc máy (VD: "Wide Shot", "Close-up", "Bird's Eye View")
   - "lighting": string — Ánh sáng (VD: "Neon xanh", "Golden Hour", "Chiaroscuro")
   - "duration": number — Thời lượng tính bằng giây (1-30)
4. KHÔNG có trường "id" hay "createdAt" — hệ thống tự sinh.
5. Trả VỀ TỐI THIỂU 3 cảnh quay.`;

/**
 * Class GeminiAiClient — Gọi Google Gemini API để sinh Scene
 *
 * Sử dụng:
 *   const client = new GeminiAiClient('AIza...');
 *   const engine = new StoryEngine(client); // Inject vào Engine
 */
export class GeminiAiClient implements IAiClient {
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(apiKey: string, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Gửi prompt cho Gemini và nhận về danh sách Scene
   *
   * Luồng bảo vệ 3 lớp:
   *   1. Axios gọi API (có timeout + AbortController)
   *   2. Trích xuất text response từ cấu trúc Gemini
   *   3. safeParseAiResponse() → Zod validate + regen ID
   *
   * Mọi lỗi → Result.failure() có message tiếng Việt rõ ràng (Rule 03.3)
   *
   * Time: Phụ thuộc mạng (thường 3-10s) | Timeout: 15s
   */
  async generateScenes(
    prompt: string,
    maxScenes: number,
    signal?: AbortSignal,
  ): Promise<Result<IScene[]>> {
    // Tạo AbortController nội bộ cho timeout
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), this.timeoutMs);

    // Kết hợp signal từ ngoài (app background) với timeout nội bộ
    const combinedSignal = signal
      ? this.combineAbortSignals(signal, timeoutController.signal)
      : timeoutController.signal;

    try {
      const requestBody: GeminiRequestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: buildSystemPrompt(maxScenes) }] },
      };

      const response = await axios.post<GeminiResponseBody>(
        `${GEMINI_API_URL}?key=${this.apiKey}`,
        requestBody,
        {
          signal: combinedSignal,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      // Trích xuất text từ cấu trúc response Gemini
      const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return createFailure('AI không trả về nội dung — vui lòng thử lại');
      }

      // Loại bỏ markdown code block nếu AI vẫn quấn ```json ... ```
      const cleanedText = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // Parse + Zod validate + regen ID (3A đã xây)
      return safeParseAiResponse(cleanedText);
    } catch (error: unknown) {
      return this.handleError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ═══════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════

  /**
   * Phân loại lỗi Axios → trả Result.failure với message thân thiện
   *
   * Rule 03.3: KHÔNG nuốt lỗi. Mỗi loại lỗi → message riêng.
   * Rule 05.3: KHÔNG có console.log — lỗi đẩy lên UI qua Result.
   *
   * Time: O(1)
   */
  private handleError(error: unknown): Result<IScene[]> {
    // Lỗi abort (timeout hoặc app background) — Domain 4.1
    if (error instanceof DOMException && error.name === 'AbortError') {
      return createFailure('Đã hủy yêu cầu — quá thời gian chờ hoặc app về nền');
    }

    if (isAxiosError(error)) {
      const axiosErr = error as AxiosError;
      const status = axiosErr.response?.status;

      if (axiosErr.code === 'ERR_CANCELED' || axiosErr.code === 'ECONNABORTED') {
        return createFailure('Đã hủy yêu cầu — quá thời gian chờ hoặc app về nền');
      }

      if (!axiosErr.response) {
        return createFailure('Không có kết nối Internet — kiểm tra mạng và thử lại');
      }

      switch (status) {
        case 400:
          return createFailure('Prompt không hợp lệ — vui lòng nhập lại');
        case 401:
        case 403:
          return createFailure('API Key không hợp lệ hoặc đã hết hạn');
        case 429:
          return createFailure('Đã đạt giới hạn API — vui lòng thử lại sau vài phút');
        case 500:
        case 503:
          return createFailure('Server AI đang quá tải — vui lòng thử lại sau');
        default:
          return createFailure(`Lỗi từ server AI (HTTP ${status}) — vui lòng thử lại`);
      }
    }

    return createFailure('Đã xảy ra lỗi không xác định — vui lòng thử lại');
  }

  /**
   * Kết hợp 2 AbortSignal thành 1 (timeout + app background)
   *
   * Khi BẤT KỲ signal nào abort → request bị hủy.
   * Giải phóng listener khi hoàn thành để chống memory leak.
   *
   * Time: O(1)
   */
  private combineAbortSignals(
    externalSignal: AbortSignal,
    timeoutSignal: AbortSignal,
  ): AbortSignal {
    const combined = new AbortController();

    const abort = () => combined.abort();

    if (externalSignal.aborted || timeoutSignal.aborted) {
      combined.abort();
      return combined.signal;
    }

    externalSignal.addEventListener('abort', abort, { once: true });
    timeoutSignal.addEventListener('abort', abort, { once: true });

    return combined.signal;
  }
}
