import { Session } from "./types";

export class SessionManager {
  private sessions = new Map<string, Session>();

  create(session: Session): void {
    this.sessions.set(session.id, session);
  }

  delete(id: string): void {
    this.sessions.delete(id);
  }

  resolve(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  get size(): number {
    return this.sessions.size;
  }
}
