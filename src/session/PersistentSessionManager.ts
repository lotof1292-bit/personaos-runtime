import { Session } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class PersistentSessionManager {
  private sessions = new Map<string, Session>();
  private filePath: string;
  private dirty = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(filePath: string = './data/sessions.json') {
    this.filePath = filePath;
    this.loadFromDisk();
  }

  create(session: Session): void {
    this.sessions.set(session.id, session);
    this.markDirty();
  }

  delete(id: string): void {
    this.sessions.delete(id);
    this.markDirty();
  }

  resolve(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  get size(): number {
    return this.sessions.size;
  }

  private markDirty(): void {
    if (this.dirty) return;
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 5000);
  }

  private async flush(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data = JSON.stringify([...this.sessions.values()]);
      fs.writeFileSync(this.filePath, data, 'utf-8');
    } catch (err) {
      console.error('Failed to persist sessions:', err);
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const sessions: Session[] = JSON.parse(data);
        for (const s of sessions) {
          this.sessions.set(s.id, s);
        }
      }
    } catch (err) {
      console.warn('Could not load sessions from disk, starting fresh.');
    }
  }

  // For graceful shutdown
  async close(): Promise<void> {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    await this.flush();
  }
}
