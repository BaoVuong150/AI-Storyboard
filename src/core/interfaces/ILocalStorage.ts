export interface ILocalStorage {
  /** Lấy dữ liệu dạng chuỗi */
  getItem(key: string): Promise<string | null>;
  
  /** Lưu dữ liệu dạng chuỗi */
  setItem(key: string, value: string): Promise<void>;
  
  /** Xóa dữ liệu */
  removeItem(key: string): Promise<void>;
  
  /** Xóa toàn bộ dữ liệu (dùng lúc reset app) */
  clear(): Promise<void>;
}
