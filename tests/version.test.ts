import { VersionEngine } from '../src/version/VersionEngine';
import { getDb, closeDb } from '../src/storage/Database';
import path from 'path';
import fs from 'fs';

const TEST_DB = path.join(__dirname, 'test_versions.db');
process.env.PERSONAOS_DB_PATH = TEST_DB;
VersionEngine.initTable();

describe('VersionEngine', () => {
  const engine = new VersionEngine();
  const identityId = 'version-test-user';

  afterAll(() => {
    closeDb();
    try { fs.unlinkSync(TEST_DB); } catch {}
  });

  test('debe guardar versiones incrementales', () => {
    const v1 = engine.save(identityId, { name: 'Alex', version: 1 }, 'Initial');
    expect(v1.versionNumber).toBe(1);

    const v2 = engine.save(identityId, { name: 'Alex', version: 2 }, 'Updated');
    expect(v2.versionNumber).toBe(2);
  });

  test('debe obtener la última versión', () => {
    const latest = engine.getLatest(identityId);
    expect(latest).not.toBeNull();
    expect(latest!.versionNumber).toBe(2);
  });

  test('debe listar versiones', () => {
    const versions = engine.listVersions(identityId);
    expect(versions.length).toBe(2);
  });

  test('debe hacer rollback a versión anterior', () => {
    const snapshot = engine.rollback(identityId, 1);
    expect(snapshot).toEqual({ name: 'Alex', version: 1 });
  });
});
