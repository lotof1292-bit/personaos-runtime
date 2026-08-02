import { MemoryEntry } from '../types';
import { MemoryStore } from '../memory/MemoryStore';
import { getEncryptionService } from './EncryptionService';

export class SecureMemoryStore implements MemoryStore {
  private store: MemoryStore;

  constructor(wrappedStore: MemoryStore) {
    this.store = wrappedStore;
  }

  async load(identityId: string): Promise<MemoryEntry[]> {
    const raw = await this.store.load(identityId);
    // Si los datos están encriptados (formato string), desencriptar
    if (raw.length === 1 && typeof raw[0].content === 'string' && raw[0].content.includes(':')) {
      try {
        const svc = getEncryptionService();
        const decrypted = svc.decryptObject<MemoryEntry[]>(raw[0].content);
        return decrypted;
      } catch {
        // No encriptado, devolver raw
        return raw;
      }
    }
    return raw;
  }

  async update(identityId: string, userMessage: string, assistantReply: string): Promise<void> {
    const svc = getEncryptionService();
    // Encriptar el mensaje del usuario y la respuesta
    const encryptedUser = svc.encrypt(userMessage);
    const encryptedAssistant = svc.encrypt(assistantReply);
    // Guardar encriptado
    await this.store.update(identityId, encryptedUser, encryptedAssistant);
  }
}
