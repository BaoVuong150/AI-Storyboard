import AsyncStorage from '@react-native-async-storage/async-storage';
import { ILocalStorage } from '../../core/interfaces/ILocalStorage';

/**
 * Adapter bọc AsyncStorage của React Native
 * Chặn lỗi EC-5.15 (Disk Full) và EC-5.7 (Limit)
 */
export class AsyncStorageAdapter implements ILocalStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`[Storage] getItem fail for key: ${key}`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      // EC-5.15: Bắt lỗi Disk Full / Quota Exceeded (có thể emit 1 event để show Toast)
      console.error(`[Storage] setItem error (Disk full?): ${key}`, error);
      throw new Error('FAILED_TO_WRITE_STORAGE');
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`[Storage] removeItem fail for key: ${key}`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.warn('[Storage] clear fail', error);
    }
  }
}
