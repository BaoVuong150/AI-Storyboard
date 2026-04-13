import { UndoRedoStack } from '../UndoRedoStack';

describe('UndoRedoStack - Kho Lịch Sử (EPIC 6/7 Edge Cases)', () => {
  it('Chức năng Push và Undo cơ bản', () => {
    const stack = new UndoRedoStack<string>(5);
    
    // Khởi tạo state
    let state = 'A';
    
    // Đổi sang B
    stack.push(state); // Cất 'A'
    state = 'B';
    
    // Đổi sang C
    stack.push(state); // Cất 'B'
    state = 'C';
    
    // Bấm Undo
    expect(stack.canUndo()).toBe(true);
    const undoCtoB = stack.undo(state); // Đẩy 'C' vào Redo, lấy ra 'B'
    expect(undoCtoB).toBe('B');
    state = undoCtoB!;
    
    const undoBtoA = stack.undo(state); // Đẩy 'B' vào Redo, lấy ra 'A'
    expect(undoBtoA).toBe('A');
  });

  it('EC-6.17: Giới hạn Stack chống tràn bộ nhớ (OOM Leak Test)', () => {
    const limit = 3;
    const stack = new UndoRedoStack<number>(limit);
    
    // Spam state 100 lần (Lớn hơn rất nhiều so với limit)
    for (let i = 1; i <= 100; i++) {
        stack.push(i);
    }
    
    // Do maxHistory = 3, trong stack chỉ giữ lại [98, 99, 100]
    // Nghĩa là tốn tối đa chỉ 3 lần chọt Undo
    expect(stack.canUndo()).toBe(true);
    
    expect(stack.undo(101)).toBe(100);
    expect(stack.undo(100)).toBe(99);
    expect(stack.undo(99)).toBe(98);
    
    // Lần thứ 4 không thể undo được nữa (bị xóa rồi)
    expect(stack.canUndo()).toBe(false);
  });

  it('Thao tác mới đập nát tương lai (Redo Clear)', () => {
    const stack = new UndoRedoStack<number>(5);
    // 1 -> 2 -> 3
    stack.push(1);
    stack.push(2);
    
    // Hiện tại là 3. Quay đầu về 2
    expect(stack.undo(3)).toBe(2);
    expect(stack.canRedo()).toBe(true);
    
    // Đang ở 2, không thèm Redo lên 3 mà rẽ nhánh sang 4
    stack.push(2); // Cất 2
    // Hiện tại thành 4
    
    // Quá khứ tương lai "Redo" (số 3) sẽ bị bay màu ngay lập tức
    expect(stack.canRedo()).toBe(false);
  });
});
