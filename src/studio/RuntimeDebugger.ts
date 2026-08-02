export interface DebugEvent {
  timestamp: Date;
  type: 'pipeline' | 'memory' | 'genome' | 'provider' | 'error';
  data: any;
}

export class RuntimeDebugger {
  private events: DebugEvent[] = [];
  private maxEvents: number;
  private enabled: boolean = true;

  constructor(maxEvents: number = 1000) {
    this.maxEvents = maxEvents;
  }

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }

  log(type: DebugEvent['type'], data: any): void {
    if (!this.enabled) return;
    this.events.push({ timestamp: new Date(), type, data });
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  getEvents(type?: DebugEvent['type']): DebugEvent[] {
    if (type) return this.events.filter(e => e.type === type);
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }

  getStatus(): { totalEvents: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const e of this.events) {
      byType[e.type] = (byType[e.type] || 0) + 1;
    }
    return { totalEvents: this.events.length, byType };
  }
}
