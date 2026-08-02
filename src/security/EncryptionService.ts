import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export class EncryptionService {
  private key: Buffer;

  constructor(keyHex?: string) {
    if (keyHex) {
      this.key = Buffer.from(keyHex, 'hex');
      if (this.key.length !== KEY_LENGTH) {
        throw new Error(`Key must be ${KEY_LENGTH} bytes (64 hex chars)`);
      }
    } else {
      // Generar clave por defecto (solo para desarrollo)
      this.key = crypto.randomBytes(KEY_LENGTH);
      console.warn('Encryption key auto-generated. For production, set ENCRYPTION_KEY env variable.');
    }
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + authTag + ':' + encrypted;
  }

  decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted format');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Encriptar un objeto completo
  encryptObject(obj: any): string {
    return this.encrypt(JSON.stringify(obj));
  }

  decryptObject<T>(cipherText: string): T {
    return JSON.parse(this.decrypt(cipherText)) as T;
  }
}

// Singleton con clave desde variable de entorno
let defaultService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!defaultService) {
    const key = process.env.ENCRYPTION_KEY || '';
    defaultService = new EncryptionService(key || undefined);
  }
  return defaultService;
}
