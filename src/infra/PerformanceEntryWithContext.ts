import { PerformanceEntry } from 'node:perf_hooks'

export class PerformanceEntryWithContext {
  private entry: PerformanceEntry | undefined

  constructor(readonly context: Map<string, any>) {}

  updateEntry(performanceEntry: PerformanceEntry): void {
    this.entry = performanceEntry
  }

  get performanceEntry(): PerformanceEntry | undefined {
    return this.entry
  }
}
