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

    const newTask = Task.create('promos')
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

  test.each([100, 1000, 10000, 20000, 30000])('blocking and performance', async (taskCount) => {
    const monitor = new AsyncMonitor()

    const tasks: Task[] = []
    for (let i = 0; i < taskCount; i++) {
      if (i % 2 === 0) {
        tasks.push(Task.create(`promos-${i}`))
      } else {
        tasks.push(Task.create(`promos-${i}`).start())
      }
    }

    await transactionManager.runInTransaction(async (client: PoolClient) => {
      const repository = new TaskRepository(client)
      await Promise.all(tasks.map(async (task) => await repository.create(task)))
    })

    const start = performance.eventLoopUtilization()
    const tasksPending = tasks.filter((task) => task.state === 'pending')

    await Promise.all([
      monitor.measure('Transaction-0', async () => {
        await transactionManager.runInTransaction(async (client: PoolClient) => {
          const repository = new TaskRepository(client)
          const tasks = await repository.findByStateAndLock('pending')
          await Promise.all(tasks.map(async (task) => await repository.update(task.start())))
          await monitor.waitFor(2000)
        })
      }),
      ...tasksPending.map(async (taskPending, index) => {
        await monitor.measure(`Transaction-${index + 1}`, async () => {
          await transactionManager.runInTransaction(async (client) => {
            const repository = new TaskRepository(client)
            await repository.update(taskPending.start())
          })
        })
      }),
    ])
    const end = performance.eventLoopUtilization(start)
    console.log(end)

    monitor.printCollectedResults()
    monitor.disconnect()
  })
})
