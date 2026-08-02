import crypto from 'crypto';

interface ApiKey {
  key: string;
  name: string;
  role: 'admin' | 'user' | 'readonly';
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
}

export class AuthService {
  private keys = new Map<string, ApiKey>();
  private readonly masterKey: string;

  constructor() {
    this.masterKey = process.env.MASTER_API_KEY || 'personaos-master-key';
    // Key por defecto para desarrollo
    this.addKey('dev-key', 'Development Key', 'admin');
  }

  generateKey(name: string, role: ApiKey['role'] = 'user', permissions: string[] = ['chat']): string {
    const key = 'pk_' + crypto.randomBytes(24).toString('hex');
    this.keys.set(key, {
      key,
      name,
      role,
      permissions,
      createdAt: new Date(),
    });
    return key;
  }

  addKey(key: string, name: string, role: ApiKey['role'] = 'user', permissions: string[] = ['chat']): void {
    this.keys.set(key, { key, name, role, permissions, createdAt: new Date() });
  }

  validate(key: string): ApiKey | null {
    if (key === this.masterKey) {
      return { key, name: 'Master', role: 'admin', permissions: ['*'], createdAt: new Date() };
    }
    const apiKey = this.keys.get(key);
    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      this.keys.delete(key);
      return null;
    }
    return apiKey;
  }

  hasPermission(key: string, permission: string): boolean {
    const apiKey = this.validate(key);
    if (!apiKey) return false;
    if (apiKey.permissions.includes('*')) return true;
    if (apiKey.permissions.includes(permission)) return true;
    return false;
  }

  revoke(key: string): void {
    this.keys.delete(key);
  }

  listKeys(): Omit<ApiKey, 'key'>[] {
    return Array.from(this.keys.values()).map(k => ({
      name: k.name,
      role: k.role,
      permissions: k.permissions,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
    }));
  }
}
