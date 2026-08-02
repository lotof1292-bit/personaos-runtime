import { EncryptionService } from '../src/security/EncryptionService';

describe('EncryptionService', () => {
  const service = new EncryptionService();

  test('debe encriptar y desencriptar texto', () => {
    const original = 'Mensaje secreto de prueba';
    const encrypted = service.encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  test('debe encriptar y desencriptar objetos', () => {
    const obj = { user: 'alex', age: 25, traits: { empathy: 0.8 } };
    const encrypted = service.encryptObject(obj);
    const decrypted = service.decryptObject<typeof obj>(encrypted);
    expect(decrypted).toEqual(obj);
  });

  test('debe fallar con clave incorrecta', () => {
    const original = 'Test';
    const encrypted = service.encrypt(original);
    const wrongService = new EncryptionService('a'.repeat(64));
    expect(() => wrongService.decrypt(encrypted)).toThrow();
  });
});
