import { configDotenv } from 'dotenv'
import { Pool } from 'pg'
import { TransactionManager } from '@tx/src/infra/TransactionManager'
import { TaskRepository } from '@tx/src/domain/tasks/TaskRepository'

export let pool: Pool
export let transactionManager: TransactionManager

export function setupBeforeAndAfterAll(): void {
  beforeAll(async () => {
    configDotenv()
    pool = new Pool({
      connectionString: process.env.DB_POSTGRES_CONNECTION_STRING,
      idleTimeoutMillis: 0,
      ssl: false,
      max: 5,
      min: 5,
    })
    transactionManager = new TransactionManager(pool)
  })

  beforeEach(async () => {
    await transactionManager.runInTransaction(async (client) => {
      const repository = new TaskRepository(client)
      await repository.deleteAll()
    })
  })

  afterAll(async () => {
    await pool.end()
  })
}
