type MeasureMap = Record<string, number>;

class PerformanceMonitor {
  private marks = new Map<string, number>();
  private measures = new Map<string, number>();
  private listeners = new Set<() => void>();

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  mark(name: string): void {
    const ts = Date.now();
    this.marks.set(name, ts);
    this.emit();
    if (__DEV__) {
      console.log(`[Perf] Mark ${name}: ${ts}`);
    }
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    if (start == null) {
      if (__DEV__) {
        console.log(`[Perf] Missing start mark "${startMark}" for "${name}"`);
      }
      return -1;
    }

    const end = endMark ? this.marks.get(endMark) ?? Date.now() : Date.now();
    const duration = Math.max(0, end - start);
    this.measures.set(name, duration);
    this.emit();

    if (__DEV__) {
      console.log(`[Perf] ${name}: ${duration}ms`);
    }

    return duration;
  }

  getMeasures(): MeasureMap {
    const out: MeasureMap = {};
    for (const [name, value] of this.measures.entries()) {
      out[name] = value;
    }
    return out;
  }

  reset(): void {
    this.marks.clear();
    this.measures.clear();
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const perfMonitor = new PerformanceMonitor();
