import { PoolClient } from 'pg'
import { TaskRepository } from '@tx/src/domain/tasks/TaskRepository'
import { Task } from '@tx/src/domain/tasks/entities/Task'
import { AsyncMonitor } from '@tx/src/infra/AsyncMonitor'
import { setupBeforeAndAfterAll, transactionManager } from '@tx/test/setup'

describe('optimistic lock', () => {
  setupBeforeAndAfterAll()

  test('lock by name', async () => {
    const monitor = new AsyncMonitor()

    const newTask = Task.create('promos', 'foo')
    await transactionManager.runInTransaction(async (client: PoolClient) => {
      const repository = new TaskRepository(client)
      await repository.create(newTask)
    })

    await monitor.measure('LockByName-1', async (context) => {
      await transactionManager.runInTransaction(async (client: PoolClient) => {
        const repository = new TaskRepository(client)
        const task = await repository.lockByName('promos')
        if (!task) {
          return
        }

        context.set('locked', task.locked)
        await repository.update(task.start())
      })
    })

    setTimeout(async () => {
      await transactionManager.runInTransaction(async (client: PoolClient) => {
        const repository = new TaskRepository(client)
        await repository.unlockByName('promos')
      })
    }, 1000)

    await Promise.all([
      monitor.measure('Update-2', async (context) => {
        await transactionManager.runInTransaction(async (client) => {
          const repository = new TaskRepository(client)
          const task = await repository.findByName('promos')

          if (!task) {
            return
          }
          context.set('locked', task?.locked)

          if (task.locked) {
            return
          }

          await repository.update(task.complete())
        })
      }),
      monitor.measure('Update-3', async (context) => {
        await transactionManager.runInTransaction(async (client) => {
          const repository = new TaskRepository(client)
          await monitor.waitFor(2000)
          const task = await repository.findByName('promos')

          if (!task || task.locked) {
            context.set('locked', task?.locked)
            return
          }

          context.set('locked', task.locked)
          await repository.update(task.complete())
        })
      }),
    ])

    monitor.printCollectedResults()
    monitor.disconnect()
  })
})
