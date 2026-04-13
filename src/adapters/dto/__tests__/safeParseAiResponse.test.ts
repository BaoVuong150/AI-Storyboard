import { safeParseAiResponse } from '../safeParseAiResponse';

describe('safeParseAiResponse - EPIC 6 Edge Cases', () => {
  it('Parser phải vượt qua được JSON chuẩn', () => {
    const raw = JSON.stringify([
      { title: 'T1', action: 'A1', cameraAngle: 'C1', lighting: 'L1', duration: 5 }
    ]);
    const res = safeParseAiResponse(raw);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.length).toBe(1);
      expect(res.data[0].title).toBe('T1');
      // ID phải được sinh nội bộ
      expect(typeof res.data[0].id).toBe('string');
      expect(res.data[0].id.length).toBeGreaterThan(5);
    }
  });

  // Bài Test kinh điển cho EC-6.2: Khâu đuôi JSON bị đứt do hết Token
  it('EC-6.2: Cứu sinh JSON bị cụt đuôi (Truncated JSON)', () => {
    // Giả sử chữ C2 đang viết dở thì đứt mạng hoặc hết token
    // Cắt bỏ phần sau dấu { thứ 2
    const raw = '[{"title":"T1","action":"A1","cameraAngle":"C1","lighting":"L1","duration":5},{"title":"T2","act';
    const res = safeParseAiResponse(raw);
    
    // Yêu cầu: Phải cứu được T1, và rớt T2
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.length).toBe(1);
      expect(res.data[0].title).toBe('T1');
    }
  });

  // Bài Test cho EC-6.19: Spam JSON rác cắn CPU
  it('EC-6.19: Chặn Bomb JSON (OOM DoS)', () => {
    // Tạo 1 chuỗi dài hơn 50000 ký tự
    const bomb = Array(60000).fill('a').join('');
    const res = safeParseAiResponse(bomb);
    
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain('nội dung quá lớn');
    }
  });

  it('Lọc bỏ những Scene thiếu trường bắt buộc', () => {
    const raw = JSON.stringify([
      { title: 'Scene Ngon', action: 'A1', cameraAngle: 'C1', lighting: 'L1', duration: 5 },
      { title: 'Scene Thiếu Action' } // Thiếu hàng loạt trường
    ]);
    const res = safeParseAiResponse(raw);
    
    expect(res.success).toBe(true);
    if (res.success) {
      // Chỉ nhận được một Scene Ngon
      expect(res.data.length).toBe(1);
      expect(res.data[0].title).toBe('Scene Ngon');
    }
  });
});
