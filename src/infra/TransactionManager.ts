import { Pool, PoolClient } from 'pg'

export class TransactionManager {
  constructor(private readonly pool: Pool) {}

  async runInTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      client.release()
      return result
    } catch (cause: any) {
      await client.query('ROLLBACK')
      client.release(cause)
      throw cause
    }
  }
}
