import { performance, PerformanceEntry, PerformanceObserver } from 'node:perf_hooks'
import { PerformanceEntryWithContext } from '@tx/src/infra/PerformanceEntryWithContext'

export class AsyncMonitor {
  private obs: PerformanceObserver | undefined
  private performanceEntriesWithContext = new Map<string, PerformanceEntryWithContext>()
  private timeoutCounter: number = 0

  constructor() {
    this.obs = new PerformanceObserver((list) => {
      this.addPerformanceEntries(list.getEntriesByType('measure'))
    })
    this.obs.observe({ entryTypes: ['measure'] })
  }

  async measure(name: string, callback: (context: Map<string, any>) => Promise<void>): Promise<void> {
    try {
      const context = new Map<string, any>()
      this.markStart(name, context)
      await callback(context)
    } finally {
      this.markEnd(name)
    }
  }

  markStart(name: string, context: Map<string, any>): void {
    performance.mark(`${name}-Start`)
    this.performanceEntriesWithContext.set(name, new PerformanceEntryWithContext(context))
  }

  markEnd(name: string): void {
    performance.mark(`${name}-End`)
    performance.measure(name, `${name}-Start`, `${name}-End`)
  }

  getPerformanceEntries(): PerformanceEntryWithContext[] {
    const lastEntries = this.obs?.takeRecords() ?? []
    this.addPerformanceEntries(lastEntries)
    return Array.from(this.performanceEntriesWithContext.values())
  }

  async waitFor(ms: number): Promise<void> {
    return await this.measure(
      `Timeout-${++this.timeoutCounter}`,
      async () => new Promise((resolve) => setTimeout(resolve, ms)),
    )
  }

  disconnect(): void {
    setTimeout(() => {
      this.obs?.disconnect()
    }, 1000)
  }

  printCollectedResults(): void {
    const entriesWithContext = this.getPerformanceEntries()
    const result = entriesWithContext.reduce(
      (result, entry) =>
        `${result}${entry.performanceEntry?.name ?? 'N/A'} - ${entry.performanceEntry?.duration?.toFixed(2) ?? 0} ms` +
        `  - ${JSON.stringify(Object.fromEntries(entry.context))}\n`,
      '',
    )
    console.log(result)
  }

  private addPerformanceEntries(performanceEntries: PerformanceEntry[]): void {
    performanceEntries.forEach((entry) => {
      if (!this.performanceEntriesWithContext.has(entry.name)) {
        this.performanceEntriesWithContext.set(entry.name, new PerformanceEntryWithContext(new Map<string, any>()))
      }
      this.performanceEntriesWithContext.get(entry.name)?.updateEntry(entry)
    })
  }
}
