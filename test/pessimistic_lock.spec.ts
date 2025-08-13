import { PoolClient } from 'pg'
import { TaskRepository } from '@tx/src/domain/tasks/TaskRepository'
import { Task } from '@tx/src/domain/tasks/entities/Task'
import { AsyncMonitor } from '@tx/src/infra/AsyncMonitor'
import { setupBeforeAndAfterAll, transactionManager } from '@tx/test/setup'
import { performance } from 'node:perf_hooks'

describe('pessimistic lock', () => {
  setupBeforeAndAfterAll()

  test('blocking and order', async () => {
    const monitor = new AsyncMonitor()

    const newTask = Task.create('promos', 'foo')
    await transactionManager.runInTransaction(async (client: PoolClient) => {
      const repository = new TaskRepository(client)
      await repository.create(newTask)
    })

    await Promise.all([
      monitor.measure('FindByNameAndLock-1', async (context) => {
        await transactionManager.runInTransaction(async (client: PoolClient) => {
          const repository = new TaskRepository(client)
          const task = await repository.findByNameAndLock('promos')
          if (!task) {
            return
          }
          context.set('state', task?.state)
          await monitor.waitFor(2000)

          await monitor.measure('Update-1', async (context) => {
            context.set('fromState', task.state)
            context.set('toState', 'in-progress')
            await repository.update(task.start())
          })
        })
      }),
      monitor.measure('Update-2', async (context) => {
        await transactionManager.runInTransaction(async (client) => {
          const repository = new TaskRepository(client)
          const task = await repository.findByName('promos')

          if (!task) {
            return
          }

          context.set('fromState', task.state)
          context.set('toState', 'completed')
          await repository.update(task.complete())
        })
      }),
      monitor.measure('FindByName-1', async (context) => {
        await transactionManager.runInTransaction(async (client) => {
          const repository = new TaskRepository(client)
          const task = await repository.findByName('promos')
          context.set('state', task?.state)
        })
      }),
      monitor.measure('FindByNameAndLock-2', async (context) => {
        await transactionManager.runInTransaction(async (client) => {
          const repository = new TaskRepository(client)
          const task = await repository.findByNameAndLock('promos')
          context.set('state', task?.state)
        })
      }),
      monitor.measure('FindById-1', async (context) => {
        await transactionManager.runInTransaction(async (client) => {
          const repository = new TaskRepository(client)
          const task = await repository.findById(newTask.id)
          context.set('state', task?.state)
        })
      }),
    ])

    const existingTask = await transactionManager.runInTransaction(async (client) => {
      const repository = new TaskRepository(client)
      return await repository.findByName('promos')
    })
    console.log('final state:', existingTask?.state)

    monitor.printCollectedResults()
    monitor.disconnect()
  })

  test.each([50, 100, 200])('blocking and performance', async (taskCount) => {
    const monitor = new AsyncMonitor()

    await transactionManager.runInTransaction(async (client: PoolClient) => {
      const repository = new TaskRepository(client)
      await repository.create(Task.create('rewards', 'lorem ipsum '.repeat(1024*1024)))
    })

    const start = performance.eventLoopUtilization()

    const promises: Promise<void>[] = []
    for (let i = 0; i < taskCount; ++i) {
      promises.push(
        monitor.measure(`Transaction-${i}`, async (context) => {
          await transactionManager.runInTransaction(async (client: PoolClient) => {
            const repository = new TaskRepository(client)
            const task = await repository.findByNameAndLock('rewards')
            if (!task) {
              return
            }
            await repository.update(task.start())
            // const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024
            // context.set('memoryUsage', `${heapUsed} mb`)
          })
        })
      )
    }

    await Promise.all(promises)
    const end = performance.eventLoopUtilization(start)

    monitor.printCollectedResults()
    console.log(end)
    monitor.disconnect()
  })
})
