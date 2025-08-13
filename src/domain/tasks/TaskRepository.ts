import { Task } from '@tx/src/domain/tasks/entities/Task'
import { PoolClient } from 'pg'

const FIND_BY_ID = 'SELECT * FROM tasks WHERE id=$1'
const FIND_BY_NAME = 'SELECT * FROM tasks WHERE name=$1'
const FIND_BY_NAME_AND_LOCK = 'SELECT * FROM tasks WHERE name=$1 FOR UPDATE'
const CREATE_TASK = `
    INSERT INTO tasks (id, name, state, data, created_at, updated_at) 
    VALUES ($1, $2, $3, $4, $5, $6)
`
const UPDATE_TASK = `
    UPDATE tasks SET name=$2, state=$3, updated_at=$4
    WHERE id=$1
`
const DELETE_ALL = 'DELETE FROM tasks'
const LOCK_BY_NAME = `
    UPDATE tasks SET is_locked=true
    WHERE name=$1
`
const UNLOCK_BY_NAME = `
    UPDATE tasks SET is_locked=false
    WHERE name=$1
`
const IS_LOCKED = `
    SELECT is_locked FROM tasks
    WHERE name=$1
`

export class TaskRepository {
  constructor(
    /** Data source to query the Postgres DB. */
    private readonly client: PoolClient,
  ) {}

  async findById(id: string): Promise<Task | undefined> {
    const result = await this.client.query(FIND_BY_ID, [id])
    return result.rows.length ? Task.restore(result.rows[0]) : undefined
  }

  async findByName(name: string): Promise<Task | undefined> {
    const result = await this.client.query(FIND_BY_NAME, [name])
    return result.rows.length ? Task.restore(result.rows[0]) : undefined
  }

  async findByNameAndLock(name: string): Promise<Task | undefined> {
    const result = await this.client.query(FIND_BY_NAME_AND_LOCK, [name])
    return result.rows.length ? Task.restore(result.rows[0]) : undefined
  }

  async lockByName(name: string): Promise<Task | undefined> {
    await this.client.query(LOCK_BY_NAME, [name])
    return await this.findByName(name)
  }

  async unlockByName(name: string): Promise<Task | undefined> {
    await this.client.query(UNLOCK_BY_NAME, [name])
    return await this.findByName(name)
  }

  async create(task: Task): Promise<Task> {
    const result = await this.client.query(CREATE_TASK, [
      task.id,
      task.name,
      task.state,
      task.data,
      task.createdAt,
      task.updatedAt,
    ])
    if (result.rowCount !== 1) {
      throw new Error('Error creating task')
    }
    return task
  }

  async update(task: Task): Promise<Task> {
    const result = await this.client.query(UPDATE_TASK, [task.id, task.name, task.state, task.updatedAt])
    if (result.rowCount !== 1) {
      throw new Error('Error updating task')
    }
    return task
  }

  async deleteAll(): Promise<void> {
    await this.client.query(DELETE_ALL)
  }
}
